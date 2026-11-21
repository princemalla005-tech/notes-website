'use strict';

const express = require('express');
const config = require('../config');
const {
  hashPassword,
  verifyPassword,
  needsRehash,
  sha256Hex
} = require('../crypto');
const sessions = require('../sessions');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  parse
} = require('../validation');
const { HttpError, asyncHandler } = require('../errors');

function clientIpHash(req) {
  return sha256Hex(`ip:${req.ip || 'unknown'}`);
}

function userAgentHash(req) {
  const value = req.get('user-agent') || 'unknown';
  return sha256Hex(`ua:${value.slice(0, 400)}`);
}

function createAuthRouter({ db, store, limiters }) {
  const router = express.Router();

  router.post(
    '/register',
    limiters.register,
    asyncHandler(async (req, res) => {
      const input = parse(registerSchema, req.body);

      if (store.getUserByEmail(input.email)) {
        throw new HttpError(
          409,
          'An account with this email already exists.',
          'email_taken'
        );
      }

      const password = await hashPassword(input.password);

      let user;
      try {
        user = store.createUser({
          username: input.username,
          email: input.email,
          passwordHash: password.hash,
          passwordSalt: password.salt,
          passwordParams: password.params
        });
      } catch (error) {
        if (String(error.message || '').includes('UNIQUE')) {
          throw new HttpError(
            409,
            'An account with this email already exists.',
            'email_taken'
          );
        }
        throw error;
      }

      store.createWelcomeNote(user.id);

      if (req.sessionToken) sessions.destroySession(db, req.sessionToken);
      const session = sessions.createSession(db, user.id, {
        rememberMe: false,
        ipHash: clientIpHash(req),
        uaHash: userAgentHash(req)
      });
      sessions.setSessionCookie(res, session.token, session.rememberMe);

      res.status(201).json({ user, csrfToken: session.csrfToken });
    })
  );

  router.post(
    '/login',
    limiters.login,
    asyncHandler(async (req, res) => {
      const input = parse(loginSchema, req.body);
      const row = store.getUserByEmail(input.email);

      if (!row) {
        // Perform a comparable scrypt operation so missing accounts and wrong
        // passwords take similar time.
        await hashPassword(input.password);
        throw new HttpError(401, 'Invalid email or password.', 'invalid_credentials');
      }

      const valid = await verifyPassword(
        input.password,
        row.password_hash,
        row.password_salt,
        row.password_params
      );

      if (!valid) {
        throw new HttpError(401, 'Invalid email or password.', 'invalid_credentials');
      }

      if (needsRehash(row.password_params)) {
        const upgraded = await hashPassword(input.password);
        store.updateUserPassword(
          row.id,
          upgraded.hash,
          upgraded.salt,
          upgraded.params
        );
      }

      if (req.sessionToken) sessions.destroySession(db, req.sessionToken);

      const session = sessions.createSession(db, row.id, {
        rememberMe: input.rememberMe,
        ipHash: clientIpHash(req),
        uaHash: userAgentHash(req)
      });
      sessions.setSessionCookie(res, session.token, session.rememberMe);

      res.json({
        user: store.publicUser(row),
        csrfToken: session.csrfToken
      });
    })
  );

  router.post(
    '/logout',
    sessions.requireAuth,
    sessions.requireCsrf,
    (req, res) => {
      sessions.destroySession(db, req.sessionToken);
      sessions.clearSessionCookie(res);
      res.json({ ok: true });
    }
  );

  router.get('/me', sessions.requireAuth, (req, res) => {
    const user = store.getUserById(req.session.user_id);
    if (!user) {
      sessions.destroySession(db, req.sessionToken);
      sessions.clearSessionCookie(res);
      res.status(401).json({ error: 'Authentication required.', code: 'unauthenticated' });
      return;
    }
    res.json({
      user: store.publicUser(user),
      csrfToken: req.session.csrf_token
    });
  });

  router.post(
    '/password',
    limiters.password,
    sessions.requireAuth,
    sessions.requireCsrf,
    asyncHandler(async (req, res) => {
      const input = parse(changePasswordSchema, req.body);
      const row = store.getUserById(req.session.user_id);
      if (!row) {
        throw new HttpError(401, 'Authentication required.', 'unauthenticated');
      }

      const valid = await verifyPassword(
        input.currentPassword,
        row.password_hash,
        row.password_salt,
        row.password_params
      );
      if (!valid) {
        throw new HttpError(400, 'Current password is incorrect.', 'invalid_password');
      }

      const password = await hashPassword(input.newPassword);
      store.updateUserPassword(row.id, password.hash, password.salt, password.params);

      sessions.destroyOtherSessions(db, row.id, req.session.token_hash);
      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = {
  createAuthRouter,
  clientIpHash,
  userAgentHash
};
