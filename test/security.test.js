'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { loadOrCreateMasterKey } = require('../server/crypto');
const { createDatabase, closeDatabase } = require('../server/db');
const { createApp } = require('../server/app');

const PASSWORD_A = 'Alice-Password-123!';
const PASSWORD_B = 'Bob-Password-123!';

function makeContext() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-test-'));
  const dbPath = path.join(dir, 'notes.db');
  const keyPath = path.join(dir, 'master.key');
  const masterKey = loadOrCreateMasterKey(keyPath, { dbPath });
  const db = createDatabase(dbPath);
  const app = createApp({ db, masterKey });

  return {
    dir,
    dbPath,
    keyPath,
    db,
    masterKey,
    app,
    cleanup() {
      closeDatabase(db);
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows file locks.
      }
    }
  };
}

function sessionTokenFrom(response) {
  const cookies = response.headers['set-cookie'] || [];
  for (const cookie of cookies) {
    const match = /^notes\.sid=([^;]+)/.exec(cookie);
    if (match) return match[1];
  }
  return null;
}

async function register(agent, username, email, password) {
  const response = await agent
    .post('/api/auth/register')
    .send({
      username,
      email,
      password,
      passwordConfirm: password
    })
    .expect(201);
  return response;
}

async function login(agent, email, password, rememberMe = false) {
  return agent
    .post('/api/auth/login')
    .send({ email, password, rememberMe });
}

async function createNote(agent, csrf, data) {
  return agent
    .post('/api/notes')
    .set('x-csrf-token', csrf)
    .send(data);
}

