const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { authenticateToken, requireAuth, requireOfficerOrAdmin } = require('../middleware/auth');
const { rankCandidates } = require('../services/matching');
const { generateHandoverCode } = require('../services/recovery');
const telegramBot = require('../services/telegramBot');
const { 
  sendReportConfirmationEmail, 
  sendFoundReportConfirmationEmail, 
  sendMatchAlertEmail, 
  sendSearchClosedEmail 
} = require('../services/email');
const { uploadToCloudinary, isCloudinaryConfigured } = require('../services/storage');

// Use memory storage so uploads work on Vercel (no persistent disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Disk-based uploads directory (local dev fallback only)
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir) && !process.env.VERCEL) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
}

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  // Try Cloudinary first (uses in-memory buffer → works on Vercel)
  try {
    const cloudUrl = await uploadToCloudinary(req.file.buffer, {
      public_id: `item_${Date.now()}_${Math.round(Math.random() * 1e4)}`
    });
    if (cloudUrl) {
      return res.json({ imageUrl: cloudUrl, url: cloudUrl, source: 'cloudinary' });
    }
  } catch (err) {
    console.warn('[UPLOAD] Cloudinary failed, trying local fallback:', err.message);
  }

  // Local disk fallback (only works when NOT on Vercel)
  if (!process.env.VERCEL) {
    try {
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `item_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      return res.json({ imageUrl: `/uploads/${filename}`, source: 'local' });
    } catch (localErr) {
      console.warn('[UPLOAD] Local save also failed:', localErr.message);
    }
  }

  res.status(500).json({ error: 'Image upload failed. Cloudinary not configured or unavailable.' });
});

// List Public Items (Security rule: Never leak private attributes!)
router.get('/', async (req, res) => {
  try {
    const { type, category, building, search, status } = req.query;

    if (db.pool) {
      try {
        let pgQuery = `
          SELECT 
            i.id, i.type, i.title, i.description, i.category, i.color, 
            i.brand, i.model, i.image, i.location, i.building, i.floor,
            i.event_time, i.created_at, i.status, i.owner_id, i.condition,
            u.name as reporter_name
          FROM items i
          LEFT JOIN users u ON i.owner_id = u.id
          WHERE 1=1
        `;
        const pgParams = [];
        let pIdx = 1;

        if (type) {
          pgQuery += ` AND i.type = $${pIdx++}`;
          pgParams.push(type.toUpperCase());
        }
        if (category) {
          pgQuery += ` AND i.category = $${pIdx++}`;
          pgParams.push(category);
        }
        if (building) {
          pgQuery += ` AND i.building = $${pIdx++}`;
          pgParams.push(building);
        }
        if (status) {
          pgQuery += ` AND i.status = $${pIdx++}`;
          pgParams.push(status);
        }
        if (search) {
          pgQuery += ` AND (i.title ILIKE $${pIdx} OR i.description ILIKE $${pIdx} OR i.brand ILIKE $${pIdx} OR i.model ILIKE $${pIdx})`;
          pIdx++;
          pgParams.push(`%${search}%`);
        }

        pgQuery += ` ORDER BY i.created_at DESC`;
        const pgRes = await db.pool.query(pgQuery, pgParams);
        if (pgRes.rows) {
          return res.json({ items: pgRes.rows, count: pgRes.rows.length });
        }
      } catch (poolErr) {
        console.warn('[ITEMS SUPABASE POOL ERROR]:', poolErr.message);
      }
    }

    let query = `
      SELECT 
        i.id, i.type, i.title, i.description, i.category, i.color, 
        i.brand, i.model, i.image, i.location, i.building, i.floor,
        i.event_time, i.created_at, i.status, i.owner_id, i.condition,
        u.name as reporter_name
      FROM items i
      LEFT JOIN users u ON i.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ` AND i.type = ?`;
      params.push(type.toUpperCase());
    }
    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (building) {
      query += ` AND i.building = ?`;
      params.push(building);
    }
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (i.title LIKE ? OR i.description LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY i.created_at DESC`;
    const items = db.prepare(query).all(...params);

    res.json({ items, count: items.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Item by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    let item = null;

    if (db.pool) {
      try {
        const itemRes = await db.pool.query(`
          SELECT i.*, u.name as reporter_name, u.email as reporter_email
          FROM items i
          LEFT JOIN users u ON i.owner_id = u.id
          WHERE i.id = $1
        `, [req.params.id]);
        if (itemRes.rows && itemRes.rows.length > 0) {
          item = itemRes.rows[0];
        }
      } catch (poolErr) {}
    }

    if (!item) {
      item = db.prepare(`
        SELECT i.*, u.name as reporter_name, u.email as reporter_email
        FROM items i
        LEFT JOIN users u ON i.owner_id = u.id
        WHERE i.id = ?
      `).get(req.params.id);
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Check if requester is owner or admin
    const isAuthorized = req.user && (req.user.id === item.owner_id || req.user.role === 'admin' || req.user.role === 'verification_officer');

    if (isAuthorized) {
      let privateAttrs = null;
      if (db.pool) {
        try {
          const privRes = await db.pool.query('SELECT * FROM item_private_attributes WHERE item_id = $1', [item.id]);
          if (privRes.rows && privRes.rows.length > 0) privateAttrs = privRes.rows[0];
        } catch (e) {}
      }
      if (!privateAttrs) {
        privateAttrs = db.prepare('SELECT * FROM item_private_attributes WHERE item_id = ?').get(item.id);
      }
      item.private_attributes = privateAttrs || null;
    } else {
      item.private_attributes = null;
    }

    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report Lost Item
router.post('/lost', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, category, color, brand, model,
      image, location, building, floor, event_time,
      serial_number, unique_marks, damage_details, hidden_features,
      latitude, longitude
    } = req.body;

    if (!title || !description || !category || !building) {
      return res.status(400).json({ error: 'Title, description, category, and building are required.' });
    }

    const itemId = `item_${Date.now()}`;
    const ownerId = req.user?.id || db.prepare('SELECT id FROM users LIMIT 1').get()?.id || 'usr_anonymous';
    const closeCode = generateHandoverCode();

    if (db.pool) {
      try {
        await db.pool.query(`
          INSERT INTO items (
            id, type, title, description, category, color, brand, model,
            image, location, building, floor, event_time, owner_id, status,
            serial_number, unique_marks, damage_details, hidden_features,
            latitude, longitude, close_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, close_code = EXCLUDED.close_code
        `, [
          itemId, 'LOST', title, description, category, color || null, brand || null, model || null,
          image || null, location || `${building} Floor ${floor || 1}`, building, floor ? parseInt(floor) : 1,
          event_time ? new Date(event_time) : new Date(), ownerId, 'OPEN',
          serial_number || null, unique_marks || null, damage_details || null, hidden_features || null,
          latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, closeCode
        ]);
      } catch (e) {
        console.warn('[SUPABASE LOST ITEM ERROR]:', e.message);
      }
    }

    try {
      const insertItem = db.prepare(`
        INSERT INTO items (
          id, type, title, description, category, color, brand, model,
          image, location, building, floor, event_time, owner_id, status,
          serial_number, unique_marks, damage_details, hidden_features,
          latitude, longitude, close_code
        ) VALUES (?, 'LOST', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?)
      `);

      insertItem.run(
        itemId,
        title,
        description,
        category,
        color || null,
        brand || null,
        model || null,
        image || null,
        location || `${building} Floor ${floor || 1}`,
        building,
        floor ? parseInt(floor) : 1,
        event_time || new Date().toISOString(),
        ownerId,
        serial_number || null,
        unique_marks || null,
        damage_details || null,
        hidden_features || null,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        closeCode
      );
    } catch (e) {}

    // Save private ownership clues table for backwards compatibility
    const privId = `priv_${itemId}`;
    try {
      db.prepare(`
        INSERT INTO item_private_attributes (
          id, item_id, serial_number, unique_marks, damage_details, hidden_features
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        privId,
        itemId,
        serial_number || null,
        unique_marks || null,
        damage_details || null,
        hidden_features || null
      );
    } catch {}

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REPORT_LOST_ITEM', 'items', ?, ?)
    `).run(`aud_${Date.now()}`, ownerId, itemId, `Reported lost item: ${title} (Close Code: ${closeCode})`);

    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    // Broadcast alert to Telegram Bot subscribers (@findoravsb_bot)
    telegramBot.broadcastNewItem(currentItem, closeCode);

    // Send confirmation email with 1-Time Code to owner
    const ownerUser = db.prepare('SELECT email FROM users WHERE id = ?').get(ownerId);
    if (ownerUser && ownerUser.email) {
      sendReportConfirmationEmail(ownerUser.email, currentItem, closeCode).catch(err => {
        console.error('[EMAIL ERROR] Failed sending report confirmation:', err.message);
      });
    }

    // Auto-scan for AI matches immediately
    const candidatePool = db.prepare("SELECT * FROM items WHERE type = 'FOUND' AND status != 'RECOVERED'").all();
    const matches = rankCandidates(currentItem, candidatePool);

    if (matches.length > 0 && matches[0].final_score >= 0.70) {
      const topMatch = matches[0];
      const matchId = `match_${Date.now()}`;
      db.prepare(`
        INSERT INTO matches (
          id, lost_item_id, found_item_id, final_score, visual_score,
          text_score, location_score, time_score, category_score,
          attribute_score, explanation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        matchId,
        topMatch.lost_item_id,
        topMatch.found_item_id,
        topMatch.final_score,
        topMatch.visual_score,
        topMatch.text_score,
        topMatch.location_score,
        topMatch.time_score,
        topMatch.category_score,
        topMatch.attribute_score,
        JSON.stringify(topMatch.explanation)
      );

      if (db.pool) {
        db.pool.query(`
          INSERT INTO matches (
            id, lost_item_id, found_item_id, final_score, visual_score,
            text_score, location_score, time_score, category_score,
            attribute_score, explanation, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
          ON CONFLICT (id) DO NOTHING
        `, [
          matchId, topMatch.lost_item_id, topMatch.found_item_id, topMatch.final_score,
          topMatch.visual_score, topMatch.text_score, topMatch.location_score,
          topMatch.time_score, topMatch.category_score, topMatch.attribute_score,
          JSON.stringify(topMatch.explanation)
        ]).catch(e => console.warn('[SUPABASE MATCH INSERT ERROR]:', e.message));
      }

      // Create instant Smart Recovery notification
      const notifId = `notif_${Date.now()}`;
      const notifMsg = `Potential match discovered with ${Math.round(topMatch.final_score * 100)}% confidence for your ${title}.`;
      const notifData = JSON.stringify({ match_id: matchId, item_id: itemId });

      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, data)
        VALUES (?, ?, 'AI Match Discovered', ?, 'MATCH_ALERT', ?)
      `).run(notifId, ownerId, notifMsg, notifData);

      if (db.pool) {
        db.pool.query(
          'INSERT INTO notifications (id, user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5, $6)',
          [notifId, ownerId, 'AI Match Discovered', notifMsg, 'MATCH_ALERT', notifData]
        ).catch(e => console.warn('[SUPABASE NOTIF INSERT ERROR]:', e.message));
      }

      // Broadcast AI Match alert to Telegram Bot subscribers
      const matchedFoundItem = db.prepare('SELECT * FROM items WHERE id = ?').get(topMatch.found_item_id);
      if (matchedFoundItem) {
        telegramBot.broadcastMatch(currentItem, matchedFoundItem, topMatch.final_score);
      }

      // Send AI Match alert email to owner via Brevo
      if (ownerUser && ownerUser.email) {
        sendMatchAlertEmail(ownerUser.email, {
          lost_title: currentItem?.title || title,
          found_title: matchedFoundItem?.title || 'Campus Discovered Item',
          final_score: topMatch.final_score
        }).catch(err => console.warn('[MATCH EMAIL WARNING]:', err.message));
      }
    }

    res.status(201).json({
      message: 'Lost item reported successfully and indexed by Findora AI.',
      itemId,
      close_code: closeCode,
      matchesFound: matches.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report Found Item
router.post('/found', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, category, color, brand, model,
      image, location, building, floor, event_time, condition,
      unique_marks, damage_details, hidden_features,
      latitude, longitude
    } = req.body;

    if (!title || !description || !category || !building) {
      return res.status(400).json({ error: 'Title, description, category, and building are required.' });
    }

    const itemId = `item_${Date.now()}`;
    const ownerId = req.user?.id || db.prepare('SELECT id FROM users LIMIT 1').get()?.id || 'usr_anonymous';
    const closeCode = generateHandoverCode();

    if (db.pool) {
      try {
        await db.pool.query(`
          INSERT INTO items (
            id, type, title, description, category, color, brand, model,
            image, location, building, floor, event_time, owner_id, status, condition,
            unique_marks, damage_details, hidden_features,
            latitude, longitude, close_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, close_code = EXCLUDED.close_code
        `, [
          itemId, 'FOUND', title, description, category, color || null, brand || null, model || null,
          image || null, location || `${building} Floor ${floor || 1}`, building, floor ? parseInt(floor) : 1,
          event_time ? new Date(event_time) : new Date(), ownerId, 'OPEN',
          condition || 'Operational', unique_marks || null, damage_details || null, hidden_features || null,
          latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, closeCode
        ]);
      } catch (e) {
        console.warn('[SUPABASE FOUND ITEM ERROR]:', e.message);
      }
    }

    try {
      const insertItem = db.prepare(`
        INSERT INTO items (
          id, type, title, description, category, color, brand, model,
          image, location, building, floor, event_time, owner_id, status, condition,
          unique_marks, damage_details, hidden_features,
          latitude, longitude, close_code
        ) VALUES (?, 'FOUND', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?)
      `);

      insertItem.run(
        itemId,
        title,
        description,
        category,
        color || null,
        brand || null,
        model || null,
        image || null,
        location || `${building} Floor ${floor || 1}`,
        building,
        floor ? parseInt(floor) : 1,
        event_time || new Date().toISOString(),
        ownerId,
        condition || 'Operational',
        unique_marks || null,
        damage_details || null,
        hidden_features || null,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        closeCode
      );
    } catch (e) {}

    // Save private observations table for backwards compatibility
    const privId = `priv_${itemId}`;
    try {
      db.prepare(`
        INSERT INTO item_private_attributes (
          id, item_id, unique_marks, damage_details, hidden_features
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        privId,
        itemId,
        unique_marks || null,
        damage_details || null,
        hidden_features || null
      );
    } catch {}

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REPORT_FOUND_ITEM', 'items', ?, ?)
    `).run(`aud_${Date.now()}`, ownerId, itemId, `Turned in found item: ${title} (Close Code: ${closeCode})`);

    const currentFoundItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    // Broadcast alert to Telegram Bot subscribers (@findoravsb_bot)
    telegramBot.broadcastNewItem(currentFoundItem, closeCode);

    // Scan lost items pool
    const candidatePool = db.prepare("SELECT * FROM items WHERE type = 'LOST' AND status != 'RECOVERED'").all();
    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    const matches = rankCandidates(currentItem, candidatePool);

    if (matches.length > 0 && matches[0].final_score >= 0.80) {
      const topMatch = matches[0];
      const matchId = `match_${Date.now()}`;
      db.prepare(`
        INSERT INTO matches (
          id, lost_item_id, found_item_id, final_score, visual_score,
          text_score, location_score, time_score, category_score,
          attribute_score, explanation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        matchId,
        topMatch.lost_item_id,
        topMatch.found_item_id,
        topMatch.final_score,
        topMatch.visual_score,
        topMatch.text_score,
        topMatch.location_score,
        topMatch.time_score,
        topMatch.category_score,
        topMatch.attribute_score,
        JSON.stringify(topMatch.explanation)
      );

      if (db.pool) {
        db.pool.query(`
          INSERT INTO matches (
            id, lost_item_id, found_item_id, final_score, visual_score,
            text_score, location_score, time_score, category_score,
            attribute_score, explanation, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
          ON CONFLICT (id) DO NOTHING
        `, [
          matchId, topMatch.lost_item_id, topMatch.found_item_id, topMatch.final_score,
          topMatch.visual_score, topMatch.text_score, topMatch.location_score,
          topMatch.time_score, topMatch.category_score, topMatch.attribute_score,
          JSON.stringify(topMatch.explanation)
        ]).catch(e => console.warn('[SUPABASE FOUND MATCH INSERT ERROR]:', e.message));
      }

      // Notify owner of lost item
      const lostItem = db.prepare('SELECT owner_id, title FROM items WHERE id = ?').get(topMatch.lost_item_id);
      if (lostItem) {
        const notifId = `notif_${Date.now()}`;
        const notifMsg = `A found item matching your ${lostItem.title} was just reported with ${Math.round(topMatch.final_score * 100)}% match confidence.`;
        const notifData = JSON.stringify({ match_id: matchId, item_id: topMatch.lost_item_id });

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, data)
          VALUES (?, ?, 'Potential Match Found!', ?, 'MATCH_ALERT', ?)
        `).run(notifId, lostItem.owner_id, notifMsg, notifData);

        if (db.pool) {
          db.pool.query(
            'INSERT INTO notifications (id, user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5, $6)',
            [notifId, lostItem.owner_id, 'Potential Match Found!', notifMsg, 'MATCH_ALERT', notifData]
          ).catch(e => console.warn('[SUPABASE NOTIF INSERT ERROR]:', e.message));
        }

        // Broadcast AI Match alert to Telegram Bot subscribers
        const matchedLostItem = db.prepare('SELECT * FROM items WHERE id = ?').get(topMatch.lost_item_id);
        if (matchedLostItem) {
          telegramBot.broadcastMatch(matchedLostItem, currentItem, topMatch.final_score);
        }

        // Send AI Match alert email to lost item owner
        const lostOwnerUser = db.prepare('SELECT email FROM users WHERE id = ?').get(lostItem.owner_id);
        if (lostOwnerUser && lostOwnerUser.email) {
          sendMatchAlertEmail(lostOwnerUser.email, {
            lost_title: lostItem.title,
            found_title: currentFoundItem?.title || title,
            final_score: topMatch.final_score
          }).catch(err => console.warn('[FOUND MATCH EMAIL WARNING]:', err.message));
        }
      }
    }

    // Send thank-you confirmation email to finder
    const finderUser = db.prepare('SELECT email FROM users WHERE id = ?').get(ownerId);
    if (finderUser && finderUser.email) {
      sendFoundReportConfirmationEmail(finderUser.email, currentFoundItem || { title, category, building }).catch(err => {
        console.warn('[FINDER CONFIRMATION EMAIL WARNING]:', err.message);
      });
    }

    res.status(201).json({
      message: 'Found item reported and stored securely.',
      itemId,
      close_code: closeCode,
      matchesFound: matches.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verification Officer endpoint: Close searching using 1-Time Code recited by owner
router.post('/close-search', authenticateToken, requireOfficerOrAdmin, async (req, res) => {
  try {
    const { closeCode, notes } = req.body;
    if (!closeCode || !closeCode.trim()) {
      return res.status(400).json({ error: '1-Time Verification Code is required.' });
    }

    const code = closeCode.trim().toUpperCase();

    // Look for active item with this 1-time code
    let item = db.prepare('SELECT * FROM items WHERE UPPER(close_code) = ?').get(code);
    let recoveryCase = null;

    if (!item) {
      // Fallback: check recovery_cases table
      recoveryCase = db.prepare('SELECT * FROM recovery_cases WHERE UPPER(handover_code) = ?').get(code);
      if (recoveryCase) {
        item = db.prepare('SELECT * FROM items WHERE id = ?').get(recoveryCase.item_id);
      }
    }

    if (!item) {
      return res.status(404).json({
        error: `Invalid 1-Time Code "${code}". No active item matched this code.`
      });
    }

    if (item.status === 'RECOVERED' || item.status === 'CLOSED') {
      return res.status(400).json({
        error: `Search for item "${item.title}" is already marked as RECOVERED/CLOSED.`
      });
    }

    const officerName = req.user?.name || 'Campus Security Officer';
    const officerId = req.user?.id || 'officer_vault';
    const now = new Date().toISOString();

    // Mark item as RECOVERED & record custody close
    db.prepare(`
      UPDATE items
      SET status = 'RECOVERED', closed_at = ?, closed_by = ?
      WHERE id = ?
    `).run(now, officerName, item.id);

    if (db.pool) {
      db.pool.query(
        'UPDATE items SET status = $1, closed_at = $2, closed_by = $3 WHERE id = $4',
        ['RECOVERED', new Date(now), officerName, item.id]
      ).catch(e => console.warn('[SUPABASE ITEM RECOVERED ERROR]:', e.message));
    }

    // If item was linked to a recovery case, mark it RECOVERED as well
    db.prepare(`
      UPDATE recovery_cases
      SET status = 'RECOVERED', recovered_at = ?
      WHERE item_id = ?
    `).run(now, item.id);

    if (db.pool) {
      db.pool.query(
        'UPDATE recovery_cases SET status = $1, recovered_at = $2 WHERE item_id = $3',
        ['RECOVERED', new Date(now), item.id]
      ).catch(e => console.warn('[SUPABASE CASE RECOVERED ERROR]:', e.message));
    }

    // Mark any related claims
    db.prepare(`
      UPDATE claims
      SET status = 'APPROVED'
      WHERE lost_item_id = ? OR found_item_id = ?
    `).run(item.id, item.id);

    if (db.pool) {
      db.pool.query(
        'UPDATE claims SET status = $1 WHERE lost_item_id = $2 OR found_item_id = $2',
        ['APPROVED', item.id]
      ).catch(e => console.warn('[SUPABASE CLAIMS APPROVE ERROR]:', e.message));
    }

    // Audit log
    const audId = `aud_${Date.now()}`;
    const audDetail = `1-Time Code ${code} verified by ${officerName}. Custody transferred and search closed.`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'SEARCH_CLOSED_BY_CODE', 'items', ?, ?)
    `).run(audId, officerId, item.id, audDetail);

    if (db.pool) {
      db.pool.query(
        'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
        [audId, officerId, 'SEARCH_CLOSED_BY_CODE', 'items', item.id, audDetail]
      ).catch(e => console.warn('[SUPABASE AUDIT LOG ERROR]:', e.message));
    }

    // Notify owner via email
    const owner = db.prepare('SELECT email FROM users WHERE id = ?').get(item.owner_id);
    if (owner && owner.email) {
      sendSearchClosedEmail(owner.email, item, officerName).catch(err => {
        console.error('[EMAIL ERROR] Failed sending search closed notification:', err.message);
      });
    }

    // Broadcast resolution to Telegram Bot subscribers (@findoravsb_bot)
    telegramBot.broadcastSearchClosed(item, officerName, code);

    // Create in-app notification for owner
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, data)
      VALUES (?, ?, 'Item Recovered & Search Closed!', ?, 'HANDOVER_READY', ?)
    `).run(
      `notif_${Date.now()}`,
      item.owner_id,
      `Your item ${item.title} has been officially verified and returned by ${officerName}. The search is closed.`,
      JSON.stringify({ item_id: item.id, status: 'RECOVERED', verified_by: officerName })
    );

    res.json({
      success: true,
      message: `Item custody verified! Search for "${item.title}" is officially closed.`,
      item: {
        ...item,
        status: 'RECOVERED',
        closed_at: now,
        closed_by: officerName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
