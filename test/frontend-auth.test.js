'use strict';

/*
 * Frontend authentication and storage tests.
 *
 * These tests run without a browser:
 *  - assets/api.js is executed inside a vm sandbox with a fake fetch so the
 *    in-memory CSRF/session behaviour can be asserted directly.
 *  - assets/app.js, index.html and assets/styles.css are inspected as source
 *    to guarantee that notes/AI data can never be written to Local Storage
 *    and that AI and sharing stay disabled.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const API_SOURCE = fs.readFileSync(path.join(ROOT, 'assets', 'api.js'), 'utf8');
const APP_SOURCE = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');
const HTML_SOURCE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CSS_SOURCE = fs.readFileSync(path.join(ROOT, 'assets', 'styles.css'), 'utf8');

function jsonResponse(status, payload) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    headers: {
      get: function (name) {
        return String(name).toLowerCase() === 'content-type' ? 'application/json' : null;
      }
    },
    json: function () { return Promise.resolve(payload); },
    text: function () { return Promise.resolve(JSON.stringify(payload)); }
  });
}

function loadApi(responder) {
  const calls = [];
  const storage = { getItem: [], setItem: [], removeItem: [] };

  const sandbox = {
    window: {},
    console: console,
    localStorage: {
      getItem: function (key) { storage.getItem.push(key); return null; },
      setItem: function (key) { storage.setItem.push(key); },
      removeItem: function (key) { storage.removeItem.push(key); }
    },
    sessionStorage: {
      getItem: function (key) { storage.getItem.push(key); return null; },
      setItem: function (key) { storage.setItem.push(key); },
      removeItem: function (key) { storage.removeItem.push(key); }
    },
    fetch: function (url, init) {
      calls.push({ url: url, init: init || {} });
      return responder(url, init || {}, calls.length);
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(API_SOURCE, sandbox, { filename: 'assets/api.js' });

  return { api: sandbox.window.NotesApi, calls: calls, storage: storage };
}

function headerValue(init, name) {
  const headers = init.headers || {};
  const target = String(name).toLowerCase();
  return Object.keys(headers).reduce(function (found, key) {
    return found === undefined && key.toLowerCase() === target ? headers[key] : found;
  }, undefined);
}

test('api client keeps CSRF in memory and never touches browser storage', async function () {
  const { api, storage } = loadApi(function () {
    return jsonResponse(200, {
      user: { id: 'u1', username: 'Ada', email: 'ada@example.com' },
      csrfToken: 'csrf-token-1'
    });
  });

  const data = await api.me();
  assert.equal(data.user.username, 'Ada');
  assert.equal(api.getCsrf(), 'csrf-token-1');

  assert.deepEqual(storage.getItem, []);
  assert.deepEqual(storage.setItem, []);
  assert.deepEqual(storage.removeItem, []);
});

test('login posts JSON and mutations carry the in-memory CSRF header', async function () {
  const { api, calls } = loadApi(function (url) {
    if (url === '/api/auth/login') {
      return jsonResponse(200, {
        user: { id: 'u1', username: 'Ada', email: 'ada@example.com' },
        csrfToken: 'login-csrf'
      });
    }
    return jsonResponse(201, { note: { id: 'n1', title: 'Hello' } });
  });

  await api.login('ada@example.com', 'correct horse battery staple', true);

  const loginCall = calls[0];
  assert.equal(loginCall.url, '/api/auth/login');
  assert.equal(loginCall.init.method, 'POST');
  assert.equal(loginCall.init.credentials, 'same-origin');
  assert.equal(headerValue(loginCall.init, 'content-type'), 'application/json');
  assert.equal(headerValue(loginCall.init, 'x-csrf-token'), undefined);
  assert.deepEqual(JSON.parse(loginCall.init.body), {
    email: 'ada@example.com',
    password: 'correct horse battery staple',
    rememberMe: true
  });

  await api.createNote({ title: 'Hello', html: '<p>Hi</p>' });
  const noteCall = calls[1];
  assert.equal(noteCall.url, '/api/notes');
  assert.equal(headerValue(noteCall.init, 'x-csrf-token'), 'login-csrf');
});

test('register stores the CSRF token and logout clears it', async function () {
  const { api } = loadApi(function (url) {
    if (url === '/api/auth/register') {
      return jsonResponse(201, {
        user: { id: 'u2', username: 'Grace', email: 'grace@example.com' },
        csrfToken: 'register-csrf'
      });
    }
    return jsonResponse(200, { ok: true });
  });

  await api.register('Grace', 'grace@example.com', 'a-long-enough-password', 'a-long-enough-password');
  assert.equal(api.getCsrf(), 'register-csrf');

  await api.logout();
  assert.equal(api.getCsrf(), null);
});

test('a 401 clears CSRF and invokes the unauthorized handler', async function () {
  const { api } = loadApi(function () {
    return jsonResponse(401, { error: 'Not signed in', code: 'unauthorized' });
  });

  let handled = 0;
  api.setCsrf('stale-token');
  api.setUnauthorizedHandler(function () { handled += 1; });

  await assert.rejects(
    function () { return api.listNotes(); },
    function (error) {
      return error.status === 401 && error.name === 'ApiError';
    }
  );

  assert.equal(handled, 1);
  assert.equal(api.getCsrf(), null);
});

test('network failures surface a clear API error', async function () {
  const { api } = loadApi(function () {
    return Promise.reject(new Error('socket closed'));
  });

  await assert.rejects(
    function () { return api.me(); },
    function (error) {
      return error.code === 'network_error' && /local Notes server/.test(error.message);
    }
  );
});

test('app wires login, sign up, logout, session checks and password changes', function () {
  const required = [
    'api.me()',
    'api.login(',
    'api.register(',
    'api.logout()',
    'api.changePassword(',
    'api.setUnauthorizedHandler(handleSignedOut)',
    'function showAuth(',
    'function hideAuth(',
    'function handleAuthSuccess(',
    'function handleSignedOut(',
    'function afterSignIn(',
    'function loadWorkspace('
  ];

  required.forEach(function (needle) {
    assert.ok(APP_SOURCE.includes(needle), 'app.js should contain ' + needle);
  });

  assert.match(APP_SOURCE, /var PASSWORD_MIN = 6/, 'frontend should allow 6+ character passwords');
  assert.match(APP_SOURCE, /password\.length < PASSWORD_MIN/, 'frontend should enforce the password minimum');
  assert.match(APP_SOURCE, /setAuthBusy\(true\)/, 'auth forms should disable while submitting');
});

test('notes, folders, history and AI data are never written to Local Storage', function () {
  const sensitive = ['notes:docs', 'notes:folders', 'notes:history', 'notes:ai', 'notes:shareAccess'];

  // No direct setItem/getItem/removeItem call may use a sensitive key, except
  // the one-time legacy migration/purge which is asserted separately below.
  sensitive.forEach(function (key) {
    const directSet = new RegExp('localStorage\\.setItem\\(\\s*[\'"]' + key.replace(':', '\\:') + '[\'"]');
    const directGet = new RegExp('localStorage\\.getItem\\(\\s*[\'"]' + key.replace(':', '\\:') + '[\'"]');
    assert.doesNotMatch(APP_SOURCE, directSet, 'must not setItem ' + key);
    assert.doesNotMatch(APP_SOURCE, directGet, 'must not getItem ' + key);
  });

  assert.doesNotMatch(APP_SOURCE, /localStorage\.setItem\(\s*LS\.(docs|folders|history|ai)/);
  assert.doesNotMatch(APP_SOURCE, /localStorage\.setItem\(\s*LS\.share/);

  // write() must refuse the sensitive keys outright.
  assert.match(
    APP_SOURCE,
    /key === 'notes:history' \|\| key === 'notes:ai' \|\| key === 'notes:shareAccess'/,
    'write() should block history/AI/share keys'
  );
  assert.match(APP_SOURCE, /if \(key === 'notes:docs'\)/, 'write() should intercept docs keys');
  assert.match(APP_SOURCE, /if \(key === 'notes:folders'\)/, 'write() should intercept folders keys');

  // Legacy data may only be read for one-time migration and then removed.
  assert.match(APP_SOURCE, /function migrateLegacyLocalData\(/);
  assert.match(APP_SOURCE, /removeLegacy\('notes:docs'\)/);
  assert.match(APP_SOURCE, /removeLegacy\('notes:folders'\)/);
  assert.match(APP_SOURCE, /removeLegacy\('notes:history'\)/);
  assert.match(APP_SOURCE, /function purgeLegacySecrets\(/);
  assert.match(APP_SOURCE, /removeLegacy\('notes:ai'\)/);
  assert.match(APP_SOURCE, /removeLegacy\('notes:shareAccess'\)/);
  assert.match(APP_SOURCE, /removeLegacy\('undefined'\)/);

  // Notes must be persisted through the API, not the browser.
  assert.match(APP_SOURCE, /function writeDocs\(\)\s*\{\s*scheduleSync\(\);/);
  assert.match(APP_SOURCE, /function writeFolders\(\)\s*\{\s*scheduleSync\(\);/);
});

test('AI and sharing entry points return early and cannot open UI', function () {
  const disabledFunctions = [
    'openShareDialog',
    'refreshShareLink',
    'updateShareAccess',
    'saveSharedCopy',
    'initSharedViewer',
    'openSharedView',
    'aiRunQuick',
    'aiSendMessage',
    'aiRun',
    'aiRunGenerate',
    'aiCreateGeneratedNote'
  ];

  disabledFunctions.forEach(function (name) {
    const pattern = new RegExp(
      'function ' + name + '\\([^)]*\\)\\s*\\{\\s*\\/\\*[^*]*\\*\\/\\s*return'
    );
    assert.match(APP_SOURCE, pattern, name + ' should return immediately');
  });

  // Keyboard shortcuts for AI are swallowed.
  assert.match(APP_SOURCE, /mod && key === 'j'[\s\S]{0,120}AI shortcuts are disabled/);
  assert.match(APP_SOURCE, /mod && event\.altKey && key === 'n'[\s\S]{0,120}AI shortcuts are disabled/);

  // Legacy #share= links are stripped at boot.
  assert.match(APP_SOURCE, /location\.hash\.indexOf\('#share='\) === 0/);
});

test('index.html exposes auth forms and hides AI/share UI', function () {
  [
    'id="auth-screen"',
    'id="auth-login-form"',
    'id="auth-register-form"',
    'id="login-email"',
    'id="login-password"',
    'id="register-username"',
    'id="register-email"',
    'id="register-password"',
    'id="register-confirm"',
    'id="account-chip"',
    'id="profile-logout"'
  ].forEach(function (needle) {
    assert.ok(HTML_SOURCE.includes(needle), 'index.html should contain ' + needle);
  });

  // AI shortcut documentation is gone.
  assert.doesNotMatch(HTML_SOURCE, /AI assistant<\/span><span class="sc-keys"><kbd>Ctrl<\/kbd><kbd>J<\/kbd>/);
  assert.doesNotMatch(HTML_SOURCE, /Create with AI<\/span><span class="sc-keys"><kbd>Ctrl<\/kbd><kbd>Alt<\/kbd><kbd>N<\/kbd>/);

  // AI and share containers are marked disabled and hidden.
  ['ai-drawer', 'share-modal', 'ai-settings-modal', 'gen-modal', 'shared-view'].forEach(function (id) {
    const tag = new RegExp('<[^>]*id="' + id + '"[^>]*>');
    const match = HTML_SOURCE.match(tag);
    assert.ok(match, 'index.html should contain #' + id);
    assert.match(match[0], /data-disabled="true"/, '#' + id + ' should be data-disabled');
  });

  assert.match(HTML_SOURCE, /id="share-open"[^>]*hidden/);
  assert.match(HTML_SOURCE, /id="ai-open"[^>]*hidden/);
});

test('styles.css hard-disables AI and sharing elements', function () {
  [
    '#ai-drawer',
    '#ai-scrim',
    '#ai-settings-modal',
    '#gen-modal',
    '#share-modal',
    '#shared-view',
    '#ai-open',
    '#ai-generate',
    '#share-open'
  ].forEach(function (selector) {
    assert.ok(CSS_SOURCE.includes(selector), 'styles.css should hide ' + selector);
  });

  assert.match(CSS_SOURCE, /display:\s*none\s*!important/);
});
