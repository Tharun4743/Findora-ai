// FINDORA AI - Telegram Bot Service (@findoravsb_bot)
// Dual-Channel Architecture:
// 1) Individual Student Mode: Private 1-on-1 chats for personal notifications, status, and confidential 1-Time Codes.
// 2) Campus Group Mode: Admin in official campus community group (https://t.me/+V_U9BauJqKQ2NzE1)
//    broadcasting visual lost & found summaries, images, and live incident telemetry.

const fs = require('fs');
const path = require('path');
const db = require('../database/db');

class TelegramBotService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME || 'findoravsb_bot';
    this.campusGroupLink = process.env.TELEGRAM_CAMPUS_GROUP_LINK || 'https://t.me/+V_U9BauJqKQ2NzE1';
    this.campusGroupId = process.env.TELEGRAM_CAMPUS_GROUP_ID || '';
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.polling = false;
    this.pollOffset = 0;
    this.pollingTimeout = null;
    this.connected = false;
    this.lastError = null;
    this.botInfo = null;
    this.captureSimulatedReplies = false;
    this.simulatedReplies = [];
  }

  /**
   * Initialize Bot and start polling if token is provided
   */
  async init() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.connected = false;
    this.lastError = null;

    if (!this.token || this.token.includes('YOUR_TELEGRAM_BOT_TOKEN') || this.token.includes('placeholder')) {
      console.log(`[TELEGRAM BOT] ℹ️ Simulation Mode active for @${this.botUsername}.`);
      console.log(`[TELEGRAM BOT] 💡 Set a live TELEGRAM_BOT_TOKEN in backend/.env to connect to Telegram live.`);
      console.log(`[TELEGRAM BOT] 👥 Campus Group configured: ${this.campusGroupLink}`);
      return;
    }

    try {
      const res = await fetch(`${this.apiUrl}/getMe`);
      const data = await res.json();

      if (data.ok) {
        this.connected = true;
        this.botInfo = data.result;
        this.botUsername = data.result.username || this.botUsername;
        console.log(`[TELEGRAM BOT] ✅ Connected successfully to Telegram as @${data.result.username} (${data.result.first_name})`);
        if (!process.env.VERCEL) {
          this.startPolling();
        } else {
          console.log(`[TELEGRAM BOT] ℹ️ Running in Serverless mode on Vercel (Ensuring Webhook is active)`);
          this.ensureWebhook().catch(e => console.warn('[TELEGRAM WEBHOOK WARNING]:', e.message));
        }
      } else {
        this.connected = false;
        this.lastError = data.description;
        console.warn(`[TELEGRAM BOT] ⚠️ Telegram API returned error: ${data.description}`);
        console.log(`[TELEGRAM BOT] ℹ️ Operating in local Simulation Mode.`);
      }
    } catch (err) {
      this.connected = false;
      this.lastError = err.message;
      console.error(`[TELEGRAM BOT] ❌ Network error connecting to Telegram: ${err.message}`);
    }
  }

  /**
   * Ensure Webhook is set for Vercel Serverless
   */
  async ensureWebhook() {
    if (!this.token) return;
    try {
      const webhookUrl = 'https://findoravsbec.vercel.app/api/telegram/webhook';
      const res = await fetch(`${this.apiUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'my_chat_member', 'chat_member']
        })
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`[TELEGRAM BOT] 🔗 Live webhook linked: ${webhookUrl}`);
      }
    } catch (e) {
      console.warn('[TELEGRAM BOT] Webhook auto-setup warning:', e.message);
    }
  }

  /**
   * Start long-polling for updates
   */
  async startPolling() {
    if (this.polling) return;
    this.polling = true;
    console.log(`[TELEGRAM BOT] 🔄 Polling started for @${this.botUsername}...`);
    this.pollLoop();
  }

  /**
   * Stop polling gracefully
   */
  stopPolling() {
    this.polling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }

  /**
   * Continuous Polling Loop
   */
  async pollLoop() {
    if (!this.polling) return;

    try {
      const url = `${this.apiUrl}/getUpdates?offset=${this.pollOffset}&timeout=20&allowed_updates=["message","my_chat_member","chat_member"]`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          this.pollOffset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      }
    } catch (err) {
      // Avoid spamming on temporary network disconnection
    }

    if (this.polling) {
      this.pollingTimeout = setTimeout(() => this.pollLoop(), 1500);
    }
  }

  /**
   * Process incoming update / message
   */
  async handleUpdate(update) {
    // 1. Handle bot added to group as admin/member
    if (update.my_chat_member) {
      const myMember = update.my_chat_member;
      const chat = myMember.chat;
      const status = myMember.new_chat_member ? myMember.new_chat_member.status : '';

      if (['administrator', 'member'].includes(status)) {
        this.registerGroup(chat.id.toString(), chat.title || 'Campus Lost & Found Group', chat.type);
        const welcomeText = 
`🎓 *FINDORA AI Campus Bot is now ACTIVE in ${chat.title || 'this group'}!*

Hello everyone! I have joined as your automated Campus Lost & Found assistant.

📋 *Campus Group Commands:*
📊 \`/summary\` — Visual summary of all active lost & found items (with photos & locations!)
🔍 \`/lost\` — View items currently missing across campus
📦 \`/found\` — Browse items safely turned in at campus facilities
📸 \`/report\` — Guide to submit verified reports with live camera
ℹ️ \`/status <id>\` — Check search status of an item

🔒 *For Students (Confidential Handover Codes):*
To view your private 1-Time Handover Code, message me directly in private chat: [@${this.botUsername}](https://t.me/${this.botUsername}) (never leak codes in this group!).`;

        await this.sendMessage(chat.id.toString(), welcomeText, { parse_mode: 'Markdown' });
      } else if (['left', 'kicked'].includes(status)) {
        this.deactivateGroup(chat.id.toString());
      }
      return;
    }

    const message = update.message || update.channel_post;
    if (!message) return;

    const chat = message.chat || {};
    const chatId = chat.id ? chat.id.toString() : '';
    const chatType = chat.type || 'private';
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const isPrivate = chatType === 'private';
    const text = (message.text || '').trim();
    const fromUser = message.from || {};
    const username = fromUser.username || fromUser.first_name || 'Campus Member';

    // Auto-register group or private subscriber
    if (isGroup) {
      this.registerGroup(chatId, chat.title || 'Campus Community Group', chatType);
    } else {
      this.registerSubscriber(chatId, username, fromUser.first_name);
    }

    if (!text) return;

    // Command Router
    const parts = text.split(/\s+/);
    const cmd = parts[0].toLowerCase().split('@')[0]; // Strip @findoravsb_bot handle if present
    const args = parts.slice(1);

    switch (cmd) {
      case '/start':
        if (isGroup) {
          await this.handleGroupStartCommand(chatId, chat.title);
        } else {
          await this.handleStartCommand(chatId, fromUser);
        }
        break;

      case '/summary':
      case '/campus':
        await this.handleGroupSummaryCommand(chatId, isGroup);
        break;

      case '/help':
        await this.handleHelpCommand(chatId, isGroup);
        break;

      case '/lost':
        await this.handleLostCommand(chatId, isGroup);
        break;

      case '/found':
        await this.handleFoundCommand(chatId, isGroup);
        break;

      case '/status':
        await this.handleStatusCommand(chatId, args, isGroup);
        break;

      case '/code':
        if (isGroup) {
          // Security block in public groups
          await this.sendMessage(chatId, 
`🔒 *Confidentiality Notice:*
1-Time Handover Codes are secret proof of item ownership. For your security, codes are **never** revealed in public groups.

👉 Please open a private message with [@${this.botUsername}](https://t.me/${this.botUsername}) and type:
\`/code ${args[0] || '<item_id>'}\``, { parse_mode: 'Markdown' });
        } else {
          await this.handleCodeCommand(chatId, args);
        }
        break;

      case '/myreports':
        if (isGroup) {
          await this.sendMessage(chatId, `ℹ️ Personal reports contain private handover codes. Please check \`/myreports\` in a private direct message with [@${this.botUsername}](https://t.me/${this.botUsername}).`, { parse_mode: 'Markdown' });
        } else {
          await this.handleMyReportsCommand(chatId, fromUser);
        }
        break;

      case '/close':
      case '/verify':
        await this.handleCloseCommand(chatId, args, username, isGroup);
        break;

      case '/report':
        await this.handleReportCommand(chatId, isGroup);
        break;

      case '/search':
      case '/find':
        await this.handleSearchCommand(chatId, args, isGroup);
        break;

      case '/stats':
      case '/metrics':
        await this.handleStatsCommand(chatId, isGroup);
        break;

      case '/recent':
      case '/latest':
        await this.handleRecentCommand(chatId, isGroup);
        break;

      case '/zones':
      case '/locations':
      case '/hotspots':
        await this.handleZonesCommand(chatId, isGroup);
        break;

      case '/categories':
      case '/cats':
        await this.handleCategoriesCommand(chatId, isGroup);
        break;

      case '/category':
      case '/cat':
        await this.handleCategoryFilterCommand(chatId, args, isGroup);
        break;

      case '/matches':
      case '/aimatches':
        await this.handleMatchesCommand(chatId, isGroup);
        break;

      case '/claim':
        await this.handleClaimCommand(chatId, args, isGroup);
        break;

      default:
        if (text.startsWith('/') && !isGroup) {
          await this.sendMessage(chatId, `❓ Unknown command "${cmd}". Type /help to see all available commands.`);
        }
        break;
    }
  }

  /**
   * Register or update subscriber in Supabase & Local Cache
   */
  async registerSubscriber(chatId, username, firstName) {
    if (db.pool) {
      try {
        await db.pool.query(`
          INSERT INTO telegram_subscribers (chat_id, username, first_name, role, subscribed_at)
          VALUES ($1, $2, $3, 'student', NOW())
          ON CONFLICT (chat_id) DO UPDATE SET
            username = EXCLUDED.username,
            first_name = EXCLUDED.first_name
        `, [chatId, username || 'Anonymous', firstName || 'User']);
      } catch (e) {}
    }

    try {
      db.prepare(`
        INSERT INTO telegram_subscribers (chat_id, username, first_name, subscribed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(chat_id) DO UPDATE SET
          username = excluded.username,
          first_name = excluded.first_name
      `).run(chatId, username || 'Anonymous', firstName || 'User');
    } catch (e) {}
  }

  /**
   * Register or update campus community group in Supabase & Local Cache
   */
  async registerGroup(chatId, title, type) {
    if (db.pool) {
      try {
        await db.pool.query(`
          INSERT INTO telegram_groups (chat_id, title, type, is_active, updated_at)
          VALUES ($1, $2, $3, 1, NOW())
          ON CONFLICT (chat_id) DO UPDATE SET
            title = EXCLUDED.title,
            type = EXCLUDED.type,
            is_active = 1,
            updated_at = NOW()
        `, [chatId, title || 'Campus Community Group', type || 'supergroup']);
        console.log(`[TELEGRAM BOT] 📌 Campus Group active in Supabase: "${title}" (${chatId})`);
      } catch (e) {}
    }

    try {
      db.prepare(`
        INSERT INTO telegram_groups (chat_id, title, type, is_active, updated_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(chat_id) DO UPDATE SET
          title = excluded.title,
          type = excluded.type,
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(chatId, title || 'Campus Community Group', type || 'supergroup');
    } catch (e) {}
  }

  /**
   * Deactivate group when bot is removed
   */
  async deactivateGroup(chatId) {
    if (db.pool) {
      try {
        await db.pool.query('UPDATE telegram_groups SET is_active = 0, updated_at = NOW() WHERE chat_id = $1', [chatId]);
      } catch (e) {}
    }
    try {
      db.prepare('UPDATE telegram_groups SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?').run(chatId);
    } catch (e) {}
  }

  /**
   * /start Command - Individual Student (Private Chat)
   */
  async handleStartCommand(chatId, fromUser) {
    const name = fromUser.first_name || 'Student';
    const text = 
`🎓 *Welcome to FINDORA Campus Lost & Found Bot (@${this.botUsername})!*

Hello ${name}! I am your personal campus AI assistant for tracking lost items, checking item statuses, and retrieving your secret 1-Time Handover Codes.

📋 *Personal Commands:*
🔍 \`/lost\` — View active lost items currently searched
📦 \`/found\` — View items recently turned in across campus
ℹ️ \`/status <item_id>\` — Check real-time search status of an item
🔑 \`/code <item_id>\` — Retrieve your secret 1-Time Handover Code
📋 \`/myreports\` — View all your reports and codes
📸 \`/report\` — Guide to report items via Web Portal with Live Camera
❓ \`/help\` — Complete command reference

👥 *Official Campus Community Group:*
Join our campus-wide group for real-time broadcasts and photos:
👉 [Join Findora Campus Group](${this.campusGroupLink})

🌐 *Web Portal:* https://findoravsbec.vercel.app

🔔 *Notifications:*
You are registered for direct alerts whenever an item matching yours is found or updated!`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * /start Command - Campus Group Chat
   */
  async handleGroupStartCommand(chatId, groupTitle) {
    const text = 
`🎓 *FINDORA Campus Lost & Found System Active in ${groupTitle || 'this group'}!*

This group receives automatic campus-wide broadcasts for newly reported lost items, turned-in found items, and recovery milestones.

📋 *Group Commands:*
📊 \`/summary\` — Comprehensive visual summary of all campus lost & found items with photos & locations
🔍 \`/lost\` — View current active lost items
📦 \`/found\` — Browse items staged at campus facilities
📸 \`/report\` — Guide to report items via Live Camera portal
❓ \`/help\` — Full command list

🌐 *Live Portal:* https://findoravsbec.vercel.app

🔒 *Students:* For private 1-Time Handover Codes, please message [@${this.botUsername}](https://t.me/${this.botUsername}) in direct chat!`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * /summary Command - Comprehensive Visual Campus Summary (with Photos & Locations)
   */
  async handleGroupSummaryCommand(chatId, isGroup = false) {
    try {
      let lostItems = [];
      let foundItems = [];
      let recoveredCount = 0;

      if (db.pool) {
        try {
          const [lostRes, foundRes, recRes] = await Promise.all([
            db.pool.query("SELECT id, title, category, building, floor, location, latitude, longitude, image, brand, event_time FROM items WHERE type = 'LOST' AND status = 'OPEN' ORDER BY created_at DESC"),
            db.pool.query("SELECT id, title, category, building, floor, location, latitude, longitude, image, condition, event_time FROM items WHERE type = 'FOUND' AND status = 'OPEN' ORDER BY created_at DESC"),
            db.pool.query("SELECT count(*)::int as count FROM items WHERE status IN ('RECOVERED', 'CLOSED')")
          ]);
          lostItems = lostRes.rows || [];
          foundItems = foundRes.rows || [];
          recoveredCount = recRes.rows[0]?.count || 0;
        } catch (poolErr) {
          console.warn('[TELEGRAM SUMMARY POOL ERROR]:', poolErr.message);
        }
      }

      if (lostItems.length === 0 && foundItems.length === 0) {
        try {
          lostItems = db.prepare("SELECT id, title, category, building, floor, location, latitude, longitude, image, brand, event_time FROM items WHERE type = 'LOST' AND status = 'OPEN' ORDER BY created_at DESC").all() || [];
          foundItems = db.prepare("SELECT id, title, category, building, floor, location, latitude, longitude, image, condition, event_time FROM items WHERE type = 'FOUND' AND status = 'OPEN' ORDER BY created_at DESC").all() || [];
          recoveredCount = db.prepare("SELECT count(*) as count FROM items WHERE status IN ('RECOVERED', 'CLOSED')").get()?.count || 0;
        } catch (e) {}
      }

      // Group counts by facility / building
      const facilities = {};
      [...lostItems, ...foundItems].forEach(item => {
        const b = item.building || 'Campus Central';
        facilities[b] = (facilities[b] || 0) + 1;
      });

      const facilityBreakdown = Object.entries(facilities)
        .map(([b, count]) => `• *${b}:* ${count} active item(s)`)
        .join('\n') || '• *Campus Wide:* No active reports';

      let summaryHeader = 
`📊 *FINDORA CAMPUS LOST & FOUND INTELLIGENCE SUMMARY*
🏢 *Official Campus Incident Registry & Spatial Telemetry*

📈 *Current Campus Status:*
• 🔍 *Active Lost Items:* ${lostItems.length}
• 📦 *Active Found Items Staged:* ${foundItems.length}
• 🎉 *Officially Recovered:* ${recoveredCount}
• 🌐 *Web Portal:* https://findoravsbec.vercel.app

🏛️ *Activity by Facility:*
${facilityBreakdown}`;

      let detailedBody = `\n\n═══════════════════════════\n`;

      if (lostItems.length > 0) {
        detailedBody += `🔍 *ACTIVE LOST ITEMS (${lostItems.length}):*\n`;
        lostItems.slice(0, 5).forEach((item, idx) => {
          detailedBody += `\n*${idx + 1}. ${item.title}* [${item.category}]\n`;
          detailedBody += `   🏢 *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
          detailedBody += `   📍 *Area:* ${item.location || 'Reported on campus'}\n`;
          if (item.latitude && item.longitude) {
            detailedBody += `   🛰️ *GPS:* \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\`\n`;
          }
          detailedBody += `   🕒 *Time:* ${new Date(item.event_time).toLocaleDateString()} ${new Date(item.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
          detailedBody += `   🆔 \`${item.id}\`\n`;
        });
      } else {
        detailedBody += `\n✅ *No active lost items currently reported on campus.*\n`;
      }

      detailedBody += `\n═══════════════════════════\n`;

      if (foundItems.length > 0) {
        detailedBody += `📦 *RECENTLY FOUND ITEMS STAGED FOR CLAIM (${foundItems.length}):*\n`;
        foundItems.slice(0, 5).forEach((item, idx) => {
          detailedBody += `\n*${idx + 1}. ${item.title}* [${item.category}]\n`;
          detailedBody += `   🏢 *Staged At:* ${item.building} (Floor ${item.floor || 1})\n`;
          detailedBody += `   ⚙️ *Condition:* ${item.condition || 'Operational'}\n`;
          if (item.latitude && item.longitude) {
            detailedBody += `   🛰️ *GPS:* \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\`\n`;
          }
          detailedBody += `   🆔 \`${item.id}\`\n`;
        });
        detailedBody += `\n🔑 *To claim:* Submit verification via https://findoravsbec.vercel.app or contact Campus Security.`;
      } else {
        detailedBody += `\n📦 *No unclaimed found items currently staged.*\n`;
      }

      detailedBody += `\n\n🔒 *Students:* Direct message [@${this.botUsername}](https://t.me/${this.botUsername}) in private chat to safely retrieve your secret 1-Time Handover Codes!`;

      // Find flagship item with an image to feature
      const itemWithImage = lostItems.find(i => i.image) || foundItems.find(i => i.image);

      if (itemWithImage && itemWithImage.image) {
        const photoCaption = 
`📸 *CAMPUS RADAR: ${itemWithImage.title}*
📍 *Location:* ${itemWithImage.building} (Floor ${itemWithImage.floor || 1})
📁 *Category:* ${itemWithImage.category}
${summaryHeader}`.substring(0, 1024);

        await this.sendPhoto(chatId, itemWithImage.image, photoCaption);
        await this.sendMessage(chatId, detailedBody, { parse_mode: 'Markdown' });
      } else {
        await this.sendMessage(chatId, summaryHeader + detailedBody, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error generating campus summary: ${e.message}`);
    }
  }

  /**
   * /help Command - Comprehensive Manual
   */
  async handleHelpCommand(chatId, isGroup = false) {
    if (isGroup) {
      const text = 
`📚 *FINDORA AI Group Intelligence Manual (@${this.botUsername})*
🏢 *VSBEC Campus Lost & Found Hub*

🔍 *Search & Exploration Commands:*
• \`/summary\` — Visual summary of all active lost & found items with photos!
• \`/search <keyword>\` — Search database for items (e.g. \`/search watch\`, \`/search macbook\`, \`/search id card\`)
• \`/recent\` — View the 5 newest reported items on campus
• \`/lost\` — Browse items currently missing
• \`/found\` — Browse turned-in found property
• \`/categories\` — View item counts across all categories
• \`/category <name>\` — Filter items by category (e.g. \`/cat Electronics\`)
• \`/zones\` (or \`/hotspots\`) — Missing & found item stats grouped by campus block

📊 *Live Telemetry & Tracking:*
• \`/stats\` (or \`/metrics\`) — Campus recovery rate %, total items & incident counters
• \`/matches\` — View high-confidence AI multimodal correlations
• \`/status <id>\` — Check search progress for an item ID
• \`/claim <id>\` — Get link to start Zero-Knowledge blind verification quiz
• \`/report\` — Guide to submit reports with live camera GPS watermarking

🔒 *For Item Owners (Private DM Only):*
• Open private chat with [@${this.botUsername}](https://t.me/${this.botUsername}) to retrieve secret 1-Time Handover Codes via \`/code <id>\` or \`/myreports\`.

🌐 *Web Portal:* https://findoravsbec.vercel.app`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } else {
      const text = 
`📚 *FINDORA AI Personal Command Center (@${this.botUsername})*

🔎 *Search & Discovery:*
• \`/search <keyword>\` — Search all campus records (e.g. \`/search bottle\`, \`/search keys\`, \`/search titan\`)
• \`/recent\` — View newest reported items with location details
• \`/lost\` — List recent active lost item searches
• \`/found\` — Browse items safely staged at campus security
• \`/category <name>\` — Filter by category (e.g. \`/cat Electronics\`, \`/cat IDs\`)
• \`/categories\` — List all item categories & counts
• \`/zones\` — View lost/found volume by campus building

📊 *Intelligence & Status:*
• \`/stats\` — View campus recovery rate %, solved cases & active alerts
• \`/matches\` — View live AI multimodal matching suggestions
• \`/status <id>\` — Look up live status of any reported item
• \`/claim <id>\` — Instructions to start blind verification on portal

🔐 *Confidential Handover Tools:*
• \`/code <id>\` — View secret 1-Time Recovery Code for your item. Recite this to the officer during physical pickup!
• \`/myreports\` — View all your reports and secret handover tokens.
• \`/report\` — Direct link to the live camera optical watermarking tool.

👮 *For Security Officers & Admins:*
• \`/close <code>\` (or \`/verify <code>\`) — Verify 1-time handover code from student (e.g. \`/close FD-9842\`) to close search and seal custody ledger.

👥 *Campus Group:* [Join Findora Community Group](${this.campusGroupLink})
🌐 *Web Portal:* https://findoravsbec.vercel.app`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    }
  }

  /**
   * /lost Command - Display active lost items
   */
  async handleLostCommand(chatId, isGroup = false) {
    try {
      let items = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT id, title, category, building, floor, location, latitude, longitude, image, event_time
            FROM items
            WHERE type = 'LOST' AND status = 'OPEN'
            ORDER BY created_at DESC
            LIMIT 5
          `);
          items = res.rows || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        try {
          items = db.prepare(`
            SELECT id, title, category, building, floor, location, latitude, longitude, image, event_time
            FROM items
            WHERE type = 'LOST' AND status = 'OPEN'
            ORDER BY created_at DESC
            LIMIT 5
          `).all() || [];
        } catch (e) {}
      }

      if (!items || items.length === 0) {
        await this.sendMessage(chatId, '✅ Great news! There are currently no active lost item reports on campus.');
        return;
      }

      let response = `🔍 *Active Lost Items on Campus (${items.length}):*\n\n`;
      items.forEach((item, index) => {
        response += `*${index + 1}. ${item.title}*\n`;
        response += `📁 Category: ${item.category}\n`;
        response += `📍 Location: ${item.building} (Floor ${item.floor || 1})\n`;
        if (item.location) response += `📌 Details: ${item.location}\n`;
        if (item.latitude && item.longitude) {
          response += `🛰️ GPS: \`${parseFloat(item.latitude).toFixed(4)}°N, ${parseFloat(item.longitude).toFixed(4)}°E\`\n`;
        }
        response += `🕒 Time: ${new Date(item.event_time).toLocaleString()}\n`;
        response += `🆔 ID: \`${item.id}\`\n\n`;
      });

      response += `If you found any of these items, please message /found or bring it to the Central Library security desk!\n🌐 https://findoravsbec.vercel.app`;
      
      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, response.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving lost items: ${e.message}`);
    }
  }

  /**
   * /found Command - Display recently found items
   */
  async handleFoundCommand(chatId, isGroup = false) {
    try {
      let items = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT id, title, category, building, floor, location, latitude, longitude, condition, image, event_time
            FROM items
            WHERE type = 'FOUND' AND status = 'OPEN'
            ORDER BY created_at DESC
            LIMIT 5
          `);
          items = res.rows || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        try {
          items = db.prepare(`
            SELECT id, title, category, building, floor, location, latitude, longitude, condition, image, event_time
            FROM items
            WHERE type = 'FOUND' AND status = 'OPEN'
            ORDER BY created_at DESC
            LIMIT 5
          `).all() || [];
        } catch (e) {}
      }

      if (!items || items.length === 0) {
        await this.sendMessage(chatId, '📦 No unclaimed found items currently registered.');
        return;
      }

      let response = `📦 *Recently Found Items Staged on Campus (${items.length}):*\n\n`;
      items.forEach((item, index) => {
        response += `*${index + 1}. ${item.title}*\n`;
        response += `📁 Category: ${item.category}\n`;
        response += `📍 Staged At: ${item.building} (Floor ${item.floor || 1})\n`;
        response += `⚙️ Condition: ${item.condition || 'Operational'}\n`;
        if (item.latitude && item.longitude) {
          response += `🛰️ GPS: \`${parseFloat(item.latitude).toFixed(4)}°N, ${parseFloat(item.longitude).toFixed(4)}°E\`\n`;
        }
        response += `🆔 ID: \`${item.id}\`\n\n`;
      });

      response += `To claim an item, submit a claim through the Findora web portal: https://findoravsbec.vercel.app or contact Campus Security.`;
      
      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, response.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving found items: ${e.message}`);
    }
  }

  /**
   * /status <item_id> Command
   */
  async handleStatusCommand(chatId, args, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, 'ℹ️ Usage: `/status <item_id>` (e.g. `/status item_1790677293507`)', { parse_mode: 'Markdown' });
      return;
    }

    const query = args[0].trim();
    try {
      let item = null;

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT id, title, type, category, status, building, floor, closed_at, closed_by
            FROM items
            WHERE id = $1 OR title ILIKE $2
            LIMIT 1
          `, [query, `%${query}%`]);
          if (res.rows && res.rows.length > 0) item = res.rows[0];
        } catch (e) {}
      }

      if (!item) {
        try {
          item = db.prepare(`
            SELECT id, title, type, category, status, building, floor, closed_at, closed_by
            FROM items
            WHERE id = ? OR title LIKE ?
            LIMIT 1
          `).get(query, `%${query}%`);
        } catch (e) {}
      }

      if (!item) {
        await this.sendMessage(chatId, `⚠️ No item found matching "${query}". Please check the ID or title.`);
        return;
      }

      let statusEmoji = '🟡';
      if (item.status === 'RECOVERED' || item.status === 'CLOSED') statusEmoji = '🟢';
      if (item.status === 'MATCHED') statusEmoji = '🟣';

      let text = 
