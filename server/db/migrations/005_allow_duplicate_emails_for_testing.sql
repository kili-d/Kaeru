CREATE TABLE users_next (
  id TEXT PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  password_hash TEXT,
  totp_secret TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  email_verified_at INTEGER,
  email_verification_token_hash TEXT,
  email_verification_expires_at INTEGER,
  email_verification_token_preview TEXT
);

INSERT INTO users_next (
  id,
  email,
  username,
  password_hash,
  totp_secret,
  role,
  created_at,
  updated_at,
  email_verified_at,
  email_verification_token_hash,
  email_verification_expires_at,
  email_verification_token_preview
)
SELECT
  id,
  email,
  username,
  password_hash,
  totp_secret,
  role,
  created_at,
  updated_at,
  email_verified_at,
  email_verification_token_hash,
  email_verification_expires_at,
  email_verification_token_preview
FROM users;

DROP TABLE users;
ALTER TABLE users_next RENAME TO users;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token_hash
  ON users(email_verification_token_hash);
