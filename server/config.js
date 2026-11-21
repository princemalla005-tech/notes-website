'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function resolveFromRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(ROOT, value);
}

const DATA_DIR = process.env.NOTES_DATA_DIR
  ? resolveFromRoot(process.env.NOTES_DATA_DIR)
  : path.join(ROOT, 'data');

const DB_PATH = process.env.NOTES_DB_PATH
  ? resolveFromRoot(process.env.NOTES_DB_PATH)
  : path.join(DATA_DIR, 'notes.db');

const MASTER_KEY_PATH = process.env.NOTES_MASTER_KEY_PATH
  ? resolveFromRoot(process.env.NOTES_MASTER_KEY_PATH)
  : path.join(DATA_DIR, 'master.key');

const HOST = process.env.NOTES_HOST || '127.0.0.1';
const PORT = Number(process.env.NOTES_PORT || process.env.PORT || 4173);

const ORIGIN = process.env.NOTES_ORIGIN || `http://${HOST}:${PORT}`;

const ALLOWED_ORIGINS = new Set(
  (process.env.NOTES_ALLOWED_ORIGINS || [
    ORIGIN,
    `http://127.0.0.1:${PORT}`,
    `http://localhost:${PORT}`
  ].join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

module.exports = {
  ROOT,
  DATA_DIR,
  DB_PATH,
  MASTER_KEY_PATH,
  HOST,
  PORT,
  ORIGIN,
  ALLOWED_ORIGINS,

  COOKIE_NAME: 'notes.sid',
  CSRF_HEADER: 'x-csrf-token',

  SESSION_IDLE_MS: 8 * 60 * 60 * 1000,
  SESSION_ABSOLUTE_MS: 7 * 24 * 60 * 60 * 1000,
  REMEMBER_IDLE_MS: 7 * 24 * 60 * 60 * 1000,
  REMEMBER_ABSOLUTE_MS: 30 * 24 * 60 * 60 * 1000,
  SESSION_TOUCH_MS: 5 * 60 * 1000,

  PASSWORD_MIN: 4,
  PASSWORD_MAX: 128,

  NOTE_TITLE_MAX: 200,
  NOTE_HTML_MAX: 1_000_000,
  NOTE_TAGS_MAX: 12,
  NOTE_TAG_MAX: 24,
  NOTE_DAILY_MAX: 10,
  FOLDER_NAME_MAX: 60,
  ID_MAX: 100,

  VERSION_LIMIT: 12,
  VERSION_MIN_INTERVAL_MS: 90 * 1000,

  MAX_IMPORT_NOTES: 5000,
  MAX_IMPORT_FOLDERS: 500,

  JSON_LIMIT: '20mb',
  COOKIE_SECURE: process.env.NOTES_COOKIE_SECURE === 'true'
};
