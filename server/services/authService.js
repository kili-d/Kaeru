import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { config } from "../config.js";
import { getDatabase } from "../db/connection.js";
import { DEFAULT_USER_ID, insertAuditEvent } from "../repositories/boardRepository.js";

const scrypt = promisify(scryptCallback);
const PASSWORD_PREFIX = "scrypt";
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 64
};
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const loginAttempts = new Map();

function now() {
  return Date.now();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || "",
    username: user.username || "",
    role: user.role
  };
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function hashVerificationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 10) {
    const error = new Error("Password must be at least 10 characters.");
    error.statusCode = 400;
    throw error;
  }
}

function cleanIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanUsername(value) {
  return String(value || "").trim();
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email || null;
}

function enforceLoginRateLimit(key) {
  const windowMs = 10 * 60 * 1000;
  const limit = 8;
  const timestamp = now();
  const attempt = loginAttempts.get(key);

  if (!attempt || timestamp - attempt.startedAt > windowMs) {
    loginAttempts.set(key, { count: 1, startedAt: timestamp });
    return;
  }

  attempt.count += 1;
  if (attempt.count > limit) {
    const error = new Error("Too many login attempts. Please wait a moment.");
    error.statusCode = 429;
    throw error;
  }
}

function clearLoginRateLimit(key) {
  loginAttempts.delete(key);
}

export async function hashPassword(password) {
  assertPassword(password);
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });

  return [PASSWORD_PREFIX, SCRYPT_PARAMS.N, SCRYPT_PARAMS.r, SCRYPT_PARAMS.p, salt, hash.toString("hex")].join("$");
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [prefix, nValue, rValue, pValue, salt, hashHex] = storedHash.split("$");
  if (prefix !== PASSWORD_PREFIX || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length, {
    N: Number(nValue),
    r: Number(rValue),
    p: Number(pValue)
  });

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hasConfiguredUser() {
  const db = getDatabase();
  const row = db.prepare("SELECT COUNT(*) AS count FROM users WHERE password_hash IS NOT NULL").get();
  return Number(row?.count) > 0;
}

function getPendingVerificationPreview() {
  const db = getDatabase();
  const pendingUser = db
    .prepare(
      `
        SELECT
          id,
          email,
          email_verification_expires_at,
          email_verification_token_hash,
          email_verification_token_preview
        FROM users
        WHERE password_hash IS NOT NULL
          AND email_verified_at IS NULL
        ORDER BY created_at
        LIMIT 1
      `
    )
    .get();

  if (!pendingUser?.id || !pendingUser?.email) return null;
  if (config.isProduction) {
    return {
      email: pendingUser.email || "",
      expiresAt: Number(pendingUser.email_verification_expires_at) || 0,
      pending: true
    };
  }

  const hasReusablePreview =
    pendingUser.email_verification_token_hash &&
    pendingUser.email_verification_token_preview &&
    Number(pendingUser.email_verification_expires_at) > now();

  const verification = hasReusablePreview
    ? {
        token: pendingUser.email_verification_token_preview,
        expiresAt: Number(pendingUser.email_verification_expires_at),
        confirmUrl: `${config.appUrl}/?confirm_email=${encodeURIComponent(pendingUser.email_verification_token_preview)}`
      }
    : createEmailVerification(pendingUser.id);

  return {
    confirmUrl: verification.confirmUrl,
    email: pendingUser.email || "",
    expiresAt: verification.expiresAt,
    pending: true
  };
}

function assertSetupToken(providedToken) {
  if (!config.setupTokenRequired) return;

  if (!config.setupToken) {
    const error = new Error("First-run setup is locked until KAERU_SETUP_TOKEN is configured.");
    error.statusCode = 403;
    throw error;
  }

  const providedHash = createHash("sha256").update(String(providedToken || "")).digest();
  const expectedHash = createHash("sha256").update(config.setupToken).digest();
  if (!timingSafeEqual(providedHash, expectedHash)) {
    const error = new Error("Invalid first-run setup token.");
    error.statusCode = 403;
    throw error;
  }
}

export function getAuthStatus(user = null) {
  const db = getDatabase();
  const pendingVerification = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM users
        WHERE password_hash IS NOT NULL
          AND email_verified_at IS NULL
      `
    )
    .get();

  return {
    allowRegistration: config.allowRegistration,
    setupRequired: !hasConfiguredUser(),
    setupTokenRequired: !hasConfiguredUser() && config.setupTokenRequired,
    verificationRequired: !user && Number(pendingVerification?.count) > 0,
    user: publicUser(user)
  };
}

export function getAuthState(user = null, verification = null) {
  return {
    auth: getAuthStatus(user),
    verification: verification || (!user ? getPendingVerificationPreview() : null)
  };
}

export function getUserBySessionToken(token) {
  if (!token) return null;

  const db = getDatabase();
  const tokenHash = hashSessionToken(token);
  const row = db
    .prepare(
      `
        SELECT users.id, users.email, users.username, users.role, sessions.id AS session_id, sessions.expires_at
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
      `
    )
    .get(tokenHash);

  if (!row || Number(row.expires_at) <= now()) {
    if (row?.session_id) db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }

  const verifiedUser = db
    .prepare("SELECT email_verified_at FROM users WHERE id = ?")
    .get(row.id);
  if (!verifiedUser?.email_verified_at) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }

  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(now(), row.session_id);
  return publicUser(row);
}

export function createSession(userId) {
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const timestamp = now();
  const expiresAt = timestamp + config.sessionDays * 24 * 60 * 60 * 1000;

  db.prepare(
    `
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(`session-${randomUUID()}`, userId, hashSessionToken(token), expiresAt, timestamp, timestamp);

  return { token, expiresAt };
}