describe('secure notes backend — isolation and authorization', () => {
  let ctx;
  let agentA;
  let agentB;
  let csrfA;
  let csrfB;
  let userA;
  let userB;
  let noteA;

  before(async () => {
    ctx = makeContext();
    agentA = request.agent(ctx.app);
    agentB = request.agent(ctx.app);

    const responseA = await register(agentA, 'alice', 'alice@example.com', PASSWORD_A);
    const responseB = await register(agentB, 'bob', 'bob@example.com', PASSWORD_B);

    userA = responseA.body.user;
    userB = responseB.body.user;
    csrfA = responseA.body.csrfToken;
    csrfB = responseB.body.csrfToken;

    const created = await createNote(agentA, csrfA, {
      title: 'Alice private note',
      html: '<p>Only Alice should read this.</p>',
      tags: ['private']
    });
    assert.equal(created.status, 201);
    noteA = created.body.note;
  });

  after(() => {
    ctx.cleanup();
  });

  it('creates an account, session and encrypted welcome note', async () => {
    assert.ok(userA.id);
    assert.equal(userA.email, 'alice@example.com');
    assert.notEqual(userA.id, userB.id);

    const notes = await agentA.get('/api/notes').expect(200);
    assert.ok(Array.isArray(notes.body.notes));
    assert.ok(notes.body.notes.some((note) => note.title === 'Welcome'));
    assert.ok(notes.body.notes.some((note) => note.id === noteA.id));

    const me = await agentA.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.id, userA.id);
    assert.ok(me.body.csrfToken);
  });

  it('rejects duplicate emails and very short passwords, but allows simple 4-character passwords', async () => {
    const duplicate = await request(ctx.app)
      .post('/api/auth/register')
      .send({
        username: 'alice2',
        email: 'alice@example.com',
        password: PASSWORD_A,
        passwordConfirm: PASSWORD_A
      })
      .expect(409);
    assert.equal(duplicate.body.code, 'email_taken');

    const weak = await request(ctx.app)
      .post('/api/auth/register')
      .send({
        username: 'weak',
        email: 'weak@example.com',
        password: 'abc',
        passwordConfirm: 'abc'
      })
      .expect(400);
    assert.ok(weak.body.error);

    const simple = await request(ctx.app)
      .post('/api/auth/register')
      .send({
        username: 'simpleuser',
        email: 'simple@example.com',
        password: '1234',
        passwordConfirm: '1234'
      })
      .expect(201);
    assert.equal(simple.body.user.email, 'simple@example.com');
  });

  it('does not list another user’s notes', async () => {
    const listB = await agentB.get('/api/notes').expect(200);
    assert.equal(
      listB.body.notes.some((note) => note.id === noteA.id),
      false
    );
    assert.equal(
      listB.body.notes.some((note) => note.title === 'Alice private note'),
      false
    );
  });

  it('denies reading, editing and deleting another user’s note', async () => {
    await agentB.get(`/api/notes/${noteA.id}`).expect(404);

    await agentB
      .put(`/api/notes/${noteA.id}`)
      .set('x-csrf-token', csrfB)
      .send({ title: 'Hijacked' })
      .expect(404);

    await agentB
      .delete(`/api/notes/${noteA.id}`)
      .set('x-csrf-token', csrfB)
      .expect(404);

    const stillThere = await agentA.get(`/api/notes/${noteA.id}`).expect(200);
    assert.equal(stillThere.body.note.title, 'Alice private note');
  });

  it('denies access to another user’s versions', async () => {
    await agentB.get(`/api/notes/${noteA.id}/versions`).expect(404);

    await agentB
      .post(`/api/notes/${noteA.id}/versions`)
      .set('x-csrf-token', csrfB)
      .send({ title: 'x', html: '<p>x</p>' })
      .expect(404);

    const versions = await agentA.get(`/api/notes/${noteA.id}/versions`).expect(200);
    assert.ok(Array.isArray(versions.body.versions));
  });

  it('denies folder access across accounts', async () => {
    const created = await agentA
      .post('/api/folders')
      .set('x-csrf-token', csrfA)
      .send({ name: 'Alice folder' })
      .expect(201);
    const folderId = created.body.folder.id;

    const listB = await agentB.get('/api/folders').expect(200);
    assert.equal(listB.body.folders.some((folder) => folder.id === folderId), false);

    await agentB
      .put(`/api/folders/${folderId}`)
      .set('x-csrf-token', csrfB)
      .send({ name: 'Hijacked folder' })
      .expect(404);

    await agentB
      .delete(`/api/folders/${folderId}`)
      .set('x-csrf-token', csrfB)
      .expect(404);
  });

  it('blocks unauthenticated direct API access', async () => {
    await request(ctx.app).get('/api/notes').expect(401);
    await request(ctx.app).get(`/api/notes/${noteA.id}`).expect(401);
    await request(ctx.app).get('/api/folders').expect(401);
    await request(ctx.app).get('/api/export').expect(401);
    await request(ctx.app).get('/api/auth/me').expect(401);
  });

  it('requires a valid CSRF token for mutations', async () => {
    await agentA
      .post('/api/notes')
      .send({ title: 'No CSRF', html: '<p>x</p>' })
      .expect(403);

    await agentA
      .post('/api/notes')
      .set('x-csrf-token', 'not-the-right-token')
      .send({ title: 'Wrong CSRF', html: '<p>x</p>' })
      .expect(403);

    const ok = await createNote(agentA, csrfA, {
      title: 'With CSRF',
      html: '<p>ok</p>'
    });
    assert.equal(ok.status, 201);
  });

  it('ignores attempts to change note ownership through the request body', async () => {
    const created = await createNote(agentA, csrfA, {
      title: 'Ownership test',
      html: '<p>mine</p>',
      userId: userB.id,
      id: 'attacker-chosen-id',
      ownerId: userB.id
    });
    assert.equal(created.status, 201);
    const noteId = created.body.note.id;
    assert.notEqual(noteId, 'attacker-chosen-id');

    const row = ctx.db
      .prepare('SELECT user_id FROM notes WHERE id = ?')
      .get(noteId);
    assert.equal(row.user_id, userA.id);

    const updated = await agentA
      .put(`/api/notes/${noteId}`)
      .set('x-csrf-token', csrfA)
      .send({ title: 'Still mine', userId: userB.id })
      .expect(200);
    assert.equal(updated.body.note.title, 'Still mine');

    const rowAfter = ctx.db
      .prepare('SELECT user_id FROM notes WHERE id = ?')
      .get(noteId);
    assert.equal(rowAfter.user_id, userA.id);
  });

  it('stores note fields as authenticated ciphertext, not plaintext', async () => {
    const marker = 'TOP-SECRET-MARKER-9f2a';
    const created = await createNote(agentA, csrfA, {
      title: marker,
      html: `<p>${marker}</p>`,
      tags: [marker],
      daily: '2026-11-10'
    });
    assert.equal(created.status, 201);

    const row = ctx.db
      .prepare('SELECT * FROM notes WHERE user_id = ? AND id = ?')
      .get(userA.id, created.body.note.id);
    assert.ok(row);
    assert.equal(row.user_id, userA.id);

    for (const field of ['title_enc', 'html_enc', 'tags_enc', 'daily_enc']) {
      const bytes = Buffer.from(row[field]);
      assert.ok(bytes.length > 0);
      assert.equal(bytes.toString('utf8').includes(marker), false);
    }

    const keyRow = ctx.db
      .prepare('SELECT * FROM user_keys WHERE user_id = ?')
      .get(userA.id);
    assert.ok(keyRow);
    assert.equal(Buffer.from(keyRow.wrapped_dek).equals(ctx.masterKey), false);
  });

  it('sanitizes stored HTML against XSS payloads', async () => {
    const created = await createNote(agentA, csrfA, {
      title: 'XSS test',
      html:
        '<p onclick="steal()">ok</p>' +
        '<script>alert(1)</script>' +
        '<img src="x" onerror="alert(2)">' +
        '<a href="javascript:alert(3)">bad link</a>' +
        '<iframe src="https://evil.example"></iframe>'
    });
    assert.equal(created.status, 201);

    const html = created.body.note.html;
    assert.equal(/<script/i.test(html), false);
    assert.equal(/onerror/i.test(html), false);
    assert.equal(/onclick/i.test(html), false);
    assert.equal(/javascript:/i.test(html), false);
    assert.equal(/<iframe/i.test(html), false);
    assert.ok(html.includes('ok'));
  });

  it('resists SQL injection in identifiers and input', async () => {
    const injection = "' OR 1=1 --";
    await agentA.get(`/api/notes/${encodeURIComponent(injection)}`).expect(404);

    const sqlEmail = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: `${injection}@example.com`, password: PASSWORD_A });
    assert.ok([400, 401, 429].includes(sqlEmail.status));

    const folder = await agentA
      .post('/api/folders')
      .set('x-csrf-token', csrfA)
      .send({ name: "'); DROP TABLE notes; --" })
      .expect(201);
    assert.ok(folder.body.folder.name.includes('DROP TABLE'));

    const list = await agentA.get('/api/notes').expect(200);
    assert.ok(list.body.notes.length > 0);
  });

  it('rejects cross-origin and non-JSON auth requests', async () => {
    await request(ctx.app)
      .post('/api/auth/login')
      .set('Origin', 'http://evil.example')
      .send({ email: 'alice@example.com', password: PASSWORD_A })
      .expect(403);

    await request(ctx.app)
      .post('/api/auth/login')
      .type('form')
      .send({ email: 'alice@example.com', password: PASSWORD_A })
      .expect(415);
  });

  it('sets secure session cookies and blocks token reuse after logout', async () => {
    const response = await login(agentA, 'alice@example.com', PASSWORD_A, true);
    assert.equal(response.status, 200);
    const cookies = response.headers['set-cookie'] || [];
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('notes.sid='));
    assert.ok(sessionCookie);
    assert.match(sessionCookie, /HttpOnly/i);
    assert.match(sessionCookie, /SameSite=Lax/i);
    assert.match(sessionCookie, /Path=\//i);
    assert.match(sessionCookie, /Max-Age=\d+/i);

    const token = sessionTokenFrom(response);
    const stored = ctx.db
      .prepare('SELECT token_hash FROM sessions WHERE token_hash = ?')
      .get(require('../server/crypto').sha256Hex(token));
    assert.ok(stored);
    assert.notEqual(stored.token_hash, token);

    csrfA = response.body.csrfToken;
    await agentA
      .post('/api/auth/logout')
      .set('x-csrf-token', csrfA)
      .expect(200);

    await agentA.get('/api/notes').expect(401);

    const reuse = await request(ctx.app)
      .get('/api/notes')
      .set('Cookie', `notes.sid=${token}`);
    assert.equal(reuse.status, 401);
  });

  it('exports and imports without mixing account data', async () => {
    const relogin = await login(agentA, 'alice@example.com', PASSWORD_A);
    assert.equal(relogin.status, 200);
    csrfA = relogin.body.csrfToken;

    const exported = await agentA.get('/api/export').expect(200);
    assert.equal(exported.body.app, 'notes');
    assert.ok(exported.body.notes.length > 0);

    const beforeB = await agentB.get('/api/notes').expect(200);
    const imported = await agentB
      .post('/api/import')
      .set('x-csrf-token', csrfB)
      .send(exported.body)
      .expect(201);
    assert.ok(imported.body.imported.notes > 0);
    assert.ok(imported.body.notes.length > beforeB.body.notes.length);

    const aIds = new Set(exported.body.notes.map((note) => note.id));
    assert.equal(
      imported.body.notes.some((note) => aIds.has(note.id)),
      false,
      'imported notes must receive new ids'
    );

    const afterA = await agentA.get('/api/notes').expect(200);
    assert.equal(afterA.body.notes.length, exported.body.notes.length);
  });

  it('serves security headers and never exposes server files', async () => {
    const home = await request(ctx.app).get('/').expect(200);
    const csp = home.headers['content-security-policy'];
    assert.ok(csp);
    assert.match(csp, /connect-src 'self'/);
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.equal(home.headers['x-powered-by'], undefined);

    await request(ctx.app).get('/server/config.js').expect(404);
    await request(ctx.app).get('/package.json').expect(404);
    await request(ctx.app).get('/data/master.key').expect(404);
    await request(ctx.app).get('/.git/config').expect(404);
  });
});