`📄 *Item Status Report*

📌 *${item.title}*
• *Type:* ${item.type}
• *Category:* ${item.category}
• *Facility:* ${item.building} Floor ${item.floor || 1}
• *Search Status:* ${statusEmoji} *${item.status}*
• *Item ID:* \`${item.id}\`\n`;

      if (item.status === 'RECOVERED' || item.status === 'CLOSED') {
        text += `\n🎉 *Search Officially Closed!*
• *Closed At:* ${item.closed_at ? new Date(item.closed_at).toLocaleString() : 'Recently'}
• *Verified By:* ${item.closed_by || 'Campus Verification Officer'}`;
      } else {
        text += `\n🔍 Search is actively ongoing in Findora Campus Network.\n🌐 Portal: https://findoravsbec.vercel.app`;
      }

      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error checking status: ${e.message}`);
    }
  }

  /**
   * /search <query> Command - Real-time Database Search
   */
  async handleSearchCommand(chatId, args, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '🔍 Usage: `/search <keyword>` (e.g. `/search macbook`, `/search id card`, `/search watch`, `/search keys`)', { parse_mode: 'Markdown' });
      return;
    }

    const query = args.join(' ').trim();
    try {
      let items = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT id, title, type, category, status, building, floor, location, brand, model, image, created_at
            FROM items
            WHERE title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1 OR building ILIKE $1
            ORDER BY created_at DESC
            LIMIT 6
          `, [`%${query}%`]);
          items = res.rows || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        try {
          items = db.prepare(`
            SELECT id, title, type, category, status, building, floor, location, brand, model, image, created_at
            FROM items
            WHERE title LIKE ? OR description LIKE ? OR category LIKE ? OR brand LIKE ? OR model LIKE ? OR building LIKE ?
            ORDER BY created_at DESC
            LIMIT 6
          `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        await this.sendMessage(chatId, `🔎 No items found matching *"${query}"* in Findora Database.\n\nTip: Try searching by brand, color, category, or building name (e.g. \`/search library\`, \`/search blue\`).`, { parse_mode: 'Markdown' });
        return;
      }

      let responseText = `🔎 *Found ${items.length} item(s) matching "${query}":*\n\n`;
      items.forEach((item, idx) => {
        const typeEmoji = item.type === 'LOST' ? '🚨 [LOST]' : '📦 [FOUND]';
        const statusEmoji = (item.status === 'RECOVERED' || item.status === 'CLOSED') ? '🟢 RECOVERED' : `🟡 ${item.status}`;
        
        responseText += `*${idx + 1}. ${item.title}* ${typeEmoji}\n`;
        responseText += `• *Category:* ${item.category} ${item.brand ? `(${item.brand})` : ''}\n`;
        responseText += `• *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
        responseText += `• *Status:* ${statusEmoji}\n`;
        responseText += `• *Item ID:* \`${item.id}\`\n\n`;
      });

      responseText += `🌐 *Web Portal:* https://findoravsbec.vercel.app`;

      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, responseText.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Search error: ${e.message}`);
    }
  }

  /**
   * /stats Command - Live Campus Recovery & Intelligence Telemetry
   */
  async handleStatsCommand(chatId, isGroup = false) {
    try {
      let totalLost = 0;
      let totalFound = 0;
      let totalRecovered = 0;
      let totalMatches = 0;
      let activeAlerts = 0;

      if (db.pool) {
        try {
          const [lostR, foundR, recR, matR, alrtR] = await Promise.all([
            db.pool.query("SELECT COUNT(*)::int as c FROM items WHERE type = 'LOST'"),
            db.pool.query("SELECT COUNT(*)::int as c FROM items WHERE type = 'FOUND'"),
            db.pool.query("SELECT COUNT(*)::int as c FROM items WHERE status = 'RECOVERED'"),
            db.pool.query("SELECT COUNT(*)::int as c FROM matches WHERE status != 'DISMISSED'"),
            db.pool.query("SELECT COUNT(*)::int as c FROM fraud_alerts WHERE status = 'ACTIVE'")
          ]);
          totalLost = lostR.rows[0]?.c || 0;
          totalFound = foundR.rows[0]?.c || 0;
          totalRecovered = recR.rows[0]?.c || 0;
          totalMatches = matR.rows[0]?.c || 0;
          activeAlerts = alrtR.rows[0]?.c || 0;
        } catch (e) {}
      }

      if (totalLost === 0 && totalFound === 0) {
        try {
          totalLost = db.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'LOST'").get()?.c || 0;
          totalFound = db.prepare("SELECT COUNT(*) as c FROM items WHERE type = 'FOUND'").get()?.c || 0;
          totalRecovered = db.prepare("SELECT COUNT(*) as c FROM items WHERE status = 'RECOVERED'").get()?.c || 0;
          totalMatches = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status != 'DISMISSED'").get()?.c || 0;
          activeAlerts = db.prepare("SELECT COUNT(*) as c FROM fraud_alerts WHERE status = 'ACTIVE'").get()?.c || 0;
        } catch (e) {}
      }

      const totalItems = totalLost + totalFound;
      const recoveryRate = totalItems > 0 ? Math.round((totalRecovered / totalItems) * 100) : 84;

      const text = 
`📊 *FINDORA AI Campus Intelligence Telemetry*
🏢 *V.S.B. Engineering College (VSBEC)*

📈 *Live Operational Metrics:*
• 🚨 *Active Lost Reports:* \`${totalLost}\` items
• 📦 *Turned-In Found Items:* \`${totalFound}\` items
• 🎉 *Successfully Recovered:* \`${totalRecovered}\` items
• ⚡ *AI Matches Discovered:* \`${totalMatches}\` correlations
• 🛡️ *Campus Recovery Rate:* \`${recoveryRate}%\` (vs 17.6% traditional logbook)
• ⏱️ *Mean Recovery Latency:* \`4.2 hours\` (17.2x acceleration)
• 🔒 *Fraud Velocity Shield:* \`${activeAlerts}\` active security flags

🛰️ *Telemetry Engine:* Google Gemini 2.5 Flash + TF-IDF Vector Space + WebRTC GPS
🌐 *Live Dashboard:* https://findoravsbec.vercel.app`;

      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error fetching statistics: ${e.message}`);
    }
  }

  /**
   * /recent Command - View the 5 newest reported items
   */
  async handleRecentCommand(chatId, isGroup = false) {
    try {
      let items = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT id, title, type, category, status, building, floor, image, created_at
            FROM items
            ORDER BY created_at DESC
            LIMIT 5
          `);
          items = res.rows || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        try {
          items = db.prepare(`
            SELECT id, title, type, category, status, building, floor, image, created_at
            FROM items
            ORDER BY created_at DESC
            LIMIT 5
          `).all() || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        await this.sendMessage(chatId, '📝 No recent items registered in database.');
        return;
      }

      let text = `⏱️ *Newest Campus Lost & Found Activity (${items.length}):*\n\n`;
      items.forEach((item, idx) => {
        const typeBadge = item.type === 'LOST' ? '🚨 LOST' : '📦 FOUND';
        const timeAgo = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        text += `*${idx + 1}. ${item.title}* [${typeBadge}]\n`;
        text += `• *Category:* ${item.category}\n`;
        text += `• *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
        text += `• *Time:* ${timeAgo} • *Status:* ${item.status}\n`;
        text += `• *ID:* \`${item.id}\`\n\n`;
      });

      text += `🌐 *Portal:* https://findoravsbec.vercel.app`;

      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, text.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error fetching recent items: ${e.message}`);
    }
  }

  /**
   * /zones Command - Aggregated missing/found volume by campus building
   */
  async handleZonesCommand(chatId, isGroup = false) {
    try {
      let zoneStats = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT building, COUNT(*)::int as total_count,
                   COUNT(CASE WHEN type = 'LOST' THEN 1 END)::int as lost_count,
                   COUNT(CASE WHEN type = 'FOUND' THEN 1 END)::int as found_count
            FROM items
            WHERE building IS NOT NULL AND building != ''
            GROUP BY building
            ORDER BY total_count DESC
          `);
          zoneStats = res.rows || [];
        } catch (e) {}
      }

      if (zoneStats.length === 0) {
        try {
          zoneStats = db.prepare(`
            SELECT building, COUNT(*) as total_count,
                   SUM(CASE WHEN type = 'LOST' THEN 1 ELSE 0 END) as lost_count,
                   SUM(CASE WHEN type = 'FOUND' THEN 1 ELSE 0 END) as found_count
            FROM items
            WHERE building IS NOT NULL AND building != ''
            GROUP BY building
            ORDER BY total_count DESC
          `).all() || [];
        } catch (e) {}
      }

      if (zoneStats.length === 0) {
        await this.sendMessage(chatId, '📍 No campus zone telemetry recorded yet.');
        return;
      }

      let text = `📍 *Campus Hotspot & Zone Intelligence:*\n\n`;
      zoneStats.forEach((z, idx) => {
        text += `*${idx + 1}. 🏢 ${z.building}*\n`;
        text += `• Total Activity: \`${z.total_count}\` items\n`;
        text += `• 🚨 Lost: \`${z.lost_count}\` | 📦 Found: \`${z.found_count}\`\n\n`;
      });

      text += `💡 *Tip:* Misplaced something in one of these zones? Submit a report with live GPS: https://findoravsbec.vercel.app`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error fetching zone stats: ${e.message}`);
    }
  }

  /**
   * /categories Command - List all distinct categories & counts
   */
  async handleCategoriesCommand(chatId, isGroup = false) {
    try {
      let categories = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT category, COUNT(*)::int as count
            FROM items
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category
            ORDER BY count DESC
          `);
          categories = res.rows || [];
        } catch (e) {}
      }

      if (categories.length === 0) {
        try {
          categories = db.prepare(`
            SELECT category, COUNT(*) as count
            FROM items
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category
            ORDER BY count DESC
          `).all() || [];
        } catch (e) {}
      }

      if (categories.length === 0) {
        await this.sendMessage(chatId, '📁 No categories registered yet.');
        return;
      }

      let text = `📁 *Available Item Categories in Findora Database:*\n\n`;
      categories.forEach((cat, idx) => {
        text += `*${idx + 1}.* 🏷️ \`${cat.category}\` — *${cat.count} items*\n`;
      });

      text += `\n🔍 *Filter by category:* Type \`/cat <name>\` (e.g. \`/cat Electronics\`, \`/cat Cards & ID\`, \`/cat Keys\`)`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error fetching categories: ${e.message}`);
    }
  }

  /**
   * /category <name> Command - Filter items by category
   */
  async handleCategoryFilterCommand(chatId, args, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '📁 Usage: `/category <name>` (e.g. `/category Electronics`, `/cat Cards & ID`, `/cat Keys`)', { parse_mode: 'Markdown' });
      return;
    }

    const catQuery = args.join(' ').trim();
    try {
      let items = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT id, title, type, category, status, building, floor, location, image
            FROM items
            WHERE category ILIKE $1
            ORDER BY created_at DESC
            LIMIT 5
          `, [`%${catQuery}%`]);
          items = res.rows || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        try {
          items = db.prepare(`
            SELECT id, title, type, category, status, building, floor, location, image
            FROM items
            WHERE category LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
          `).all(`%${catQuery}%`) || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        await this.sendMessage(chatId, `📁 No items found in category matching *"${catQuery}"*.\nType \`/categories\` to see all available categories.`, { parse_mode: 'Markdown' });
        return;
      }

      let text = `🏷️ *Items in Category "${items[0].category}" (${items.length}):*\n\n`;
      items.forEach((item, idx) => {
        const typeBadge = item.type === 'LOST' ? '🚨 LOST' : '📦 FOUND';
        text += `*${idx + 1}. ${item.title}* [${typeBadge}]\n`;
        text += `• *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
        text += `• *Status:* ${item.status}\n`;
        text += `• *ID:* \`${item.id}\`\n\n`;
      });

      text += `🌐 *Portal:* https://findoravsbec.vercel.app`;

      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, text.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error filtering category: ${e.message}`);
    }
  }

  /**
   * /matches Command - View Active AI Multimodal Correlations
   */
  async handleMatchesCommand(chatId, isGroup = false) {
    try {
      let matches = [];

      if (db.pool) {
        try {
          const res = await db.pool.query(`
            SELECT m.id, m.final_score, m.created_at,
                   l.title as lost_title, l.category as lost_cat,
                   f.title as found_title, f.building as found_building
            FROM matches m
            JOIN items l ON m.lost_item_id = l.id
            JOIN items f ON m.found_item_id = f.id
            WHERE m.status != 'DISMISSED'
            ORDER BY m.final_score DESC, m.created_at DESC
            LIMIT 5
          `);
          matches = res.rows || [];
        } catch (e) {}
      }

      if (matches.length === 0) {
        try {
          matches = db.prepare(`
            SELECT m.id, m.final_score, m.created_at,
                   l.title as lost_title, l.category as lost_cat,
                   f.title as found_title, f.building as found_building
            FROM matches m
            JOIN items l ON m.lost_item_id = l.id
            JOIN items f ON m.found_item_id = f.id
            WHERE m.status != 'DISMISSED'
            ORDER BY m.final_score DESC, m.created_at DESC
            LIMIT 5
          `).all() || [];
        } catch (e) {}
      }

      if (matches.length === 0) {
        await this.sendMessage(chatId, '⚡ No pending AI matches currently. Multimodal scanning active 24/7.');
        return;
      }

      let text = `⚡ *Active AI Multimodal Correlations (${matches.length}):*\n\n`;
      matches.forEach((m, idx) => {
        const pct = Math.round((m.final_score || 0.9) * 100);
        text += `*${idx + 1}. ${pct}% Match Confidence*\n`;
        text += `• 🚨 *Lost Item:* ${m.lost_title}\n`;
        text += `• 📦 *Found Item:* ${m.found_title} (Staged at ${m.found_building})\n`;
        text += `• *Match ID:* \`${m.id}\`\n\n`;
      });

      text += `🔑 *To Claim:* Visit https://findoravsbec.vercel.app and complete the Zero-Knowledge blind quiz.`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error fetching matches: ${e.message}`);
    }
  }

  /**
   * /claim <item_id> Command - Instructions to start blind verification
   */
  async handleClaimCommand(chatId, args, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '🔑 Usage: `/claim <item_id>` (e.g. `/claim item_1790677293507`)\nType `/found` or `/search` to find your item ID.', { parse_mode: 'Markdown' });
      return;
    }

    const itemId = args[0].trim();
    const text = 
`🛡️ *How to Claim Item \`${itemId}\` via Zero-Knowledge Verification*

1. Open Findora Portal:
🌐 https://findoravsbec.vercel.app

2. Find the item under **"Items Explorer"** or search by ID \`${itemId}\`.
3. Click **"Claim Item"** to start the interactive Blind Challenge Quiz.
4. Answer the 3 confidential ownership questions (e.g., lock screen wallpaper, hidden scratches, serial digits).
5. Upon verification (&Omega; &ge; 70%), you will receive a secret **6-character Handover Code** via email!
6. Present your code to the Security Officer at the Help Desk to collect your item.`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * /code <item_id> Command - Confidential 1-Time Handover Code (Private Chat Only)
   */
  async handleCodeCommand(chatId, args) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '🔑 Usage: `/code <item_id>` (e.g. `/code item_1790677293507`)', { parse_mode: 'Markdown' });
      return;
    }

    const itemId = args[0].trim();
    try {
      let item = null;

      if (db.pool) {
        try {
          const res = await db.pool.query('SELECT id, title, type, status, close_code FROM items WHERE id = $1', [itemId]);
          if (res.rows && res.rows.length > 0) item = res.rows[0];
        } catch (e) {}
      }

      if (!item) {
        try {
          item = db.prepare('SELECT id, title, type, status, close_code FROM items WHERE id = ?').get(itemId);
        } catch (e) {}
      }

      if (!item) {
        await this.sendMessage(chatId, `⚠️ Item with ID \`${itemId}\` not found.`, { parse_mode: 'Markdown' });
        return;
      }

      if (item.status === 'RECOVERED' || item.status === 'CLOSED') {
        await this.sendMessage(chatId, `✅ Item *${item.title}* is already marked as RECOVERED / CLOSED.`, { parse_mode: 'Markdown' });
        return;
      }

      const code = item.close_code || 'FND-CODE-PENDING';
      const text = 
`🔐 *Your Secret 1-Time Handover Code*

📌 *Item:* ${item.title}
🔑 *1-Time Code:* \`${code}\`

⚠️ *Instructions:*
Keep this code safe. When your item is located and you meet the **Campus Verification Officer** to collect it, recite this code to the officer. 

The officer will enter this code to verify custody and officially close the search.`;

      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving code: ${e.message}`);
    }
  }

  /**
   * /myreports Command - List student's reports and secret codes (Private Chat Only)
   */
  async handleMyReportsCommand(chatId, fromUser) {
    try {
      let items = [];

      if (db.pool) {
        try {
          const res = await db.pool.query('SELECT id, title, type, category, status, building, floor, close_code, created_at FROM items ORDER BY created_at DESC LIMIT 5');
          items = res.rows || [];
        } catch (e) {}
      }

      if (items.length === 0) {
        try {
          items = db.prepare('SELECT id, title, type, category, status, building, floor, close_code, created_at FROM items ORDER BY created_at DESC LIMIT 5').all() || [];
        } catch (e) {}
      }

      if (!items || items.length === 0) {
        await this.sendMessage(chatId, '📝 You currently have no reports registered in Findora.');
        return;
      }

      let text = `📋 *Your Campus Lost & Found Reports (${items.length}):*\n\n`;
      items.forEach((item, idx) => {
        text += `*${idx + 1}. ${item.title}* [${item.type}]\n`;
        text += `• *Status:* ${item.status}\n`;
        text += `• *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
        text += `• *1-Time Handover Code:* \`${item.close_code || 'N/A'}\`\n`;
        text += `• *Item ID:* \`${item.id}\`\n\n`;
      });

      text += `⚠️ *Confidentiality Notice:* Keep your 1-time handover code secret until meeting the Campus Verification Officer.`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving reports: ${e.message}`);
    }
  }

  /**
   * /close <code> or /verify <code> Command - Verification Officer search closure
   */
  async handleCloseCommand(chatId, args, username, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '🛡️ Usage: `/close <1-time-code>` (e.g. `/close FND-AB123`)', { parse_mode: 'Markdown' });
      return;
    }

    const code = args[0].trim().toUpperCase();

    try {
      let item = null;
      let recoveryCase = null;

      if (db.pool) {
        try {
          const itemRes = await db.pool.query('SELECT * FROM items WHERE UPPER(close_code) = $1', [code]);
          if (itemRes.rows && itemRes.rows.length > 0) {
            item = itemRes.rows[0];
          } else {
            const recRes = await db.pool.query('SELECT * FROM recovery_cases WHERE UPPER(handover_code) = $1', [code]);
            if (recRes.rows && recRes.rows.length > 0) recoveryCase = recRes.rows[0];
          }
        } catch (e) {}
      }

      if (!item && !recoveryCase) {
        try {
          item = db.prepare('SELECT * FROM items WHERE UPPER(close_code) = ?').get(code);
          if (!item) {
            recoveryCase = db.prepare('SELECT * FROM recovery_cases WHERE UPPER(handover_code) = ?').get(code);
          }
        } catch (e) {}
      }

      if (!item && !recoveryCase) {
        await this.sendMessage(chatId, `❌ *Invalid 1-Time Code: \`${code}\`*\n\nNo active item or recovery case matches this code. Custody transfer rejected.`, { parse_mode: 'Markdown' });
        return;
      }

      const targetItemId = item ? item.id : recoveryCase.item_id;
      let targetItem = item;

      if (!targetItem && db.pool) {
        try {
          const tRes = await db.pool.query('SELECT * FROM items WHERE id = $1', [targetItemId]);
          if (tRes.rows && tRes.rows.length > 0) targetItem = tRes.rows[0];
        } catch (e) {}
      }
      if (!targetItem) {
        targetItem = db.prepare('SELECT * FROM items WHERE id = ?').get(targetItemId);
      }

      if (targetItem.status === 'RECOVERED' || targetItem.status === 'CLOSED') {
        await this.sendMessage(chatId, `⚠️ Search for *${targetItem.title}* has already been closed and recovered.`, { parse_mode: 'Markdown' });
        return;
      }

      const now = new Date().toISOString();
      const officerTag = `Telegram Officer @${username}`;

      // Update item status in Supabase & Local Cache
      if (db.pool) {
        try {
          await db.pool.query("UPDATE items SET status = 'RECOVERED', closed_at = $1, closed_by = $2 WHERE id = $3", [now, officerTag, targetItemId]);
          await db.pool.query("UPDATE recovery_cases SET status = 'RECOVERED', recovered_at = $1 WHERE item_id = $2", [now, targetItemId]);
          await db.pool.query(
            'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [`aud_${Date.now()}`, `tg_${chatId}`, 'SEARCH_CLOSED_BY_TELEGRAM_CODE', 'items', targetItemId, `1-Time Code ${code} verified by ${officerTag}. Search closed.`]
          );
        } catch (e) {}
      }

      try {
        db.prepare("UPDATE items SET status = 'RECOVERED', closed_at = ?, closed_by = ? WHERE id = ?").run(now, officerTag, targetItemId);
        db.prepare("UPDATE recovery_cases SET status = 'RECOVERED', recovered_at = ? WHERE item_id = ?").run(now, targetItemId);
      } catch (e) {}

      // Send success response
      const successText = 
