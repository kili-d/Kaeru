ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE users ADD COLUMN email_verification_token_hash TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token_hash
  ON users(email_verification_token_hash);
