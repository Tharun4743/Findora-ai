const express = require('express');
const router = express.Router();
const db = require('../database/db');
const telegramBot = require('../services/telegramBot');
const { authenticateToken, requireOfficerOrAdmin } = require('../middleware/auth');

// Get Telegram Bot status, campus group, and subscriber metrics
router.get('/status', (req, res) => {
  try {
    const subscribers = db.prepare('SELECT count(*) as count FROM telegram_subscribers').get();
    const groups = db.prepare('SELECT count(*) as count FROM telegram_groups WHERE is_active = 1').get();
    
    res.json({
      botUsername: telegramBot.botUsername,
      configured: Boolean(telegramBot.token && !telegramBot.token.includes('YOUR_TELEGRAM_BOT_TOKEN') && !telegramBot.token.includes('placeholder')),
      connected: Boolean(telegramBot.connected),
      polling: telegramBot.polling,
      mode: telegramBot.connected ? 'LIVE' : 'SIMULATION',
      subscribersCount: subscribers?.count || 0,
      groupsCount: groups?.count || 0,
      campusGroupLink: telegramBot.campusGroupLink,
      campusGroupId: telegramBot.campusGroupId || null,
      lastError: telegramBot.lastError || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all registered campus community groups
router.get('/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM telegram_groups ORDER BY added_at DESC').all();
    res.json({
      campusGroupLink: telegramBot.campusGroupLink,
      groups: groups || []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Register or link a campus group manually
router.post('/register-group', (req, res) => {
  try {
    const { chatId, title, type } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required.' });
    }
    telegramBot.registerGroup(chatId, title || 'Findora Campus Community Group', type || 'supergroup');
    res.json({
      success: true,
      message: `Group ${chatId} registered successfully in Findora.`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Simulation endpoint: Test any command (Personal Student or Campus Group)
router.post('/simulate', async (req, res) => {
  try {
    const { message, username, chatId, chatType, chatTitle } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const testChatType = chatType || 'private'; // 'private' or 'supergroup'
    const isGroup = testChatType === 'supergroup' || testChatType === 'group';
    const testChatId = chatId || (isGroup ? '-1009876543210' : 'demo_student_chat');
    const testUsername = username || (isGroup ? 'GroupMember' : 'StudentAlex');
    const testChatTitle = chatTitle || 'Findora Campus Community Group';

    // Capture response using fake telegram message handling
    const replies = await telegramBot.simulateMessage(testChatId, message, testUsername, testChatType, testChatTitle);

    res.json({
      success: true,
      commandProcessed: message,
      chatType: testChatType,
      isGroup,
      sender: testUsername,
      chatId: testChatId,
      replies: (replies || []).map(r => ({
        type: r.type || 'text',
        photo: r.photo || null,
        text: r.text
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Broadcast summary on demand to all active campus groups
router.post('/broadcast-summary', async (req, res) => {
  try {
    const groups = db.prepare('SELECT chat_id FROM telegram_groups WHERE is_active = 1').all() || [];
    
    // Default to configured group or simulated group if none registered yet
    const targetGroups = groups.length > 0 ? groups.map(g => g.chat_id) : ['-100_campus_community_group'];
    
    for (const gId of targetGroups) {
      await telegramBot.handleGroupSummaryCommand(gId, true);
    }

    res.json({
      success: true,
      broadcastedToGroupsCount: targetGroups.length,
      targetGroups
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhook endpoint for live Telegram webhook mode
router.post('/webhook', async (req, res) => {
  try {
    if (req.body && (req.body.update_id || req.body.message || req.body.my_chat_member)) {
      await telegramBot.handleUpdate(req.body);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
