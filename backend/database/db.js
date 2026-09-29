const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const schemaSql = require('./schemaDefinition');

let Database;
try {
    Database = require('better-sqlite3');
} catch (err) {
    console.warn('[DB] Native better-sqlite3 not loadable in serverless runtime, using in-memory engine');
}

// 1. Configure Supabase PostgreSQL Connection Pool
const supabaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.dmuyeotwwvquxtchmbcg:Tharun%404743@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
let pool = null;

try {
    pool = new Pool({
        connectionString: supabaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });
    console.log('⚡ [SUPABASE] PostgreSQL connection pool initialized.');
} catch (poolErr) {
    console.warn('[SUPABASE] Pool initialization warning:', poolErr.message);
}

// 2. Initialize local SQLite/Memory instance for ultra-fast zero-latency route responses
let dbPath = path.resolve(__dirname, 'findora.db');
if (process.env.VERCEL) {
    dbPath = path.join('/tmp', 'findora.db');
}

let dbInstance = null;
if (Database) {
    try {
        dbInstance = new Database(dbPath);
        try { dbInstance.pragma('journal_mode = WAL'); } catch(e) { dbInstance.pragma('journal_mode = MEMORY'); }
        dbInstance.pragma('foreign_keys = ON');
    } catch (e) {
        try { dbInstance = new Database(':memory:'); } catch(m) {}
    }
}

// Fallback in-memory store if native sqlite binary fails
class InMemoryDb {
    constructor() {
        this.tables = {
            users: [], items: [], item_private_attributes: [], embeddings: [],
            matches: [], claims: [], claim_questions: [], claim_answers: [],
            fraud_alerts: [], recovery_cases: [], notifications: [], audit_logs: [],
            telegram_subscribers: [], telegram_groups: []
        };
    }
    exec() { return this; }
    pragma() { return []; }
    prepare(sql) {
        const self = this;
        const normalized = sql.trim();
        return {
            all(...params) {
                if (/FROM\s+users/i.test(normalized)) return [...self.tables.users];
                if (/FROM\s+items/i.test(normalized)) return [...self.tables.items];
                if (/FROM\s+telegram_groups/i.test(normalized)) return [...self.tables.telegram_groups];
                if (/FROM\s+telegram_subscribers/i.test(normalized)) return [...self.tables.telegram_subscribers];
                if (/FROM\s+notifications/i.test(normalized)) return [...self.tables.notifications];
                if (/FROM\s+claims/i.test(normalized)) return [...self.tables.claims];
                if (/FROM\s+matches/i.test(normalized)) return [...self.tables.matches];
                return [];
            },
            get(...params) {
                if (/count\(\*\)/i.test(normalized)) {
                    if (/FROM\s+users/i.test(normalized)) return { count: self.tables.users.length, c: self.tables.users.length };
                    if (/FROM\s+items/i.test(normalized)) return { count: self.tables.items.length, c: self.tables.items.length };
                    return { count: 0, c: 0 };
                }
                if (/FROM\s+users\s+WHERE/i.test(normalized) && params[0]) {
                    const search = String(params[0]).toLowerCase();
                    return self.tables.users.find(u => u.email.toLowerCase() === search || u.id === search);
                }
                if (/FROM\s+items\s+WHERE/i.test(normalized) && params[0]) {
                    return self.tables.items.find(i => i.id === params[0]);
                }
                if (/FROM\s+users/i.test(normalized)) return self.tables.users[0];
                if (/FROM\s+items/i.test(normalized)) return self.tables.items[0];
                return undefined;
            },
            run(...params) {
                if (/INSERT\s+INTO\s+users/i.test(normalized)) {
                    self.tables.users.push({
                        id: params[0], name: params[1], email: params[2],
                        password_hash: params[3], role: params[4] || 'student'
                    });
                }
                return { changes: 1, lastInsertRowid: Date.now() };
            }
        };
    }
}

const db = dbInstance || new InMemoryDb();

// 3. Write-Through Sync to Supabase PostgreSQL
async function writeToSupabase(sql, params = []) {
    if (!pool) return;
    try {
        let paramIdx = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
        await pool.query(pgSql, params);
    } catch (err) {
        console.warn('[SUPABASE ASYNC WRITE WARNING]:', err.message);
    }
}

// Universal runner: executes in SQLite/Memory AND writes through to Supabase
async function runBoth(sql, params = []) {
    let sqliteRes = null;
    try {
        sqliteRes = db.prepare(sql).run(...params);
    } catch (e) {
        console.warn('[LOCAL DB RUN WARNING]:', e.message);
    }
    if (pool) {
        try {
            let paramIdx = 1;
            const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
            await pool.query(pgSql, params);
        } catch (err) {
            console.warn('[SUPABASE DUAL-WRITE WARNING]:', err.message);
        }
    }
    return sqliteRes;
}

