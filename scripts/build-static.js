#!/usr/bin/env node
'use strict';

/*
 * Build a static production bundle.
 *
 * Only frontend files are published:
 *   index.html + assets/**
 *
 * Nothing from server/, data/, test/, node_modules/ or .git/ is copied.
 * The build refuses to produce a bundle with an empty Supabase URL/key
 * unless --allow-unconfigured is passed (useful for local preview).
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ALLOW_UNCONFIGURED = process.argv.includes('--allow-unconfigured');

function fail(message) {
  console.error('\nBuild failed: ' + message + '\n');
  process.exit(1);
}

function readConfig() {
  const file = path.join(ROOT, 'assets', 'config.js');
  if (!fs.existsSync(file)) fail('assets/config.js is missing.');

  const source = fs.readFileSync(file, 'utf8');
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(source, sandbox, { filename: 'assets/config.js', timeout: 2000 });
  } catch (error) {
    fail('assets/config.js could not be read: ' + error.message);
  }
  return sandbox.window.NotesConfig || {};
}

function jwtRole(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return payload && payload.role ? String(payload.role) : null;
  } catch {
    return null;
  }
}

function validateConfig(config) {
  const url = String(config.supabaseUrl || '').trim();
  const key = String(config.supabaseAnonKey || '').trim();

  if (!url || !key) {
    if (ALLOW_UNCONFIGURED) {
      console.warn(
        '\nWarning: Supabase is not configured. The preview will fall back to the local API\n' +
        'and will not work on a static host. Set supabaseUrl and supabaseAnonKey in\n' +
        'assets/config.js before deploying.\n'
      );
      return { url: '', key: '', origin: '', host: '' };
    }
    fail(
      'Supabase is not configured.\n' +
      '  1. Open assets/config.js\n' +
      '  2. Set supabaseUrl to your Project URL\n' +
      '  3. Set supabaseAnonKey to your anon/public key\n' +
      '  Then run npm run build:static again.'
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail('supabaseUrl is not a valid URL: ' + url);
  }
  if (parsed.protocol !== 'https:') {
    fail('supabaseUrl must use https:// (got ' + parsed.protocol + ').');
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    fail('supabaseUrl should be only the project origin, e.g. https://abcd.supabase.co');
  }
  if (!/\.supabase\.co$/i.test(parsed.hostname)) {
    console.warn(
      'Warning: ' + parsed.hostname + ' is not a *.supabase.co host. ' +
      'Make sure the CSP and Supabase redirect URLs are updated for a custom domain.'
    );
  }

  const role = jwtRole(key);
  if (role && role !== 'anon') {
    fail(
      'The configured Supabase key has role "' + role + '". ' +
      'Only the public anon/publishable key may be shipped to a browser. ' +
      'Never put the service_role key in assets/config.js.'
    );
  }

  return {
    url,
    key,
    origin: parsed.origin,
    host: parsed.hostname
  };
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, dest);
    else if (entry.isFile()) fs.copyFileSync(source, dest);
  }
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function assertNoSecrets(dir) {
  const forbidden = /(^|[\\/])(master\.key|\.env(\..*)?|[^\\/]*\.(db|sqlite|sqlite3|pem|p12|pfx|key))$/i;
  const bad = walk(dir).filter((file) => forbidden.test(file));
  if (bad.length) {
    fail('Refusing to publish secret/database files:\n  ' + bad.join('\n  '));
  }
}

function cspFor(config) {
  const connect = ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'];
  if (config.origin && config.origin !== 'https://*.supabase.co') {
    connect.push(config.origin);
  }
  if (config.host) connect.push('wss://' + config.host);

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    'connect-src ' + Array.from(new Set(connect)).join(' ')
  ].join('; ');
}

function writeHeaders(config) {
  const csp = cspFor(config);
  const headers = [
    '/*',
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
    '  Content-Security-Policy: ' + csp,
    '',
    '/index.html',
    '  Cache-Control: no-cache',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=3600',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(DIST, '_headers'), headers, 'utf8');
  fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
}

function main() {
  const config = validateConfig(readConfig());

  rmrf(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  writeHeaders(config);
  assertNoSecrets(DIST);

  const files = walk(DIST);
  const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);

  console.log('\nStatic build complete.');
  console.log('  Output:  ' + DIST);
  console.log('  Files:   ' + files.length);
  console.log('  Size:    ' + (bytes / 1024).toFixed(1) + ' KB');
  console.log('  Backend: ' + (config.url ? config.url : 'local API fallback (not deployable)'));
  console.log('\nDeploy the dist/ folder. Do not upload server/, data/ or .env files.\n');
}

main();
