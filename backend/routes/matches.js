const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { rankCandidates, DEFAULT_WEIGHTS } = require('../services/matching');

// Get list of all matches
router.get('/', authenticateToken, async (req, res) => {
  try {
    let matches = [];

    if (db.pool) {
      try {
        const matchesRes = await db.pool.query(`
          SELECT 
            m.*,
            l.title as lost_title, l.image as lost_image, l.location as lost_location, l.building as lost_building, l.owner_id as lost_owner_id,
            f.title as found_title, f.image as found_image, f.location as found_location, f.building as found_building, f.condition as found_condition
          FROM matches m
          JOIN items l ON m.lost_item_id = l.id
          JOIN items f ON m.found_item_id = f.id
          ORDER BY m.final_score DESC, m.created_at DESC
        `);
        matches = matchesRes.rows;
      } catch (poolErr) {
        console.warn('[MATCHES SUPABASE POOL ERROR]:', poolErr.message);
      }
    }

    if (matches.length === 0) {
      try {
        matches = db.prepare(`
          SELECT 
            m.*,
            l.title as lost_title, l.image as lost_image, l.location as lost_location, l.building as lost_building, l.owner_id as lost_owner_id,
            f.title as found_title, f.image as found_image, f.location as found_location, f.building as found_building, f.condition as found_condition
          FROM matches m
          JOIN items l ON m.lost_item_id = l.id
          JOIN items f ON m.found_item_id = f.id
          ORDER BY m.final_score DESC, m.created_at DESC
        `).all();
      } catch (e) {}
    }

    const formatted = matches.map(m => ({
      ...m,
      explanation: typeof m.explanation === 'string' ? JSON.parse(m.explanation) : m.explanation
    }));

    res.json({ matches: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Match Details (Hero Screen Flagship endpoint)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const match = db.prepare(`
      SELECT 
        m.*,
        l.id as lost_id, l.title as lost_title, l.description as lost_description, 
        l.category as lost_category, l.color as lost_color, l.brand as lost_brand, 
        l.model as lost_model, l.image as lost_image, l.location as lost_location, 
        l.building as lost_building, l.floor as lost_floor, l.event_time as lost_time, 
        l.owner_id as lost_owner_id,
        
        f.id as found_id, f.title as found_title, f.description as found_description, 
        f.category as found_category, f.color as found_color, f.brand as found_brand, 
        f.model as found_model, f.image as found_image, f.location as found_location, 
        f.building as found_building, f.floor as found_floor, f.event_time as found_time, 
        f.condition as found_condition, f.owner_id as found_owner_id
      FROM matches m
      JOIN items l ON m.lost_item_id = l.id
      JOIN items f ON m.found_item_id = f.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!match) {
      return res.status(404).json({ error: 'Match record not found.' });
    }

    const explanation = typeof match.explanation === 'string' ? JSON.parse(match.explanation) : match.explanation;

    // Check if an existing claim exists for this match
    const existingClaim = db.prepare('SELECT id, status, verification_score, risk_score, risk_level FROM claims WHERE match_id = ?').get(match.id);

    res.json({
      match: {
        id: match.id,
        final_score: match.final_score,
        visual_score: match.visual_score,
        text_score: match.text_score,
        location_score: match.location_score,
        time_score: match.time_score,
        category_score: match.category_score,
        attribute_score: match.attribute_score,
        confidence_level: match.final_score >= 0.85 ? 'HIGH' : match.final_score >= 0.65 ? 'MEDIUM' : 'LOW',
        explanation,
        status: match.status,
        created_at: match.created_at,
        existing_claim: existingClaim || null
      },
      lost_item: {
        id: match.lost_id,
        title: match.lost_title,
        description: match.lost_description,
        category: match.lost_category,
        color: match.lost_color,
        brand: match.lost_brand,
        model: match.lost_model,
        image: match.lost_image,
        location: match.lost_location,
        building: match.lost_building,
        floor: match.lost_floor,
        event_time: match.lost_time,
        owner_id: match.lost_owner_id
      },
      found_item: {
        id: match.found_id,
        title: match.found_title,
        description: match.found_description,
        category: match.found_category,
        color: match.found_color,
        brand: match.found_brand,
        model: match.found_model,
        image: match.found_image,
        location: match.found_location,
        building: match.found_building,
        floor: match.found_floor,
        event_time: match.found_time,
        condition: match.found_condition,
        owner_id: match.found_owner_id
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run Real-Time AI Search on Candidates with Dynamic Weights
router.post('/search', authenticateToken, (req, res) => {
  try {
    const { itemId, weights } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required.' });
    }

    const targetItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    if (!targetItem) {
      return res.status(404).json({ error: 'Target item not found.' });
    }

    // Opposite pool
    const oppositeType = targetItem.type === 'LOST' ? 'FOUND' : 'LOST';
    const candidatePool = db.prepare(`SELECT * FROM items WHERE type = ? AND status != 'RECOVERED'`).all();

    const effectiveWeights = { ...DEFAULT_WEIGHTS, ...(weights || {}) };
    const rankedMatches = rankCandidates(targetItem, candidatePool, effectiveWeights);

    res.json({
      targetItem: { id: targetItem.id, title: targetItem.title, type: targetItem.type },
      weights: effectiveWeights,
      matches: rankedMatches
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