// 4. Initial Sync from Supabase to Local
async function syncFromSupabase() {
    if (!pool) return;
    try {
        // Users
        const usersRes = await pool.query('SELECT * FROM users');
        if (usersRes.rows && usersRes.rows.length > 0) {
            for (const u of usersRes.rows) {
                try {
                    db.prepare(`
                        INSERT OR REPLACE INTO users (id, name, email, password_hash, role, avatar)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(u.id, u.name, u.email.toLowerCase(), u.password_hash, u.role, u.avatar);
                } catch (e) {}
            }
            console.log(`⚡ [SUPABASE SYNC] Loaded ${usersRes.rows.length} users into live memory/cache.`);
        }

        // Items
        const itemsRes = await pool.query('SELECT * FROM items');
        if (itemsRes.rows && itemsRes.rows.length > 0) {
            for (const item of itemsRes.rows) {
                try {
                    db.prepare(`
                        INSERT OR REPLACE INTO items (
                            id, type, title, description, category, color, brand, model,
                            image, location, building, floor, latitude, longitude,
                            event_time, created_at, status, owner_id, condition,
                            serial_number, unique_marks, damage_details, hidden_features,
                            text_vector, image_hash, close_code, closed_at, closed_by
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, ?
                        )
                    `).run(
                        item.id, item.type, item.title, item.description, item.category, item.color, item.brand, item.model,
                        item.image, item.location, item.building, item.floor || 1, item.latitude, item.longitude,
                        item.event_time ? item.event_time.toISOString() : new Date().toISOString(),
                        item.created_at ? item.created_at.toISOString() : new Date().toISOString(),
                        item.status || 'OPEN', item.owner_id || 'usr_tharun_k', item.condition,
                        item.serial_number, item.unique_marks, item.damage_details, item.hidden_features,
                        item.text_vector, item.image_hash, item.close_code,
                        item.closed_at ? item.closed_at.toISOString() : null, item.closed_by
                    );
                } catch (e) {}
            }
            console.log(`⚡ [SUPABASE SYNC] Loaded ${itemsRes.rows.length} items into live memory/cache.`);
        }

        // Matches
        try {
            const matchesRes = await pool.query('SELECT * FROM matches');
            if (matchesRes.rows && matchesRes.rows.length > 0) {
                for (const m of matchesRes.rows) {
                    db.prepare(`
                        INSERT OR REPLACE INTO matches (
                            id, lost_item_id, found_item_id, final_score, visual_score,
                            text_score, location_score, time_score, category_score,
                            attribute_score, explanation, status, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        m.id, m.lost_item_id, m.found_item_id, m.final_score, m.visual_score,
                        m.text_score, m.location_score, m.time_score, m.category_score,
                        m.attribute_score, typeof m.explanation === 'object' ? JSON.stringify(m.explanation) : m.explanation,
                        m.status, m.created_at ? m.created_at.toISOString() : new Date().toISOString()
                    );
                }
                console.log(`⚡ [SUPABASE SYNC] Loaded ${matchesRes.rows.length} matches.`);
            }
        } catch (e) {}

        // Claims
        try {
            const claimsRes = await pool.query('SELECT * FROM claims');
            if (claimsRes.rows && claimsRes.rows.length > 0) {
                for (const c of claimsRes.rows) {
                    db.prepare(`
                        INSERT OR REPLACE INTO claims (
                            id, match_id, lost_item_id, found_item_id, claimant_id,
                            status, verification_score, risk_score, risk_level,
                            risk_factors, verification_details, admin_notes, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        c.id, c.match_id, c.lost_item_id, c.found_item_id, c.claimant_id,
                        c.status, c.verification_score, c.risk_score, c.risk_level,
                        c.risk_factors, c.verification_details, c.admin_notes,
                        c.created_at ? c.created_at.toISOString() : new Date().toISOString(),
                        c.updated_at ? c.updated_at.toISOString() : new Date().toISOString()
                    );
                }
                console.log(`⚡ [SUPABASE SYNC] Loaded ${claimsRes.rows.length} claims.`);
            }
        } catch (e) {}

        // Recovery Cases
        try {
            const rcRes = await pool.query('SELECT * FROM recovery_cases');
            if (rcRes.rows && rcRes.rows.length > 0) {
                for (const rc of rcRes.rows) {
                    db.prepare(`
                        INSERT OR REPLACE INTO recovery_cases (
                            id, claim_id, item_id, claimant_id, pickup_location,
                            handover_code, status, timeline, admin_id, created_at, recovered_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        rc.id, rc.claim_id, rc.item_id, rc.claimant_id, rc.pickup_location,
                        rc.handover_code, rc.status, typeof rc.timeline === 'object' ? JSON.stringify(rc.timeline) : rc.timeline,
                        rc.admin_id, rc.created_at ? rc.created_at.toISOString() : new Date().toISOString(),
                        rc.recovered_at ? rc.recovered_at.toISOString() : null
                    );
                }
                console.log(`⚡ [SUPABASE SYNC] Loaded ${rcRes.rows.length} recovery cases.`);
            }
        } catch (e) {}

        // Fraud Alerts
        try {
            const faRes = await pool.query('SELECT * FROM fraud_alerts');
            if (faRes.rows && faRes.rows.length > 0) {
                for (const fa of faRes.rows) {
                    db.prepare(`
                        INSERT OR REPLACE INTO fraud_alerts (
                            id, claim_id, claimant_id, risk_score, severity, alert_type, reasons, status, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        fa.id, fa.claim_id, fa.claimant_id, fa.risk_score, fa.severity, fa.alert_type,
                        typeof fa.reasons === 'object' ? JSON.stringify(fa.reasons) : fa.reasons,
                        fa.status, fa.created_at ? fa.created_at.toISOString() : new Date().toISOString()
                    );
                }
                console.log(`⚡ [SUPABASE SYNC] Loaded ${faRes.rows.length} fraud alerts.`);
            }
        } catch (e) {}

        // Notifications
        try {
            const notifsRes = await pool.query('SELECT * FROM notifications');
            if (notifsRes.rows && notifsRes.rows.length > 0) {
                for (const n of notifsRes.rows) {
                    db.prepare(`
                        INSERT OR REPLACE INTO notifications (
                            id, user_id, type, title, message, data, read, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        n.id, n.user_id, n.type, n.title, n.message,
                        typeof n.data === 'object' ? JSON.stringify(n.data) : n.data,
                        n.read || 0, n.created_at ? n.created_at.toISOString() : new Date().toISOString()
                    );
                }
                console.log(`⚡ [SUPABASE SYNC] Loaded ${notifsRes.rows.length} notifications.`);
            }
        } catch (e) {}

        // Audit Logs
        try {
            const audRes = await pool.query('SELECT * FROM audit_logs');
            if (audRes.rows && audRes.rows.length > 0) {
                for (const a of audRes.rows) {
                    db.prepare(`
                        INSERT OR REPLACE INTO audit_logs (
                            id, user_id, action, target_type, target_id, details, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        a.id, a.user_id, a.action, a.target_type, a.target_id, a.details,
                        a.created_at ? a.created_at.toISOString() : new Date().toISOString()
                    );
                }
                console.log(`⚡ [SUPABASE SYNC] Loaded ${audRes.rows.length} audit logs.`);
            }
        } catch (e) {}

    } catch (err) {
        console.warn('⚠️ [SUPABASE SYNC WARNING]:', err.message);
    }
}

// 5. Initialize Schema & Seeds
function initDB() {
    try {
        db.exec(schemaSql);
    } catch (e) {
        console.warn('[DB Init Schema Warning]:', e.message);
    }

    // Ensure initial users exist in local cache as fallback
    try {
        const userCheck = db.prepare("SELECT count(*) as c FROM users").get();
        const userCount = userCheck ? (userCheck.c || userCheck.count || 0) : 0;
        
        if (userCount === 0) {
            const bcrypt = require('bcryptjs');
            const defaultPassword = 'Findora2026!';
            const passwordHash = bcrypt.hashSync(defaultPassword, 8);

            const insertUser = db.prepare(`
                INSERT OR IGNORE INTO users (id, name, email, password_hash, role, avatar)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            insertUser.run(
                'usr_tharun_k', 'Tharun Kumar', 'tharunkumark42007@gmail.com',
                passwordHash, 'admin',
                'https://i.pravatar.cc/150?img=12'
            );
            insertUser.run(
                'usr_siva_k', 'Siva Kumar', 'sivakumar463703@gmail.com',
                passwordHash, 'verification_officer',
                'https://i.pravatar.cc/150?img=15'
            );
            insertUser.run(
                'usr_santhosh_k', 'Kumar Santhosh', 'writetokumarsanthosh@gmail.com',
                passwordHash, 'student',
                'https://i.pravatar.cc/150?img=20'
            );
            insertUser.run(
                'usr_demo_admin', 'System Admin', 'admin@findora.local',
                passwordHash, 'admin',
                'https://i.pravatar.cc/150?img=68'
            );
        }
    } catch (e) {}

    // Trigger asynchronous sync from Supabase
    syncFromSupabase().catch(e => console.warn('[Supabase Sync]:', e.message));
}

initDB();

// Attach Supabase pool & helpers
db.pool = pool;
db.writeToSupabase = writeToSupabase;
db.runBoth = runBoth;
db.syncFromSupabase = syncFromSupabase;

module.exports = db;
