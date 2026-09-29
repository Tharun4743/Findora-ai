const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbUrl = 'postgresql://postgres.dmuyeotwwvquxtchmbcg:Tharun%404743@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const schemaDDL = `
-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. PASSWORD RESETS
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ITEMS
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('LOST', 'FOUND')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT,
    brand TEXT,
    model TEXT,
    image TEXT,
    location TEXT NOT NULL,
    building TEXT NOT NULL,
    floor INTEGER DEFAULT 1,
    latitude REAL,
    longitude REAL,
    event_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'OPEN',
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    condition TEXT,
    serial_number TEXT,
    unique_marks TEXT,
    damage_details TEXT,
    hidden_features TEXT,
    text_vector TEXT,
    image_hash TEXT,
    close_code TEXT,
    closed_at TIMESTAMPTZ,
    closed_by TEXT
);

-- 4. ITEM PRIVATE ATTRIBUTES
CREATE TABLE IF NOT EXISTS item_private_attributes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    serial_number TEXT,
    unique_marks TEXT,
    damage_details TEXT,
    hidden_features TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. EMBEDDINGS
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    text_vector TEXT NOT NULL,
    image_hash TEXT,
    image_features TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. MATCHES
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    lost_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    found_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    final_score REAL NOT NULL,
    visual_score REAL NOT NULL,
    text_score REAL NOT NULL,
    location_score REAL NOT NULL,
    time_score REAL NOT NULL,
    category_score REAL NOT NULL,
    attribute_score REAL NOT NULL,
    explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. CLAIMS
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    lost_item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    found_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    claimant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    verification_score REAL DEFAULT 0,
    risk_score REAL DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW',
    risk_factors TEXT DEFAULT '[]',
    verification_details TEXT DEFAULT '{}',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. CLAIM QUESTIONS
CREATE TABLE IF NOT EXISTS claim_questions (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    found_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. CLAIM ANSWERS
CREATE TABLE IF NOT EXISTS claim_answers (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES claim_questions(id) ON DELETE CASCADE,
    claimant_answer TEXT NOT NULL,
    confidence_score REAL DEFAULT 0,
    matched INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. FRAUD ALERTS
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id TEXT PRIMARY KEY,
    claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
    claimant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_score REAL NOT NULL,
    severity TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    reasons TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. RECOVERY CASES
CREATE TABLE IF NOT EXISTS recovery_cases (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    claimant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_location TEXT NOT NULL,
    handover_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED',
    timeline TEXT NOT NULL,
    admin_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    recovered_at TIMESTAMPTZ
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. TELEGRAM SUBSCRIBERS
CREATE TABLE IF NOT EXISTS telegram_subscribers (
    chat_id TEXT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    role TEXT DEFAULT 'student',
    subscribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. TELEGRAM GROUPS
CREATE TABLE IF NOT EXISTS telegram_groups (
    chat_id TEXT PRIMARY KEY,
    title TEXT,
    type TEXT DEFAULT 'supergroup',
    is_active INTEGER DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;

async function migrate() {
    console.log('🔄 Connecting to Supabase PostgreSQL at aws-0-ap-south-1.pooler.supabase.com...');
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to Supabase!');

    console.log('⚡ Applying full PostgreSQL DDL schema...');
    await client.query(schemaDDL);
    console.log('✅ All 15 PostgreSQL tables verified/created in Supabase!');

    // Seed default users
    const defaultPassword = 'Findora2026!';
    const passwordHash = bcrypt.hashSync(defaultPassword, 8);

    const users = [
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

    for (const u of users) {
        await client.query(`
            INSERT INTO users (id, name, email, password_hash, role, avatar)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (email) DO UPDATE 
            SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, avatar = EXCLUDED.avatar;
        `, [u.id, u.name, u.email.toLowerCase(), passwordHash, u.role, u.avatar]);
        console.log(`👤 Upserted user in Supabase: ${u.email} (${u.role})`);
    }

    // Now copy local SQLite data if present
    const sqlitePath = path.resolve(__dirname, 'findora.db');
    if (require('fs').existsSync(sqlitePath)) {
        try {
            const sqldb = new Database(sqlitePath);
            const items = sqldb.prepare("SELECT * FROM items").all();
            console.log(`📦 Found ${items.length} items in local SQLite. Syncing to Supabase...`);
            
            for (const item of items) {
                // Ensure owner exists or assign to usr_tharun_k
                const ownerId = item.owner_id || 'usr_tharun_k';
                await client.query(`
                    INSERT INTO items (
                        id, type, title, description, category, color, brand, model,
                        image, location, building, floor, latitude, longitude,
                        event_time, created_at, status, owner_id, condition,
                        serial_number, unique_marks, damage_details, hidden_features,
                        text_vector, image_hash, close_code, closed_at, closed_by
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8,
                        $9, $10, $11, $12, $13, $14,
                        $15, $16, $17, $18, $19,
                        $20, $21, $22, $23,
                        $24, $25, $26, $27, $28
                    ) ON CONFLICT (id) DO UPDATE 
                    SET status = EXCLUDED.status, close_code = EXCLUDED.close_code, closed_by = EXCLUDED.closed_by;
                `, [
                    item.id, item.type, item.title, item.description, item.category, item.color, item.brand, item.model,
                    item.image, item.location, item.building, item.floor || 1, item.latitude, item.longitude,
                    item.event_time ? new Date(item.event_time) : new Date(),
                    item.created_at ? new Date(item.created_at) : new Date(),
                    item.status || 'OPEN', ownerId, item.condition,
                    item.serial_number, item.unique_marks, item.damage_details, item.hidden_features,
                    item.text_vector, item.image_hash, item.close_code,
                    item.closed_at ? new Date(item.closed_at) : null, item.closed_by
                ]);
            }
            console.log(`✅ Synced ${items.length} items to Supabase.`);
        } catch (e) {
            console.warn('⚠️ SQLite item copy warning:', e.message);
        }
    }

    // Verify final table count
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('\n📊 ALL SUPABASE PUBLIC TABLES:');
    console.log(res.rows.map(r => `  - ${r.table_name}`).join('\n'));

    const userCount = await client.query("SELECT COUNT(*) FROM users;");
    const itemCount = await client.query("SELECT COUNT(*) FROM items;");
    console.log(`\n🎉 Verification: ${userCount.rows[0].count} users, ${itemCount.rows[0].count} items live in Supabase PostgreSQL!`);

    await client.end();
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