describe('secure notes backend — auth hardening', () => {
  let ctx;

  before(() => {
    ctx = makeContext();
  });

  after(() => {
    ctx.cleanup();
  });

  it('rate-limits repeated failed logins', async () => {
    await register(request.agent(ctx.app), 'carol', 'carol@example.com', PASSWORD_A);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'carol@example.com', password: 'Wrong-Password-000!' });
      assert.equal(response.status, 401, `attempt ${attempt + 1}`);
    }

    const blocked = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'Wrong-Password-000!' });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, 'rate_limited');
  });

  it('expires sessions at the server-side idle deadline', async () => {
    const agent = request.agent(ctx.app);
    const response = await register(agent, 'dave', 'dave@example.com', PASSWORD_B);
    const token = sessionTokenFrom(response);
    const tokenHash = require('../server/crypto').sha256Hex(token);

    await agent.get('/api/notes').expect(200);

    ctx.db
      .prepare('UPDATE sessions SET idle_expires_at = ? WHERE token_hash = ?')
      .run(Date.now() - 1000, tokenHash);

    await agent.get('/api/notes').expect(401);
    const row = ctx.db
      .prepare('SELECT token_hash FROM sessions WHERE token_hash = ?')
      .get(tokenHash);
    assert.equal(row, undefined);
  });

  it('changes passwords and revokes other sessions', async () => {
    const agentOne = request.agent(ctx.app);
    const agentTwo = request.agent(ctx.app);

    const registered = await register(
      agentOne,
      'erin',
      'erin@example.com',
      PASSWORD_A
    );
    const csrfOne = registered.body.csrfToken;

    const second = await login(agentTwo, 'erin@example.com', PASSWORD_A);
    assert.equal(second.status, 200);

    await agentOne.get('/api/notes').expect(200);
    await agentTwo.get('/api/notes').expect(200);

    const changed = await agentOne
      .post('/api/auth/password')
      .set('x-csrf-token', csrfOne)
      .send({
        currentPassword: PASSWORD_A,
        newPassword: 'Erin-New-Password-456!',
        confirmPassword: 'Erin-New-Password-456!'
      })
      .expect(200);
    assert.equal(changed.body.ok, true);

    await agentTwo.get('/api/notes').expect(401);
    await agentOne.get('/api/notes').expect(200);

    const oldLogin = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'erin@example.com', password: PASSWORD_A });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'erin@example.com', password: 'Erin-New-Password-456!' });
    assert.equal(newLogin.status, 200);
  });

  it('uses a session cookie without Max-Age when Remember me is off', async () => {
    const response = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'dave@example.com', password: PASSWORD_B });
    assert.equal(response.status, 200);
    const cookie = (response.headers['set-cookie'] || []).find((value) =>
      value.startsWith('notes.sid=')
    );
    assert.ok(cookie);
    assert.equal(/Max-Age=/i.test(cookie), false);
    assert.equal(/Expires=/i.test(cookie), false);
  });
});