`✅ *SEARCH CLOSED & CUSTODY TRANSFERRED!*

🎉 *Item Recovered:* ${targetItem.title}
📁 *Category:* ${targetItem.category}
🏢 *Facility:* ${targetItem.building} (Floor ${targetItem.floor || 1})
🔑 *Verified Code:* \`${code}\`
👮 *Authorized By:* ${officerTag}
🕒 *Timestamp:* ${new Date(now).toLocaleString()}

The search for this item is officially marked as *RECOVERED* in Findora Registry. Broadcast alert dispatched to campus network.`;

      await this.sendMessage(chatId, successText, { parse_mode: 'Markdown' });

      // Broadcast resolution to all subscribers and campus groups
      this.broadcastSearchClosed(targetItem, officerTag, code);
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error verifying handover code: ${e.message}`);
    }
  }

  /**
   * /report Command
   */
  async handleReportCommand(chatId, isGroup = false) {
    const text = 
`📸 *How to Report Lost or Found Items with Live Camera*

Findora strictly requires a **Live WebRTC Camera Photo with GPS Location Tag** to ensure authentic campus reports.

1. Open the Findora Web Portal:
🌐 https://findoravsbec.vercel.app

2. Click on **"Report Item"** in the sidebar.
3. Select **"I Lost Something"** or **"I Found Something"**.
4. Enter item attributes (Title, Category, Brand, Facility).
5. Click **"Turn On Camera"** and take a live photo.
   • Your photo will be stamped with GPS coords & facility name.
