require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('./db');
const bcrypt = require('bcryptjs');

const defaultPassword = process.env.ADMIN_PASSWORD || 'Findora2026!';
const passwordHash = bcrypt.hashSync(defaultPassword, 8);

const usersToUpsert = [
  {
    id: 'usr_tharun_k',
    name: 'Tharun Kumar',
    email: 'tharunkumark42007@gmail.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_siva_k',
    name: 'Siva Kumar',
    email: 'sivakumar463703@gmail.com',
    role: 'verification_officer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_santhosh_k',
    name: 'Kumar Santhosh',
    email: 'writetokumarsanthosh@gmail.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_demo_admin',
    name: 'System Admin',
    email: 'admin@findora.local',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
];

console.log('[USER SYNC] Updating users and role-based permissions in FINDORA database...');

for (const u of usersToUpsert) {
  const existing = db.prepare('SELECT id, role FROM users WHERE LOWER(email) = ?').get(u.email.toLowerCase());
  if (existing) {
    db.prepare(`
      UPDATE users 
      SET name = ?, role = ?, avatar = ?, password_hash = ?
      WHERE id = ?
    `).run(u.name, u.role, u.avatar, passwordHash, existing.id);
    console.log(`[USER SYNC] Updated existing user: ${u.email} (Role: ${u.role})`);
  } else {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(u.id, u.name, u.email.toLowerCase(), passwordHash, u.role, u.avatar);
    console.log(`[USER SYNC] Created user: ${u.email} (Role: ${u.role})`);
  }
}

const allUsers = db.prepare('SELECT id, name, email, role FROM users').all();
console.log('\n[ACTIVE USERS IN DATABASE]:');
console.table(allUsers);
