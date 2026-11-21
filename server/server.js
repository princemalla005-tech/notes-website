'use strict';

const config = require('./config');
const { loadOrCreateMasterKey } = require('./crypto');
const { createDatabase, closeDatabase } = require('./db');
const { createApp } = require('./app');
const sessions = require('./sessions');

function startServer(options = {}) {
  const masterKey = loadOrCreateMasterKey(config.MASTER_KEY_PATH, {
    dbPath: config.DB_PATH
  });
  const db = createDatabase(config.DB_PATH);
  const app = createApp({ db, masterKey });

  const server = app.listen(config.PORT, config.HOST, () => {
    console.log('');
    console.log('  Notes is running at ' + config.ORIGIN);
    console.log('  Database:   ' + config.DB_PATH);
    console.log('  Master key: ' + config.MASTER_KEY_PATH);
    console.log('');
    console.log('  Keep data/master.key safe. The database alone cannot be decrypted.');
    console.log('  Run "npm run backup" regularly. Press Ctrl+C to stop.');
    console.log('');
  });

  const cleanup = setInterval(() => {
    try {
      sessions.cleanupExpiredSessions(db);
    } catch (error) {
      console.error('[notes] session cleanup failed:', error.message);
    }
  }, 10 * 60 * 1000);
  cleanup.unref();

  let shuttingDown = false;
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[notes] ${signal} received, shutting down…`);
    clearInterval(cleanup);
    server.close(() => {
      closeDatabase(db);
      process.exit(0);
    });
    const timer = setTimeout(() => {
      closeDatabase(db);
      process.exit(1);
    }, 5000);
    timer.unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return { app, server, db, masterKey };
}

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    console.error('');
    console.error('[notes] Could not start: ' + error.message);
    console.error('');
    process.exit(1);
  }
}

module.exports = {
  startServer
};
