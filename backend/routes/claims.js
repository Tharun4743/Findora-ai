const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireAuth, requireOfficerOrAdmin } = require('../middleware/auth');
const { generateBlindQuestions, verifyOwnershipAnswers } = require('../services/verification');
const { analyzeClaimantRisk } = require('../services/fraud');

// Initiate a claim on an item (generates blind questions from private attributes)
router.post('/initiate', authenticateToken, requireAuth, (req, res) => {
  try {
    const { foundItemId, lostItemId, matchId } = req.body;
    const claimantId = req.user.id;

    if (!foundItemId) {
      return res.status(400).json({ error: 'foundItemId is required to start a claim.' });
    }

    const foundItem = db.prepare('SELECT * FROM items WHERE id = ?').get(foundItemId);
    if (!foundItem) {
      return res.status(404).json({ error: 'Found item not found.' });
    }

    // Check if claimant already has an open claim for this item
    const existingClaim = db.prepare(`
      SELECT * FROM claims 
      WHERE found_item_id = ? AND claimant_id = ? AND status != 'REJECTED'
    `).get(foundItemId, claimantId);

    if (existingClaim) {
      // Fetch existing questions
      const questions = db.prepare('SELECT id, question_key, prompt FROM claim_questions WHERE claim_id = ?').all(existingClaim.id);
      return res.json({
        claimId: existingClaim.id,
        status: existingClaim.status,
        questions,
        alreadyInitiated: true
      });
    }

    const claimId = `claim_${Date.now()}`;

    // Read private attributes of found item (or fallback)
    const privateAttrs = db.prepare('SELECT * FROM item_private_attributes WHERE item_id = ?').get(foundItemId);
    const questions = generateBlindQuestions(privateAttrs);

    // Insert claim
    db.prepare(`
      INSERT INTO claims (
        id, match_id, lost_item_id, found_item_id, claimant_id, status
      ) VALUES (?, ?, ?, ?, ?, 'PENDING_VERIFICATION')
    `).run(claimId, matchId || null, lostItemId || null, foundItemId, claimantId);

    if (db.pool) {
      db.pool.query(
        'INSERT INTO claims (id, match_id, lost_item_id, found_item_id, claimant_id, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
        [claimId, matchId || null, lostItemId || null, foundItemId, claimantId, 'PENDING_VERIFICATION']
      ).catch(e => console.warn('[SUPABASE CLAIM INSERT ERROR]:', e.message));
    }

    // Insert generated questions
    const insertQ = db.prepare(`
      INSERT INTO claim_questions (id, claim_id, found_item_id, question_key, prompt)
      VALUES (?, ?, ?, ?, ?)
    `);

    const createdQuestions = [];
    questions.forEach((q, idx) => {
      const qId = `q_${Date.now()}_${idx}`;
      insertQ.run(qId, claimId, foundItemId, q.question_key, q.prompt);
      createdQuestions.push({ id: qId, question_key: q.question_key, prompt: q.prompt });

      if (db.pool) {
        db.pool.query(
          'INSERT INTO claim_questions (id, claim_id, found_item_id, question_key, prompt) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [qId, claimId, foundItemId, q.question_key, q.prompt]
        ).catch(e => console.warn('[SUPABASE QUESTION INSERT ERROR]:', e.message));
      }
    });

    // Audit log
    const audId = `aud_${Date.now()}`;
    const audDetail = `Initiated blind-verification claim for item ${foundItemId}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'INITIATE_CLAIM', 'claims', ?, ?)
    `).run(audId, claimantId, claimId, audDetail);

    if (db.pool) {
      db.pool.query(
        'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
        [audId, claimantId, 'INITIATE_CLAIM', 'claims', claimId, audDetail]
      ).catch(e => console.warn('[SUPABASE AUDIT LOG ERROR]:', e.message));
    }

    res.status(201).json({
      claimId,
      status: 'PENDING_VERIFICATION',
      questions: createdQuestions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Answers for Blind Verification Challenge
router.post('/:id/verify', authenticateToken, requireAuth, (req, res) => {
  try {
    const claimId = req.params.id;
    const { answers } = req.body; // array of { question_id, question_key, claimant_answer }
    const claimantId = req.user.id;

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim record not found.' });
    }

    // Retrieve private attributes of found item
    const privateAttrs = db.prepare('SELECT * FROM item_private_attributes WHERE item_id = ?').get(claim.found_item_id);

    // 1. Run Verification Engine
    const verificationResult = verifyOwnershipAnswers(answers || [], privateAttrs);

    // Save answers
    const insertAnswer = db.prepare(`
      INSERT OR REPLACE INTO claim_answers (id, claim_id, question_id, claimant_answer, confidence_score, matched)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    (answers || []).forEach(a => {
      const aId = `ans_${claimId}_${a.question_id}`;
      const qScore = verificationResult.breakdown[a.question_key]?.score || 50;
      insertAnswer.run(aId, claimId, a.question_id, a.claimant_answer || '', qScore / 100, qScore >= 70 ? 1 : 0);
    });

    // 2. Run Fraud Shield & Risk Engine
    const userClaimHistory = db.prepare(`
      SELECT c.*, i.category 
      FROM claims c 
      JOIN items i ON c.found_item_id = i.id 
      WHERE c.claimant_id = ? AND c.id != ?
    `).all(claimantId, claimId);

    const fraudAnalysis = analyzeClaimantRisk(claimantId, {
      verification_score: verificationResult.ownership_confidence
    }, userClaimHistory);

    // Determine status: If verification score >= 80% and risk != 'HIGH', mark as UNDER_REVIEW (Ready for Admin Approval)
    let newStatus = 'UNDER_REVIEW';
    if (verificationResult.ownership_confidence >= 0.85 && fraudAnalysis.risk_level === 'LOW') {
      newStatus = 'UNDER_REVIEW';
    } else if (verificationResult.ownership_confidence < 0.40) {
      newStatus = 'REJECTED';
    }

    // Update claim in database
    db.prepare(`
      UPDATE claims
      SET 
        status = ?,
        verification_score = ?,
        risk_score = ?,
        risk_level = ?,
        risk_factors = ?,
        verification_details = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      newStatus,
      verificationResult.ownership_confidence,
      fraudAnalysis.risk_score,
      fraudAnalysis.risk_level,
      JSON.stringify(fraudAnalysis.risk_factors),
      JSON.stringify(verificationResult),
      claimId
    );

    if (db.pool) {
      db.pool.query(
        'UPDATE claims SET status = $1, verification_score = $2, risk_score = $3, risk_level = $4, risk_factors = $5, verification_details = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
        [
          newStatus,
          verificationResult.ownership_confidence,
          fraudAnalysis.risk_score,
          fraudAnalysis.risk_level,
          JSON.stringify(fraudAnalysis.risk_factors),
          JSON.stringify(verificationResult),
          claimId
        ]
      ).catch(e => console.warn('[SUPABASE CLAIM UPDATE ERROR]:', e.message));
    }

    // If High Risk detected, create an alert in fraud_alerts table
    if (fraudAnalysis.risk_level === 'HIGH' || fraudAnalysis.risk_score >= 65) {
      const fraudId = `fraud_${Date.now()}`;
      const reasonsStr = JSON.stringify(fraudAnalysis.risk_factors);

      db.prepare(`
        INSERT INTO fraud_alerts (id, claim_id, claimant_id, risk_score, severity, alert_type, reasons, status)
        VALUES (?, ?, ?, ?, ?, 'CLAIM_ANOMALY', ?, 'ACTIVE')
      `).run(
        fraudId,
        claimId,
        claimantId,
        fraudAnalysis.risk_score,
        fraudAnalysis.risk_level,
        reasonsStr
      );

      if (db.pool) {
        db.pool.query(
          'INSERT INTO fraud_alerts (id, claim_id, claimant_id, risk_score, severity, alert_type, reasons, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
          [fraudId, claimId, claimantId, fraudAnalysis.risk_score, fraudAnalysis.risk_level, 'CLAIM_ANOMALY', reasonsStr, 'ACTIVE']
        ).catch(e => console.warn('[SUPABASE FRAUD ALERT ERROR]:', e.message));
      }

      // Notify admins
      const adminUsers = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
      for (const admin of adminUsers) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const notifMsg = `Claim #${claimId} submitted with high risk score (${fraudAnalysis.risk_score}/100). Manual inspection required.`;
        const notifData = JSON.stringify({ claim_id: claimId });

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, data)
          VALUES (?, ?, 'High Risk Claim Anomaly', ?, 'FRAUD_ALERT', ?)
        `).run(notifId, admin.id, notifMsg, notifData);

        if (db.pool) {
          db.pool.query(
            'INSERT INTO notifications (id, user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5, $6)',
            [notifId, admin.id, 'High Risk Claim Anomaly', notifMsg, 'FRAUD_ALERT', notifData]
          ).catch(e => console.warn('[SUPABASE ADMIN NOTIF ERROR]:', e.message));
        }
      }
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'VERIFY_CLAIM_ANSWERS', 'claims', ?, ?)
    `).run(
      `aud_${Date.now()}`,
      claimantId,
      claimId,
      `Submitted blind verification answers. Score: ${Math.round(verificationResult.ownership_confidence * 100)}%, Risk: ${fraudAnalysis.risk_level} (${fraudAnalysis.risk_score}/100)`
    );

    res.json({
      claimId,
      status: newStatus,
      ownership_confidence: verificationResult.ownership_confidence,
      is_verified: verificationResult.is_verified,
      damage_match: verificationResult.damage_match,
      sticker_match: verificationResult.sticker_match,
      unique_attr_match: verificationResult.unique_attr_match,
      breakdown: verificationResult.breakdown,
      risk: fraudAnalysis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Claim with Questions & Status
router.get('/:id', authenticateToken, requireAuth, async (req, res) => {
  try {
    let claim = null;
    let questions = [];
    let answers = [];
    let recoveryCase = null;

    if (db.pool) {
      try {
        const claimRes = await db.pool.query(`
          SELECT 
            c.*,
            l.title as lost_title, l.image as lost_image, l.location as lost_location,
            f.title as found_title, f.image as found_image, f.location as found_location, f.building as found_building,
            u.name as claimant_name, u.email as claimant_email
          FROM claims c
          LEFT JOIN items l ON c.lost_item_id = l.id
          JOIN items f ON c.found_item_id = f.id
          LEFT JOIN users u ON c.claimant_id = u.id
          WHERE c.id = $1
        `, [req.params.id]);

        if (claimRes.rows && claimRes.rows.length > 0) {
          claim = claimRes.rows[0];
          const [qRes, aRes, recRes] = await Promise.all([
            db.pool.query('SELECT id, question_key, prompt FROM claim_questions WHERE claim_id = $1', [claim.id]),
            db.pool.query('SELECT * FROM claim_answers WHERE claim_id = $1', [claim.id]),
            db.pool.query('SELECT * FROM recovery_cases WHERE claim_id = $1', [claim.id])
          ]);
          questions = qRes.rows || [];
          answers = aRes.rows || [];
          if (recRes.rows && recRes.rows.length > 0) recoveryCase = recRes.rows[0];
        }
      } catch (poolErr) {
        console.warn('[CLAIMS POOL ERROR]:', poolErr.message);
      }
    }

    if (!claim) {
      claim = db.prepare(`
        SELECT 
          c.*,
          l.title as lost_title, l.image as lost_image, l.location as lost_location,
          f.title as found_title, f.image as found_image, f.location as found_location, f.building as found_building,
          u.name as claimant_name, u.email as claimant_email
        FROM claims c
        LEFT JOIN items l ON c.lost_item_id = l.id
        JOIN items f ON c.found_item_id = f.id
        LEFT JOIN users u ON c.claimant_id = u.id
        WHERE c.id = ?
      `).get(req.params.id);

      if (claim) {
        questions = db.prepare('SELECT id, question_key, prompt FROM claim_questions WHERE claim_id = ?').all(claim.id);
        answers = db.prepare('SELECT * FROM claim_answers WHERE claim_id = ?').all(claim.id);
        recoveryCase = db.prepare('SELECT * FROM recovery_cases WHERE claim_id = ?').get(claim.id);
      }
    }

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const isOfficerOrAdmin = req.user.role === 'admin' || req.user.role === 'verification_officer';
    if (!isOfficerOrAdmin && claim.claimant_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own claim details.' });
    }

    res.json({
      claim: {
        ...claim,
        risk_factors: typeof claim.risk_factors === 'string' ? JSON.parse(claim.risk_factors || '[]') : (claim.risk_factors || []),
        verification_details: typeof claim.verification_details === 'string' ? JSON.parse(claim.verification_details || '{}') : (claim.verification_details || {})
      },
      questions,
      answers,
      recoveryCase: recoveryCase ? {
        ...recoveryCase,
        timeline: typeof recoveryCase.timeline === 'string' ? JSON.parse(recoveryCase.timeline) : (recoveryCase.timeline || [])
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Claims
router.get('/', authenticateToken, requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'verification_officer');
    let claims = [];

    if (db.pool) {
      try {
        let pgSql = `
          SELECT 
            c.*,
            f.title as found_title, f.image as found_image, f.building as found_building,
            u.name as claimant_name, u.email as claimant_email
          FROM claims c
          JOIN items f ON c.found_item_id = f.id
          LEFT JOIN users u ON c.claimant_id = u.id
        `;
        const params = [];
        if (!isAdmin) {
          pgSql += ` WHERE c.claimant_id = $1`;
          params.push(req.user.id);
        }
        pgSql += ` ORDER BY c.created_at DESC`;
        const pgRes = await db.pool.query(pgSql, params);
        if (pgRes.rows) claims = pgRes.rows;
      } catch (poolErr) {
        console.warn('[CLAIMS LIST POOL ERROR]:', poolErr.message);
      }
    }

    if (claims.length === 0) {
      let query = `
        SELECT 
          c.*,
          f.title as found_title, f.image as found_image, f.building as found_building,
          u.name as claimant_name, u.email as claimant_email
        FROM claims c
        JOIN items f ON c.found_item_id = f.id
        LEFT JOIN users u ON c.claimant_id = u.id
      `;
      const params = [];

      if (!isAdmin) {
        query += ` WHERE c.claimant_id = ?`;
        params.push(req.user.id);
      }

      query += ` ORDER BY c.created_at DESC`;
      claims = db.prepare(query).all(...params);
    }

    const formatted = claims.map(c => ({
      ...c,
      risk_factors: typeof c.risk_factors === 'string' ? JSON.parse(c.risk_factors || '[]') : (c.risk_factors || []),
      verification_details: typeof c.verification_details === 'string' ? JSON.parse(c.verification_details || '{}') : (c.verification_details || {})
    }));

    res.json({ claims: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
