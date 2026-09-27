ALTER TABLE api_keys ADD COLUMN encrypted_secret TEXT;
CREATE TABLE cli_logins (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    code TEXT NOT NULL,
    wallet TEXT,
    state TEXT NOT NULL DEFAULT 'pending',
    expires INTEGER NOT NULL
);
CREATE INDEX cli_login_expiry ON cli_logins(expires);
