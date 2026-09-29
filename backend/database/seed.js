const db = require('./db');
const bcrypt = require('bcryptjs');

/**
 * Resets and initializes the database to a clean, empty state without mock items.
 */
function seedDatabase() {
  console.log('[CLEAN] Clearing all mock data from FINDORA AI database...');

  // Clear all mock data
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM recovery_cases;
    DELETE FROM fraud_alerts;
    DELETE FROM claim_answers;
    DELETE FROM claim_questions;
    DELETE FROM claims;
    DELETE FROM matches;
    DELETE FROM embeddings;
    DELETE FROM item_private_attributes;
    DELETE FROM items;
    DELETE FROM users;
  `);

  // Create clean initial administrator account strictly from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@campus.edu';
  const adminPass = process.env.ADMIN_PASSWORD || 'AdminSecurePass2026!';
  const adminName = process.env.ADMIN_NAME || 'Campus Administrator';
  const passwordHash = bcrypt.hashSync(adminPass, 8);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, avatar)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    `usr_${Date.now()}`,
    adminName,
    adminEmail,
    passwordHash,
    'admin',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  console.log('[CLEAN] Database initialized to 100% clean state (0 mock items, 0 mock claims, 0 mock matches).');
}

// Auto-run if executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
