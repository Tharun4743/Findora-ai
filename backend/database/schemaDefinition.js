// FINDORA AI - Database Schema Definition
// Embedded in JS so it never fails due to missing .sql files in serverless bundles

module.exports = `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
    event_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'OPEN',
    owner_id TEXT NOT NULL,
    condition TEXT,
    serial_number TEXT,
    unique_marks TEXT,
    damage_details TEXT,
    hidden_features TEXT,
    text_vector TEXT,
    image_hash TEXT,
    close_code TEXT,
    closed_at DATETIME,
    closed_by TEXT,
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS item_private_attributes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE,
    serial_number TEXT,
    unique_marks TEXT,
    damage_details TEXT,
    hidden_features TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL UNIQUE,
    text_vector TEXT NOT NULL,
    image_hash TEXT,
    image_features TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    lost_item_id TEXT NOT NULL,
    found_item_id TEXT NOT NULL,
    final_score REAL NOT NULL,
    visual_score REAL NOT NULL,
    text_score REAL NOT NULL,
    location_score REAL NOT NULL,
    time_score REAL NOT NULL,
    category_score REAL NOT NULL,
    attribute_score REAL NOT NULL,
    explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(found_item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    lost_item_id TEXT,
    found_item_id TEXT NOT NULL,
    match_id TEXT,
    claimant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    verification_score REAL,
    risk_score REAL,
    risk_level TEXT,
    risk_factors TEXT,
    verification_details TEXT,
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(found_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(claimant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS claim_questions (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    found_item_id TEXT,
    question_key TEXT NOT NULL,
    prompt TEXT NOT NULL,
    attribute_key TEXT,
    question_text TEXT,
    expected_value_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claim_answers (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    claimant_answer TEXT,
    confidence_score REAL,
    matched INTEGER,
    answer_text TEXT,
    is_correct INTEGER,
    similarity_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES claim_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    claimant_id TEXT,
    user_id TEXT,
    risk_score REAL NOT NULL,
    severity TEXT DEFAULT 'MEDIUM',
    alert_type TEXT DEFAULT 'RISK_ANOMALY',
    reasons TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    action_taken TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recovery_cases (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    claimant_id TEXT NOT NULL,
    pickup_location TEXT,
    handover_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'HANDOVER_PENDING',
    timeline TEXT,
    admin_id TEXT,
    qr_payload TEXT,
    audit_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovered_at DATETIME,
    FOREIGN KEY(claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(claimant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_subscribers (
    chat_id TEXT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    role TEXT DEFAULT 'student',
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_groups (
    chat_id TEXT PRIMARY KEY,
    title TEXT,
    type TEXT DEFAULT 'supergroup',
    is_active INTEGER DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;
