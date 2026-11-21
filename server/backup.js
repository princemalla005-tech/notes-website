'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

function stamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    '-' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function runBackup() {
  if (!fs.existsSync(config.DB_PATH)) {
    throw new Error(
      `No database found at ${config.DB_PATH}. Start the app once and create an account first.`
    );
  }
  if (!fs.existsSync(config.MASTER_KEY_PATH)) {
    throw new Error(
      `No master key found at ${config.MASTER_KEY_PATH}. Without it the database cannot be decrypted.`
    );
  }

  const destination = path.join(config.ROOT, 'backups', `notes-backup-${stamp()}`);
  fs.mkdirSync(destination, { recursive: true });

  const targetDb = path.join(destination, 'notes.db');
  const sqliteTarget = targetDb.replace(/\\/g, '/').replace(/'/g, "''");

  const db = new DatabaseSync(config.DB_PATH);
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.exec(`VACUUM INTO '${sqliteTarget}';`);
  } finally {
    db.close();
  }

  const targetKey = path.join(destination, 'master.key');
  fs.copyFileSync(config.MASTER_KEY_PATH, targetKey);
  try {
    fs.chmodSync(targetKey, 0o600);
  } catch {
    // Windows does not always support POSIX modes; ignore.
  }

  const info = [
    'Notes encrypted backup',
    'Created: ' + new Date().toISOString(),
    'Source database: ' + config.DB_PATH,
    '',
    'This folder contains BOTH the encrypted database and the master key.',
    'Anyone with these two files can read every note. Keep this folder private.',
    'Do not upload it to GitHub, cloud storage or any external service.',
    '',
    'To restore:',
    '  1. Stop the Notes server.',
    '  2. Copy notes.db and master.key back into the data folder.',
    '  3. Start the server again.',
    ''
  ].join('\r\n');

  fs.writeFileSync(path.join(destination, 'BACKUP-INFO.txt'), info, 'utf8');

  return { destination, files: ['notes.db', 'master.key', 'BACKUP-INFO.txt'] };
}

if (require.main === module) {
  try {
    const result = runBackup();
    console.log('');
    console.log('  Encrypted backup created:');
    console.log('  ' + result.destination);
    console.log('');
    console.log('  It contains notes.db and master.key. Keep both private.');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('[notes] Backup failed: ' + error.message);
    console.error('');
    process.exit(1);
  }
}

module.exports = {
  runBackup
};
