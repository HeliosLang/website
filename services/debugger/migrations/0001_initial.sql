CREATE TABLE wallets (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE challenges (id TEXT PRIMARY KEY, address TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE sessions (hash TEXT PRIMARY KEY, wallet TEXT NOT NULL REFERENCES wallets(id), expires INTEGER NOT NULL);
CREATE TABLE api_keys (id TEXT PRIMARY KEY, wallet TEXT NOT NULL REFERENCES wallets(id), name TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE captures (seq INTEGER PRIMARY KEY AUTOINCREMENT, key_id TEXT NOT NULL REFERENCES api_keys(id), capture_id TEXT NOT NULL, object_key TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, expires INTEGER NOT NULL, UNIQUE(key_id, capture_id));
CREATE INDEX capture_feed ON captures(key_id, seq);
CREATE INDEX capture_expiry ON captures(expires);
CREATE TABLE rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
