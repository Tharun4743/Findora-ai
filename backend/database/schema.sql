CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin', 'verification_officer'
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
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'MATCHED', 'CLAIMED', 'VERIFIED', 'RECOVERED', 'CLOSED'
    owner_id TEXT NOT NULL,
    condition TEXT, serial_number TEXT, unique_marks TEXT, damage_details TEXT, hidden_features TEXT, text_vector TEXT, image_hash TEXT, close_code TEXT, closed_at DATETIME, closed_by TEXT,
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
    text_vector TEXT NOT NULL, -- JSON array of semantic embedding tokens
    image_hash TEXT,
    image_features TEXT, -- JSON array of visual feature vectors
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
    explanation TEXT NOT NULL, -- JSON: { why, evidence: [], uncertainty: [] }
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'DISMISSED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY(found_item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    lost_item_id TEXT NOT NULL,
    found_item_id TEXT NOT NULL,
    claimant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION', -- 'PENDING_VERIFICATION', 'VERIFIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
    verification_score REAL DEFAULT 0,
    risk_score REAL DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
    risk_factors TEXT DEFAULT '[]', -- JSON array of string reasons
    verification_details TEXT DEFAULT '{}', -- JSON: { damage_match, sticker_match, unique_attr_match, notes }
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lost_item_id) REFERENCES items(id),
    FOREIGN KEY(found_item_id) REFERENCES items(id),
    FOREIGN KEY(claimant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS claim_questions (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    found_item_id TEXT NOT NULL,
    question_key TEXT NOT NULL, -- 'unique_marks', 'damage_details', 'hidden_features'
    prompt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY(found_item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS claim_answers (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    claimant_answer TEXT NOT NULL,
    confidence_score REAL DEFAULT 0,
    matched INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES claim_questions(id)
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    claimant_id TEXT NOT NULL,
    risk_score REAL NOT NULL,
    severity TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
    alert_type TEXT NOT NULL,
    reasons TEXT NOT NULL, -- JSON array of strings
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'DISMISSED', 'CONFIRMED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(claim_id) REFERENCES claims(id),
    FOREIGN KEY(claimant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recovery_cases (
    id TEXT PRIMARY KEY, -- e.g. 'FR-2026-00091'
    claim_id TEXT NOT NULL UNIQUE,
    item_id TEXT NOT NULL,
    claimant_id TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    handover_code TEXT NOT NULL, -- e.g. 'FND-8492'
    status TEXT NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'HANDOVER_PENDING', 'RECOVERED', 'CLOSED'
    timeline TEXT NOT NULL, -- JSON array of { step, title, timestamp, completed, actor }
    admin_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recovered_at DATETIME,
    FOREIGN KEY(claim_id) REFERENCES claims(id),
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(claimant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'MATCH_ALERT', 'CLAIM_UPDATE', 'HANDOVER_READY', 'FRAUD_ALERT'
    data TEXT, -- JSON payload
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
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