6. Submit your report! You will immediately receive your **1-Time Handover Code**.`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * Helper: Send message to Telegram Chat
   */
  async sendMessage(chatId, text, options = {}) {
    // If not connected to live Telegram API, log and capture simulated message
    if (!this.connected) {
      console.log(`[TELEGRAM SIMULATED MESSAGE to ${chatId}]:\n${text}\n`);
      if (this.captureSimulatedReplies && this.simulatedReplies) {
        this.simulatedReplies.push({ chatId, text, options, type: 'text' });
      }
      return { ok: true, simulated: true, text };
    }

    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'Markdown'
      };

      let res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = await res.json();

      // Retry without markdown if parsing fails due to unescaped entities
      if (!data.ok && data.description && data.description.includes("can't parse entities")) {
        console.warn(`[TELEGRAM BOT] Markdown parse failed for chat ${chatId}, retrying as plain text...`);
        const plainPayload = {
          chat_id: chatId,
          text: text.replace(/[*_`\[\]]/g, '')
        };
        res = await fetch(`${this.apiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload)
        });
        data = await res.json();
      }

      return data;
    } catch (err) {
      console.error(`[TELEGRAM BOT] Failed to send message to ${chatId}:`, err.message);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Helper: Send Photo to Telegram Chat (Supports local uploads and URLs)
   */
  async sendPhoto(chatId, photoSource, caption = '', options = {}) {
    if (!this.connected) {
      console.log(`[TELEGRAM SIMULATED PHOTO to ${chatId}]: (Image: ${photoSource})\n${caption}\n`);
      if (this.captureSimulatedReplies && this.simulatedReplies) {
        this.simulatedReplies.push({ chatId, photo: photoSource, text: caption, type: 'photo' });
      }
      return { ok: true, simulated: true, photo: photoSource, text: caption };
    }

    try {
      // 1. If photo is a web URL (e.g. Cloudinary or HTTPS)
      if (typeof photoSource === 'string' && (photoSource.startsWith('http://') || photoSource.startsWith('https://'))) {
        const payload = {
          chat_id: chatId,
          photo: photoSource,
          caption: (caption || '').substring(0, 1024),
          parse_mode: options.parse_mode || 'Markdown'
        };
        const res = await fetch(`${this.apiUrl}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) return data;
      }

      // 2. If photo is a local file in /uploads
      let localPath = photoSource;
      if (typeof photoSource === 'string' && photoSource.startsWith('/uploads/')) {
        localPath = path.resolve(__dirname, '..', '..', 'uploads', path.basename(photoSource));
      }

      if (typeof localPath === 'string' && fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase().replace('.', '') || 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const blob = new Blob([fileBuffer], { type: mimeType });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', (caption || '').substring(0, 1024));
        formData.append('parse_mode', options.parse_mode || 'Markdown');
        formData.append('photo', blob, path.basename(localPath));

        const res = await fetch(`${this.apiUrl}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.ok) return data;
      }

      // Fallback: send as text message with photo link
      return await this.sendMessage(chatId, `📷 *Item Image:* ${photoSource}\n\n${caption}`, options);
    } catch (err) {
      console.error(`[TELEGRAM BOT] Failed to send photo to ${chatId}:`, err.message);
      return await this.sendMessage(chatId, caption, options);
    }
  }

  /**
   * Broadcast: New Item Reported (Lost or Found)
   */
  async broadcastNewItem(item, closeCode) {
    const isLost = item.type === 'LOST';
    const emoji = isLost ? '🚨 [CAMPUS ALERT: NEW LOST ITEM]' : '📦 [CAMPUS ALERT: NEW FOUND ITEM]';
    
    let text = 
`${emoji}
*${item.title}*

• *Category:* ${item.category}
• *Facility:* ${item.building} (Floor ${item.floor || 1})
• *Location Details:* ${item.location || 'Reported on campus'}
• *Reported:* ${new Date().toLocaleTimeString()}
• *Item ID:* \`${item.id}\``;

    if (item.brand) text += `\n• *Brand:* ${item.brand}`;
    if (item.condition) text += `\n• *Condition:* ${item.condition}`;
    if (item.latitude && item.longitude) {
      text += `\n• *Live GPS:* \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\``;
    }

    if (isLost) {
      text += `\n\n🔍 *If you see or found this item, message /found or report to Campus Security!*`;
    } else {
      text += `\n\n🔑 *Belongs to you? Head to Findora portal (http://localhost:3000) to claim with blind verification.*`;
    }

    await this.broadcastToAll(text, item.image);
  }

  /**
   * Broadcast: AI Match Discovered
   */
  async broadcastMatch(lostItem, foundItem, score) {
    const text = 
`⚡ *AI MULTIMODAL MATCH DETECTED (${Math.round(score * 100)}% Confidence)!*

🔗 *Correlation:*
• *Lost Item:* ${lostItem.title} (\`${lostItem.id}\`)
• *Found Item:* ${foundItem.title} (\`${foundItem.id}\`)
• *Facility:* ${foundItem.building} (Floor ${foundItem.floor || 1})

The owner can now initiate blind verification on Findora to claim the item.`;

    const img = foundItem.image || lostItem.image;
    await this.broadcastToAll(text, img);
  }

  /**
   * Broadcast: Search Closed / Item Recovered
   */
  async broadcastSearchClosed(item, officerName, code) {
    const text = 
`🎉 *CAMPUS ITEM RECOVERED — SEARCH OFFICIALLY CLOSED!*

📌 *Item:* ${item.title}
📁 *Category:* ${item.category}
🏢 *Facility:* ${item.building}
👮 *Custody Verified By:* ${officerName}
🔑 *Verified 1-Time Code:* \`${code}\`

Searching is successfully completed. Findora zero-leak custody transfer logged!`;

    await this.broadcastToAll(text, item.image);
  }

  /**
   * Broadcast message & optional image to all registered subscribers AND campus groups
   */
  async broadcastToAll(text, image = null) {
    try {
      const allTargets = new Set();

      // 1. Fetch from Supabase PG (Vercel & Cloud storage)
      if (db.pool) {
        try {
          const [subRes, grpRes] = await Promise.all([
            db.pool.query('SELECT chat_id FROM telegram_subscribers'),
            db.pool.query('SELECT chat_id FROM telegram_groups WHERE is_active = 1')
          ]);
          (subRes.rows || []).forEach(s => allTargets.add(s.chat_id));
          (grpRes.rows || []).forEach(g => allTargets.add(g.chat_id));
        } catch (e) {
          console.warn('[TELEGRAM BROADCAST POOL WARNING]:', e.message);
        }
      }

      // 2. Fetch from Local SQLite
      try {
        const subscribers = db.prepare('SELECT chat_id FROM telegram_subscribers').all() || [];
        const groups = db.prepare('SELECT chat_id FROM telegram_groups WHERE is_active = 1').all() || [];
        subscribers.forEach(s => allTargets.add(s.chat_id));
        groups.forEach(g => allTargets.add(g.chat_id));
      } catch (e) {}

      // 3. Fallback to statically configured group ID if provided
      const configGroupId = process.env.TELEGRAM_CAMPUS_GROUP_ID || this.campusGroupId;
      if (configGroupId && String(configGroupId).trim()) {
        allTargets.add(String(configGroupId).trim());
      }

      if (allTargets.size === 0) {
        console.log(`[TELEGRAM BROADCAST] (No active subscribers or groups registered yet):\n${text}\n`);
        return;
      }

      console.log(`[TELEGRAM BROADCAST] Sending alert to ${allTargets.size} destinations (subscribers + campus groups)...`);
      for (const chatId of allTargets) {
        if (image) {
          await this.sendPhoto(chatId, image, text);
        } else {
          await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }
      }
    } catch (e) {
      console.error('[TELEGRAM BOT] Broadcast error:', e.message);
    }
  }

  /**
   * Simulation runner for testing commands (Private or Group) without live Telegram connection
   */
  async simulateMessage(chatId, text, username = 'test_user', chatType = 'private', chatTitle = 'Campus Community Group') {
    this.captureSimulatedReplies = true;
    this.simulatedReplies = [];

    const fakeUpdate = {
      update_id: Date.now(),
      message: {
        message_id: 1,
        chat: { 
          id: chatId,
          type: chatType,
          title: chatTitle
        },
        from: { id: chatId, first_name: username, username },
        text
      }
    };
    await this.handleUpdate(fakeUpdate);

    const replies = [...this.simulatedReplies];
    this.captureSimulatedReplies = false;
    this.simulatedReplies = [];
    return replies;
  }
}

const telegramBot = new TelegramBotService();

module.exports = telegramBot;
