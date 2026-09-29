const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireAuth, requireOfficerOrAdmin } = require('../middleware/auth');

// Get Recovery Case Details
router.get('/:caseId', authenticateToken, requireAuth, (req, res) => {
  try {
    const caseId = req.params.caseId;
    const recoveryCase = db.prepare(`
      SELECT 
        rc.*,
        i.title as item_title, i.category as item_category, i.image as item_image, 
        i.brand as item_brand, i.model as item_model, i.location as found_location,
        u.name as claimant_name, u.email as claimant_email
      FROM recovery_cases rc
      JOIN items i ON rc.item_id = i.id
      JOIN users u ON rc.claimant_id = u.id
      WHERE rc.id = ?
    `).get(caseId);

    if (!recoveryCase) {
      return res.status(404).json({ error: 'Recovery case not found.' });
    }

    const timeline = typeof recoveryCase.timeline === 'string' ? JSON.parse(recoveryCase.timeline) : recoveryCase.timeline;

    res.json({
      recoveryCase: {
        ...recoveryCase,
        timeline
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete Secure Handover (Restricted to Officers and Admins)
router.post('/:caseId/handover', authenticateToken, requireOfficerOrAdmin, (req, res) => {
  try {
    const caseId = req.params.caseId;
    const { handoverCode } = req.body;
    const officerId = req.user ? req.user.id : null;

    const recoveryCase = db.prepare('SELECT * FROM recovery_cases WHERE id = ?').get(caseId);
    if (!recoveryCase) {
      return res.status(404).json({ error: 'Recovery case not found.' });
    }

    if (recoveryCase.status === 'RECOVERED' || recoveryCase.status === 'CLOSED') {
      return res.status(400).json({ error: 'This case has already been recovered and closed.' });
    }

    // Validate Handover Code (Allow case-insensitive match)
    if (handoverCode && handoverCode.trim().toUpperCase() !== recoveryCase.handover_code.toUpperCase()) {
      return res.status(400).json({ error: 'Invalid handover verification code. Custody transfer rejected.' });
    }

    const now = new Date().toISOString();
    const currentTimeline = typeof recoveryCase.timeline === 'string' ? JSON.parse(recoveryCase.timeline) : recoveryCase.timeline;

    // Update timeline steps
    const updatedTimeline = currentTimeline.map(step => {
      if (step.step === 'RECOVERED') {
        return { ...step, completed: true, timestamp: now, actor: req.user?.name || 'Campus Security Officer' };
      }
      if (step.step === 'CLOSED') {
        return { ...step, completed: true, timestamp: now, actor: 'Findora Audit System' };
      }
      return step;
    });

    // Update recovery case
    db.prepare(`
      UPDATE recovery_cases
      SET status = 'RECOVERED', recovered_at = ?, timeline = ?
      WHERE id = ?
    `).run(now, JSON.stringify(updatedTimeline), caseId);

    if (db.pool) {
      db.pool.query(
        'UPDATE recovery_cases SET status = $1, recovered_at = $2, timeline = $3 WHERE id = $4',
        ['RECOVERED', new Date(now), JSON.stringify(updatedTimeline), caseId]
      ).catch(e => console.warn('[SUPABASE CASE RECOVERED ERROR]:', e.message));
    }

    // Mark item as RECOVERED
    db.prepare("UPDATE items SET status = 'RECOVERED' WHERE id = ?").run(recoveryCase.item_id);

    // If there was a linked lost item in the claim, mark it as RECOVERED as well
    const claim = db.prepare('SELECT lost_item_id FROM claims WHERE id = ?').get(recoveryCase.claim_id);
    if (claim && claim.lost_item_id) {
      db.prepare("UPDATE items SET status = 'RECOVERED' WHERE id = ?").run(claim.lost_item_id);
    }

    if (db.pool) {
      db.pool.query(
        'UPDATE items SET status = $1 WHERE id = $2 OR id = $3',
        ['RECOVERED', recoveryCase.item_id, (claim && claim.lost_item_id) || recoveryCase.item_id]
      ).catch(e => console.warn('[SUPABASE ITEM STATUS ERROR]:', e.message));
    }

    // Audit log
    const audId = `aud_${Date.now()}`;
    const audDetail = `Handover code ${recoveryCase.handover_code} successfully verified. Custody transfer completed.`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'HANDOVER_COMPLETED', 'recovery_cases', ?, ?)
    `).run(audId, officerId, caseId, audDetail);

    if (db.pool) {
      db.pool.query(
        'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
        [audId, officerId, 'HANDOVER_COMPLETED', 'recovery_cases', caseId, audDetail]
      ).catch(e => console.warn('[SUPABASE AUDIT LOG ERROR]:', e.message));
    }

    res.json({
      message: 'Item custody successfully transferred. Recovery case closed.',
      caseId,
      status: 'RECOVERED',
      timeline: updatedTimeline
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
