'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  email_norm TEXT NOT NULL UNIQUE,
  password_hash BLOB NOT NULL,
  password_salt BLOB NOT NULL,
  password_params TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_keys (
  user_id TEXT PRIMARY KEY,
  wrapped_dek BLOB NOT NULL,
  wrap_iv BLOB NOT NULL,
  wrap_tag BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  idle_expires_at INTEGER NOT NULL,
  absolute_expires_at INTEGER NOT NULL,
  remember INTEGER NOT NULL DEFAULT 0 CHECK (remember IN (0, 1)),
  ip_hash TEXT,
  ua_hash TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(idle_expires_at, absolute_expires_at);

CREATE TABLE IF NOT EXISTS folders (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name_enc BLOB NOT NULL,
  name_iv BLOB NOT NULL,
  name_tag BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folders_user_updated ON folders(user_id, updated_at);

CREATE TABLE IF NOT EXISTS notes (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title_enc BLOB NOT NULL,
  title_iv BLOB NOT NULL,
  title_tag BLOB NOT NULL,
  html_enc BLOB NOT NULL,
  html_iv BLOB NOT NULL,
  html_tag BLOB NOT NULL,
  tags_enc BLOB NOT NULL,
  tags_iv BLOB NOT NULL,
  tags_tag BLOB NOT NULL,
  daily_enc BLOB NOT NULL,
  daily_iv BLOB NOT NULL,
  daily_tag BLOB NOT NULL,
  folder_id TEXT,
  starred INTEGER NOT NULL DEFAULT 0 CHECK (starred IN (0, 1)),
  trashed INTEGER NOT NULL DEFAULT 0 CHECK (trashed IN (0, 1)),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_user_folder ON notes(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_trashed ON notes(user_id, trashed);

CREATE TABLE IF NOT EXISTS note_versions (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  title_enc BLOB NOT NULL,
  title_iv BLOB NOT NULL,
  title_tag BLOB NOT NULL,
  html_enc BLOB NOT NULL,
  html_iv BLOB NOT NULL,
  html_tag BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, note_id) REFERENCES notes(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_versions_note ON note_versions(user_id, note_id, created_at);
`;

function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);

  return db;
}

function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors; the original error is more useful.
    }
    throw error;
  }
}

function closeDatabase(db) {
  try {
    db.close();
  } catch {
    // Ignore close errors during shutdown.
  }
}

module.exports = {
  SCHEMA,
  createDatabase,
  transaction,
  closeDatabase
};