export function deleteSession(token) {
  if (!token) return;
  getDatabase().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
}

function createEmailVerification(userId) {
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = now() + EMAIL_VERIFICATION_TTL_MS;

  db.prepare(
    `
      UPDATE users
      SET
        email_verification_token_hash = ?,
        email_verification_token_preview = ?,
        email_verification_expires_at = ?,
        updated_at = ?
      WHERE id = ?
    `
  ).run(tokenHash, config.isProduction ? null : token, expiresAt, now(), userId);

  return {
    token,
    expiresAt,
    confirmUrl: `${config.appUrl}/?confirm_email=${encodeURIComponent(token)}`
  };
}

export async function setupFirstAdmin({ username, email, password, setupToken }) {
  if (hasConfiguredUser()) {
    const error = new Error("First-run setup is already complete.");
    error.statusCode = 403;
    throw error;
  }

  assertSetupToken(setupToken);

  const cleanName = cleanUsername(username);
  if (!cleanName) {
    const error = new Error("Username is required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanMail = cleanEmail(email);
  if (!cleanMail) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const timestamp = now();
  const user = {
    id: DEFAULT_USER_ID,
    username: cleanName,
    email: cleanMail,
    role: "admin"
  };

  getDatabase()
    .prepare(
      `
        INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          username = excluded.username,
          password_hash = excluded.password_hash,
          email_verified_at = NULL,
          email_verification_token_hash = NULL,
          email_verification_token_preview = NULL,
          email_verification_expires_at = NULL,
          role = excluded.role,
          updated_at = excluded.updated_at
      `
    )
    .run(user.id, user.email, user.username, passwordHash, user.role, timestamp, timestamp);

  const verification = createEmailVerification(user.id);

  insertAuditEvent({
    action: "user/setup_admin",
    entityType: "user",
    entityId: user.id,
    userId: user.id
  });

  return {
    user: publicUser(user),
    verification
  };
}

export async function registerUser({ username, email, password }) {
  if (!config.allowRegistration || !hasConfiguredUser()) {
    const error = new Error("Registration is not enabled.");
    error.statusCode = 403;
    throw error;
  }

  const cleanName = cleanUsername(username);
  if (!cleanName) {
    const error = new Error("Username is required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanMail = cleanEmail(email);
  if (!cleanMail) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  const db = getDatabase();
  const passwordHash = await hashPassword(password);
  const timestamp = now();
  const user = {
    id: `user-${randomUUID()}`,
    username: cleanName,
    email: cleanMail,
    role: "user"
  };

  try {
    db.prepare(
      `
        INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).run(user.id, user.email, user.username, passwordHash, user.role, timestamp, timestamp);
  } catch {
    const error = new Error("That username is already in use.");
    error.statusCode = 409;
    throw error;
  }

  insertAuditEvent({
    action: "user/created",
    entityType: "user",
    entityId: user.id,
    userId: user.id
  });

  return {
    user: publicUser(user),
    verification: createEmailVerification(user.id)
  };
}

export async function loginUser({ identifier, password, attemptKey }) {
  const cleanedIdentifier = cleanIdentifier(identifier);
  enforceLoginRateLimit(`${attemptKey}:${cleanedIdentifier}`);

  const db = getDatabase();
  let user = db
    .prepare(
      `
        SELECT id, email, username, password_hash, role, email_verified_at
        FROM users
        WHERE lower(username) = ?
      `
    )
    .get(cleanedIdentifier);

  if (!user) {
    const emailMatches = db
      .prepare(
        `
          SELECT id, email, username, password_hash, role, email_verified_at
          FROM users
          WHERE lower(email) = ?
          ORDER BY created_at DESC
        `
      )
      .all(cleanedIdentifier);

    if (emailMatches.length > 1) {
      const error = new Error("That email belongs to multiple test accounts. Sign in with your username.");
      error.statusCode = 400;
      throw error;
    }

    user = emailMatches[0] || null;
  }

  const validPassword = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !validPassword) {
    const error = new Error("Invalid username or password.");
    error.statusCode = 401;
    throw error;
  }

  if (!user.email_verified_at) {
    const error = new Error("Check your email and confirm your account before logging in.");
    error.statusCode = 403;
    throw error;
  }

  clearLoginRateLimit(`${attemptKey}:${cleanedIdentifier}`);
  insertAuditEvent({
    action: "user/login",
    entityType: "user",
    entityId: user.id,
    userId: user.id
  });

  return publicUser(user);
}

export function confirmEmail(token) {
  const db = getDatabase();
  const tokenHash = hashVerificationToken(String(token || ""));
  const user = db
    .prepare(
      `
        SELECT id, email, username, role, email_verification_expires_at
        FROM users
        WHERE email_verification_token_hash = ?
      `
    )
    .get(tokenHash);

  if (!user) {
    const error = new Error("That confirmation link is invalid.");
    error.statusCode = 400;
    throw error;
  }

  if (Number(user.email_verification_expires_at) <= now()) {
    const error = new Error("That confirmation link has expired.");
    error.statusCode = 400;
    throw error;
  }

  db.prepare(
    `
      UPDATE users
      SET
        email_verified_at = ?,
        email_verification_token_hash = NULL,
        email_verification_token_preview = NULL,
        email_verification_expires_at = NULL,
        updated_at = ?
      WHERE id = ?
    `
  ).run(now(), now(), user.id);

  insertAuditEvent({
    action: "user/email_confirmed",
    entityType: "user",
    entityId: user.id,
    userId: user.id
  });

  return publicUser(user);
}
