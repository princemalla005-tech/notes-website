'use strict';

const config = require('./config');
const { randomToken, sha256Hex, safeEqual } = require('./crypto');

function nowMs() {
  return Date.now();
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    path: '/'
  };
}

function setSessionCookie(res, token, rememberMe) {
  const options = baseCookieOptions();
  if (rememberMe) {
    options.maxAge = config.REMEMBER_ABSOLUTE_MS;
  }
  res.cookie(config.COOKIE_NAME, token, options);
}

function clearSessionCookie(res) {
  res.clearCookie(config.COOKIE_NAME, baseCookieOptions());
}

function hashToken(token) {
  return sha256Hex(token);
}

function createSession(db, userId, options = {}) {
  const token = randomToken(32);
  const tokenHash = hashToken(token);
  const csrfToken = randomToken(32);
  const created = nowMs();
  const remember = options.rememberMe ? 1 : 0;
  const idleMs = remember ? config.REMEMBER_IDLE_MS : config.SESSION_IDLE_MS;
  const absoluteMs = remember ? config.REMEMBER_ABSOLUTE_MS : config.SESSION_ABSOLUTE_MS;

  db.prepare(
    `INSERT INTO sessions (
      token_hash, user_id, csrf_token, created_at, last_seen_at,
      idle_expires_at, absolute_expires_at, remember, ip_hash, ua_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    tokenHash,
    userId,
    csrfToken,
    created,
    created,
    created + idleMs,
    created + absoluteMs,
    remember,
    options.ipHash || null,
    options.uaHash || null
  );

  return {
    token,
    tokenHash,
    csrfToken,
    rememberMe: !!remember,
    absoluteExpiresAt: created + absoluteMs
  };
}

function deleteSessionByHash(db, tokenHash) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

function findSession(db, token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;

  const tokenHash = hashToken(token);
  const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash);
  if (!row) return null;

  const current = nowMs();
  if (current >= row.absolute_expires_at || current >= row.idle_expires_at) {
    deleteSessionByHash(db, tokenHash);
    return null;
  }

  if (current - row.last_seen_at >= config.SESSION_TOUCH_MS) {
    const idleMs = row.remember ? config.REMEMBER_IDLE_MS : config.SESSION_IDLE_MS;
    const nextIdle = Math.min(current + idleMs, row.absolute_expires_at);
    db.prepare('UPDATE sessions SET last_seen_at = ?, idle_expires_at = ? WHERE token_hash = ?')
      .run(current, nextIdle, tokenHash);
    row.last_seen_at = current;
    row.idle_expires_at = nextIdle;
  }

  return row;
}

function destroySession(db, token) {
  if (!token) return;
  deleteSessionByHash(db, hashToken(token));
}

function destroyAllSessions(db, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

function destroyOtherSessions(db, userId, keepTokenHash) {
  if (keepTokenHash) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?')
      .run(userId, keepTokenHash);
  } else {
    destroyAllSessions(db, userId);
  }
}

function cleanupExpiredSessions(db) {
  const current = nowMs();
  const result = db.prepare(
    'DELETE FROM sessions WHERE idle_expires_at <= ? OR absolute_expires_at <= ?'
  ).run(current, current);
  return Number(result.changes || 0);
}

function sessionMiddleware(db) {
  return function attachSession(req, res, next) {
    const cookies = req.cookies || {};
    const token = cookies[config.COOKIE_NAME];
    req.sessionToken = typeof token === 'string' ? token : null;
    req.session = req.sessionToken ? findSession(db, req.sessionToken) : null;
    if (req.sessionToken && !req.session) {
      clearSessionCookie(res);
      req.sessionToken = null;
    }
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.session) {
    res.status(401).json({ error: 'Authentication required.', code: 'unauthenticated' });
    return;
  }
  next();
}

function requireCsrf(req, res, next) {
  if (!req.session) {
    res.status(401).json({ error: 'Authentication required.', code: 'unauthenticated' });
    return;
  }

  const supplied = req.get(config.CSRF_HEADER);
  if (!supplied || !safeEqual(supplied, req.session.csrf_token)) {
    res.status(403).json({ error: 'Invalid or missing CSRF token.', code: 'csrf_failed' });
    return;
  }

  next();
}

module.exports = {
  setSessionCookie,
  clearSessionCookie,
  createSession,
  findSession,
  destroySession,
  destroyAllSessions,
  destroyOtherSessions,
  cleanupExpiredSessions,
  sessionMiddleware,
  requireAuth,
  requireCsrf
};
