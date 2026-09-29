-- ====================================================================
-- FINDORA AI • SUPABASE POSTGRESQL SCHEMA & ROLES MIGRATION
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/dmuyeotwwvquxtchmbcg/sql
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'verification_officer')),
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. PASSWORD RESETS TABLE (For Brevo OTP Delivery)
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ITEMS TABLE
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
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MATCHED', 'CLAIMED', 'VERIFIED', 'RECOVERED', 'CLOSED')),
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    condition TEXT
);

-- 4. PRIVATE ATTRIBUTES TABLE (Zero-Knowledge Challenges)
CREATE TABLE IF NOT EXISTS item_private_attributes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    serial_number TEXT,
    unique_marks TEXT,
    damage_details TEXT,
    hidden_features TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. EMBEDDINGS TABLE
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    text_vector TEXT NOT NULL,
    image_hash TEXT,
    image_features TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. MATCHES TABLE
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
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'DISMISSED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    lost_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    found_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    claimant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'VERIFIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
    verification_score REAL DEFAULT 0,
    risk_score REAL DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
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
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    alert_type TEXT NOT NULL,
    reasons TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISMISSED', 'CONFIRMED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. RECOVERY CASES
CREATE TABLE IF NOT EXISTS recovery_cases (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    claimant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_location TEXT NOT NULL,
    handover_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'HANDOVER_PENDING', 'RECOVERED', 'CLOSED')),
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

-- ====================================================================
-- INSERT CONFIGURED USERS WITH ROLES INTO SUPABASE
-- Default password hash corresponds to: Findora2026!
-- ====================================================================

INSERT INTO users (id, name, email, password_hash, role, avatar)
VALUES 
    (
        'usr_tharun_k', 
        'Tharun Kumar', 
        'tharunkumark42007@gmail.com', 
        '$2a$08$2qK31YpZq6Yx7Q6fSjWnSu2ZqWcXxqY6pX0r7nJqKq2V0W7YxZq6a', 
        'admin', 
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    ),
    (
        'usr_siva_k', 
        'Siva Kumar', 
        'sivakumar463703@gmail.com', 
        '$2a$08$2qK31YpZq6Yx7Q6fSjWnSu2ZqWcXxqY6pX0r7nJqKq2V0W7YxZq6a', 
        'verification_officer', 
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    ),
    (
        'usr_santhosh_k', 
        'Kumar Santhosh', 
        'writetokumarsanthosh@gmail.com', 
        '$2a$08$2qK31YpZq6Yx7Q6fSjWnSu2ZqWcXxqY6pX0r7nJqKq2V0W7YxZq6a', 
        'user', 
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    )
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name, avatar = EXCLUDED.avatar;
