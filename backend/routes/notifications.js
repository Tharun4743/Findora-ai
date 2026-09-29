const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Get Notifications for Current User
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    let notifications = [];

    if (db.pool && userId) {
      try {
        const notifRes = await db.pool.query(`
          SELECT * FROM notifications 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 20
        `, [userId]);
        if (notifRes.rows) notifications = notifRes.rows;
      } catch (poolErr) {
        console.warn('[NOTIFICATIONS POOL ERROR]:', poolErr.message);
      }
    }

    if (notifications.length === 0) {
      const activeUser = db.prepare('SELECT id FROM users LIMIT 1').get();
      const targetId = userId || (activeUser ? activeUser.id : null);
      if (targetId) {
        try {
          notifications = db.prepare(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20
          `).all(targetId);
        } catch (e) {}
      }
    }

    const formatted = notifications.map(n => ({
      ...n,
      data: typeof n.data === 'string' ? JSON.parse(n.data || '{}') : (n.data || {})
    }));

    res.json({ notifications: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Notification as Read
router.post('/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
    if (db.pool) {
      db.pool.query('UPDATE notifications SET read = 1 WHERE id = $1', [req.params.id]).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark All as Read
router.post('/read-all', authenticateToken, (req, res) => {
  try {
    const activeUser = db.prepare('SELECT id FROM users LIMIT 1').get();
    const userId = req.user ? req.user.id : (activeUser ? activeUser.id : null);
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
    if (db.pool && userId) {
      db.pool.query('UPDATE notifications SET read = 1 WHERE user_id = $1', [userId]).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
