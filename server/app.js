'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const config = require('./config');
const { createStore } = require('./store');
const sessions = require('./sessions');
const { HttpError } = require('./errors');
const { createAuthRouter } = require('./routes/auth');
const { createNotesRouter } = require('./routes/notes');
const { createFoldersRouter } = require('./routes/folders');
const { createImportExportRouter } = require('./routes/importExport');

function rateLimitHandler(message) {
  return (req, res) => {
    res.status(429).json({ error: message, code: 'rate_limited' });
  };
}

function ipKey(req) {
  try {
    return ipKeyGenerator(req.ip || 'unknown');
  } catch {
    return String(req.ip || 'unknown');
  }
}

function createLimiters() {
  return {
    general: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 2000,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: ipKey,
      handler: rateLimitHandler('Too many requests. Please slow down.')
    }),
    login: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      skipSuccessfulRequests: true,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (req) => {
        const email = String((req.body && req.body.email) || '').toLowerCase();
        return `${ipKey(req)}:${email}`;
      },
      handler: rateLimitHandler(
        'Too many login attempts. Wait 15 minutes and try again.'
      )
    }),
    register: rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: ipKey,
      handler: rateLimitHandler(
        'Too many accounts created from this device. Try again later.'
      )
    }),
    password: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (req) => `${ipKey(req)}:${req.session ? req.session.user_id : ''}`,
      handler: rateLimitHandler('Too many password attempts. Try again later.')
    })
  };
}

function originGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const origin = req.get('origin');
  if (origin) {
    if (!config.ALLOWED_ORIGINS.has(origin)) {
      res.status(403).json({ error: 'Cross-origin request blocked.', code: 'bad_origin' });
      return;
    }
  }

  const site = req.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    res.status(403).json({ error: 'Cross-site request blocked.', code: 'bad_origin' });
    return;
  }

  next();
}

function requireJson(req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  const length = Number(req.get('content-length') || 0);
  const hasBody = length > 0 || !!req.get('transfer-encoding');
  if (!hasBody) return next();

  if (!req.is('application/json')) {
    res.status(415).json({
      error: 'Content-Type must be application/json.',
      code: 'unsupported_media_type'
    });
    return;
  }
  next();
}

function apiHeaders(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

function createApp({ db, masterKey, limiters = createLimiters() }) {
  const store = createStore(db, masterKey);
  const app = express();

  app.disable('x-powered-by');
  app.disable('etag');
  app.set('trust proxy', false);

  app.use(
    helmet({
      strictTransportSecurity: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
          mediaSrc: ["'self'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: null
        }
      }
    })
  );

  app.use(express.json({ limit: config.JSON_LIMIT, strict: true }));
  app.use(cookieParser());
  app.use(originGuard);
  app.use(sessions.sessionMiddleware(db));

  app.use('/api', apiHeaders);
  app.use('/api', limiters.general);
  app.use('/api', requireJson);

  app.use(
    '/api/auth',
    createAuthRouter({ db, store, limiters })
  );
  app.use('/api/notes', createNotesRouter({ store }));
  app.use('/api/folders', createFoldersRouter({ store }));
  app.use('/api', createImportExportRouter({ store }));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found.', code: 'not_found' });
  });

  app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(config.ROOT, 'index.html'));
  });

  app.use(
    '/assets',
    express.static(path.join(config.ROOT, 'assets'), {
      index: false,
      dotfiles: 'ignore',
      maxAge: 0,
      fallthrough: true
    })
  );

  app.use((req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      res.end();
      return;
    }

    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: error.message,
        code: error.code || 'error'
      });
      return;
    }

    if (error && error.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body is too large.', code: 'too_large' });
      return;
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      res.status(400).json({ error: 'Invalid JSON body.', code: 'invalid_json' });
      return;
    }

    if (error && error.status === 400 && error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid request body.', code: 'invalid_body' });
      return;
    }

    console.error('[notes] unhandled request error:', error);
    res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
  });

  app.locals.store = store;

  return app;
}

module.exports = {
  createApp,
  createLimiters
};
