const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize database
const db = require('./database/db');

// Route handlers
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const matchesRoutes = require('./routes/matches');
const claimsRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');
const recoveryRoutes = require('./routes/recovery');
const analyticsRoutes = require('./routes/analytics');
const assistantRoutes = require('./routes/assistant');
const notificationsRoutes = require('./routes/notifications');
const telegramRoutes = require('./routes/telegram');
const telegramBot = require('./services/telegramBot');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'online',
    system: 'FINDORA AI - Autonomous Lost & Found Intelligence Network',
    version: '1.0.0-hackathon-mvp',
    timestamp: new Date().toISOString()
  });
});

// API Routes (support both /api/* and direct /* prefixes)
const mount = (routePath, handler) => {
  app.use(`/api${routePath}`, handler);
  app.use(routePath, handler);
};

mount('/auth', authRoutes);
mount('/items', itemsRoutes);
mount('/matches', matchesRoutes);
mount('/claims', claimsRoutes);
mount('/admin', adminRoutes);
mount('/recovery', recoveryRoutes);
mount('/analytics', analyticsRoutes);
mount('/assistant', assistantRoutes);
mount('/notifications', notificationsRoutes);
mount('/telegram', telegramRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[FINDORA SERVER ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 FINDORA AI Backend Service online at http://localhost:${PORT}`);
    console.log(`🛡️  Blind-Match Ownership Protocol & Risk Engine ready.`);
    console.log(`🤖 Telegram Bot Service (@${telegramBot.botUsername}) starting...`);
    console.log(`=======================================================`);
    telegramBot.init();
  });
} else {
  // On Vercel, Telegram Bot can run via webhooks or background calls
  try {
    telegramBot.init();
  } catch (err) {
    console.warn('[TelegramBot] Serverless init warning:', err.message);
  }
}

module.exports = app;
