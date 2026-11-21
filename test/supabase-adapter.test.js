'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodeCrypto = require('node:crypto');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'api-supabase.js'),
  'utf8'
);

const USER = {
  id: 'user-1',
  email: 'alice@example.com',
  created_at: '2026-01-02T03:04:05.000Z',
  user_metadata: { username: 'Alice' }
};

const NOTE_ID = '11111111-1111-4111-8111-111111111111';
const FOLDER_ID = '22222222-2222-4222-8222-222222222222';
const VERSION_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_ID = '44444444-4444-4444-8444-444444444444';

function jwt(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return 'header.' + body + '.signature';
}

function storage(initial) {
  const map = Object.assign({}, initial || {});
  return {
    get length() { return Object.keys(map).length; },
    key(index) { return Object.keys(map)[index] || null; },
    getItem(key) { return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null; },
    setItem(key, value) { map[key] = String(value); },
    removeItem(key) { delete map[key]; },
    dump() { return Object.assign({}, map); }
  };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createState() {
  return {
    session: null,
    user: USER,
    confirmEmail: false,
    loginError: null,
    signUpError: null,
    signOutError: null,
    updateError: null,
    dataError: null,
    tables: { folders: [], notes: [], note_versions: [] },
    calls: [],
    lastLogin: null,
    lastSignUp: null,
    lastSignOut: null,
    lastUpdate: null,
    clientOptions: null,
    url: null,
    key: null,
    authListener: null,
    createClientCalls: 0
  };
}

function createBuilder(state, table) {
  const builder = {
    table,
    op: 'select',
    values: null,
    returning: false,
    filters: [],
    inFilters: [],
    orders: [],
    max: null,
    mode: null
  };

  builder.select = function () {
    if (builder.op !== 'select') builder.returning = true;
    return builder;
  };
  builder.insert = function (values) {
    builder.op = 'insert';
    builder.values = values;
    return builder;
  };
  builder.update = function (values) {
    builder.op = 'update';
    builder.values = values;
    return builder;
  };
  builder.delete = function () {
    builder.op = 'delete';
    return builder;
  };
  builder.eq = function (column, value) {
    builder.filters.push([column, value]);
    return builder;
  };
  builder.in = function (column, values) {
    builder.inFilters.push([column, values]);
    return builder;
  };
  builder.order = function (column, options) {
    builder.orders.push([column, !options || options.ascending !== false]);
    return builder;
  };
  builder.limit = function (count) {
    builder.max = count;
    return builder;
  };
  builder.single = function () {
    builder.mode = 'single';
    return builder;
  };
  builder.maybeSingle = function () {
    builder.mode = 'maybeSingle';
    return builder;
  };

  builder.execute = function () {
    state.calls.push({
      table,
      op: builder.op,
      values: clone(builder.values),
      filters: clone(builder.filters),
      inFilters: clone(builder.inFilters)
    });

    if (state.dataError) return { data: null, error: state.dataError };

    const rows = state.tables[table] || [];
    let selected;

    if (builder.op === 'insert') {
      const incoming = Array.isArray(builder.values) ? builder.values : [builder.values];
      const inserted = incoming.map((row) => {
        const copy = clone(row) || {};
        if (!copy.id) copy.id = nodeCrypto.randomUUID();
        if (!copy.user_id) copy.user_id = USER.id;
        if (!copy.created_at) copy.created_at = Date.now();
        if (!copy.updated_at) copy.updated_at = copy.created_at;
        rows.push(copy);
        return copy;
      });
      selected = inserted;
    } else if (builder.op === 'update') {
      selected = rows.filter(matches(builder));
      selected.forEach((row) => {
        Object.assign(row, clone(builder.values));
        row.updated_at = Date.now();
      });
    } else if (builder.op === 'delete') {
      const removed = rows.filter(matches(builder));
      state.tables[table] = rows.filter((row) => removed.indexOf(row) === -1);
      selected = removed;
    } else {
      selected = rows.filter(matches(builder));
      builder.orders.slice().reverse().forEach(([column, ascending]) => {
        selected.sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (av === bv) return 0;
          const result = av > bv ? 1 : -1;
          return ascending ? result : -result;
        });
      });
    }

    if (builder.max != null) selected = selected.slice(0, builder.max);

    if (builder.mode === 'single') {
      if (selected.length !== 1) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            status: 406,
            message: 'JSON object requested, multiple (or no) rows returned'
          }
        };
      }
      return { data: clone(selected[0]), error: null };
    }

    if (builder.mode === 'maybeSingle') {
      if (selected.length === 0) return { data: null, error: null };
      if (selected.length > 1) {
        return {
          data: null,
          error: {
            code: 'PGRST116',
            status: 406,
            message: 'JSON object requested, multiple (or no) rows returned'
          }
        };
      }
      return { data: clone(selected[0]), error: null };
    }

    return { data: builder.op === 'select' || builder.returning ? clone(selected) : null, error: null };
  };

  builder.then = function (resolve, reject) {
    return Promise.resolve(builder.execute()).then(resolve, reject);
  };

  return builder;
}

function matches(builder) {
  return function (row) {
    return builder.filters.every(([column, value]) => row[column] === value) &&
      builder.inFilters.every(([column, values]) => values.indexOf(row[column]) !== -1);
  };
}

function createClient(state) {
  state.createClientCalls += 1;

  return {
    auth: {
      getSession() {
        return Promise.resolve({ data: { session: state.session }, error: null });
      },
      getUser() {
        if (!state.session || !state.user) {
          return Promise.resolve({
            data: { user: null },
            error: { status: 401, message: 'Auth session missing!' }
          });
        }
        return Promise.resolve({ data: { user: state.user }, error: null });
      },
      signInWithPassword(credentials) {
        state.lastLogin = credentials;
        if (state.loginError) {
          return Promise.resolve({ data: { user: null, session: null }, error: state.loginError });
        }
        state.session = { user: state.user };
        return Promise.resolve({
          data: { user: state.user, session: state.session },
          error: null
        });
      },
      signUp(options) {
        state.lastSignUp = options;
        if (state.signUpError) {
          return Promise.resolve({ data: { user: null, session: null }, error: state.signUpError });
        }
        if (!state.confirmEmail) state.session = { user: state.user };
        return Promise.resolve({
          data: {
            user: state.user,
            session: state.confirmEmail ? null : state.session
          },
          error: null
        });
      },
      signOut(options) {
        state.lastSignOut = options || null;
        if (state.signOutError) return Promise.resolve({ error: state.signOutError });
        if (!options || options.scope !== 'others') state.session = null;
        return Promise.resolve({ error: null });
      },
      updateUser(attributes) {
        state.lastUpdate = attributes;
        if (state.updateError) return Promise.resolve({ data: { user: null }, error: state.updateError });
        return Promise.resolve({ data: { user: state.user }, error: null });
      },
      onAuthStateChange(listener) {
        state.authListener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      resetPasswordForEmail() {
        return Promise.resolve({ data: {}, error: null });
      }
    },
    from(table) {
      return createBuilder(state, table);
    }
  };
}

function loadAdapter(config, state) {
  const local = storage();
  const session = storage();
  const win = {
    NotesConfig: config,
    NotesApi: { backend: 'local', marker: true },
    localStorage: local,
    sessionStorage: session,
    crypto: { randomUUID: nodeCrypto.randomUUID },
    location: { hash: '', pathname: '/', search: '' },
    history: {
      replaced: null,
      replaceState(_state, _title, url) { this.replaced = url; }
    },
    supabase: {
      createClient(url, key, options) {
        state.url = url;
        state.key = key;
        state.clientOptions = options;
        return createClient(state);
      }
    }
  };

  const sandbox = {
    window: win,
    console,
    atob,
    btoa,
    URL,
    Promise,
    setTimeout,
    clearTimeout
  };

  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'assets/api-supabase.js' });
  return { api: win.NotesApi, win, sandbox };
}

function configured(key) {
  return {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: key || jwt({ role: 'anon' })
  };
}

function noteRow(overrides) {
  return Object.assign({
    id: NOTE_ID,
    user_id: USER.id,
    title: 'Existing',
    html: '<p>existing</p>',
    folder_id: null,
    starred: false,
    trashed: false,
    pinned: false,
    archived: false,
    tags: [],
    daily: null,
    created_at: 1000,
    updated_at: 2000
  }, overrides || {});
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

test('keeps the local API when Supabase is not configured', () => {
  const state = createState();
  const { api } = loadAdapter({ supabaseUrl: '', supabaseAnonKey: '' }, state);

  assert.equal(api.backend, 'local');
  assert.equal(api.marker, true);
  assert.equal(state.createClientCalls, 0);
});

test('refuses to start with a service_role key', () => {
  const state = createState();
  const { api } = loadAdapter(configured(jwt({ role: 'service_role' })), state);

  assert.equal(api.backend, 'local');
  assert.equal(api.marker, true);
  assert.equal(state.createClientCalls, 0);
});

test('installs the Supabase adapter with an anon key', () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  assert.equal(api.backend, 'supabase');
  assert.equal(state.createClientCalls, 1);
  assert.equal(state.url, 'https://example.supabase.co');
  assert.equal(state.clientOptions.auth.storageKey, 'notes:supabase-auth');
  assert.equal(typeof api.me, 'function');
  assert.equal(typeof api.importData, 'function');
});

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

test('me() rejects with 401 when there is no session', async () => {
  const state = createState();
  state.session = null;
  const { api } = loadAdapter(configured(), state);

  await assert.rejects(api.me(), (error) => {
    assert.equal(error.status, 401);
    return true;
  });
});

test('me() returns the signed-in user and clears an auth hash', async () => {
  const state = createState();
  state.session = { user: USER };
  const { api, win } = loadAdapter(configured(), state);
  win.location.hash = '#access_token=abc&refresh_token=def&type=signup';

  const data = await api.me();

  assert.equal(data.user.id, USER.id);
  assert.equal(data.user.username, 'Alice');
  assert.equal(data.user.email, 'alice@example.com');
  assert.equal(data.csrfToken, null);
  assert.equal(win.history.replaced, '/');
});

test('login honors remember me by choosing localStorage', async () => {
  const state = createState();
  const { api, win } = loadAdapter(configured(), state);

  const data = await api.login('alice@example.com', 'secret', true);

  assert.equal(data.user.username, 'Alice');
  assert.equal(state.lastLogin.email, 'alice@example.com');
  assert.equal(state.lastLogin.password, 'secret');
  assert.equal(win.localStorage.getItem('notes:remember'), '1');

  state.clientOptions.auth.storage.setItem('notes:supabase-auth', 'token');
  assert.equal(win.localStorage.getItem('notes:supabase-auth'), 'token');
  assert.equal(win.sessionStorage.getItem('notes:supabase-auth'), null);
});

test('login without remember me uses sessionStorage', async () => {
  const state = createState();
  const { api, win } = loadAdapter(configured(), state);

  await api.login('alice@example.com', 'secret', false);

  assert.equal(win.localStorage.getItem('notes:remember'), null);
  state.clientOptions.auth.storage.setItem('notes:supabase-auth', 'token');
  assert.equal(win.sessionStorage.getItem('notes:supabase-auth'), 'token');
  assert.equal(win.localStorage.getItem('notes:supabase-auth'), null);
});

test('login maps invalid credentials to a friendly message', async () => {
  const state = createState();
  state.loginError = { status: 400, message: 'Invalid login credentials' };
  const { api } = loadAdapter(configured(), state);

  await assert.rejects(api.login('alice@example.com', 'wrong', false), (error) => {
    assert.equal(error.status, 400);
    assert.equal(error.message, 'Email or password is incorrect.');
    return true;
  });
});

test('register reports needsConfirmation when email confirmation is on', async () => {
  const state = createState();
  state.confirmEmail = true;
  const { api } = loadAdapter(configured(), state);

  const result = await api.register('Alice', 'alice@example.com', 'secret', 'secret');

  assert.equal(result.needsConfirmation, true);
  assert.equal(result.user.username, 'Alice');
  assert.equal(state.lastSignUp.options.data.username, 'Alice');
  assert.equal(state.lastSignUp.email, 'alice@example.com');
});

test('register returns a session when confirmation is off', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  const result = await api.register('Alice', 'alice@example.com', 'secret', 'secret');

  assert.equal(result.needsConfirmation, false);
  assert.equal(result.user.id, USER.id);
});

test('register validates username and password confirmation locally', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  await assert.rejects(api.register('a', 'alice@example.com', 'secret', 'secret'), /Username/);
  await assert.rejects(api.register('Alice', 'alice@example.com', 'secret', 'different'), /Passwords do not match/);
  assert.equal(state.createClientCalls, 1);
});

test('changePassword reauthenticates, updates and revokes other sessions', async () => {
  const state = createState();
  state.session = { user: USER };
  const { api } = loadAdapter(configured(), state);

  await api.changePassword('old-password', 'new-password', 'new-password');

  assert.equal(state.lastLogin.email, 'alice@example.com');
  assert.equal(state.lastLogin.password, 'old-password');
  assert.equal(state.lastUpdate.password, 'new-password');
  assert.deepEqual(state.lastSignOut, { scope: 'others' });
});

test('changePassword rejects a wrong current password', async () => {
  const state = createState();
  state.session = { user: USER };
  state.loginError = { status: 400, message: 'Invalid login credentials' };
  const { api } = loadAdapter(configured(), state);

  await assert.rejects(
    api.changePassword('wrong', 'new-password', 'new-password'),
    /Current password is incorrect/
  );
  assert.equal(state.lastUpdate, null);
});

/* ------------------------------------------------------------------ */
/* Notes and folders                                                   */
/* ------------------------------------------------------------------ */

test('listNotes maps database columns to the frontend shape', async () => {
  const state = createState();
  state.tables.notes = [noteRow({ tags: ['work'], daily: '2026-01-02' })];
  const { api } = loadAdapter(configured(), state);

  const notes = await api.listNotes();

  assert.equal(notes.length, 1);
  assert.deepEqual(notes[0], {
    id: NOTE_ID,
    title: 'Existing',
    html: '<p>existing</p>',
    folderId: null,
    starred: false,
    trashed: false,
    pinned: false,
    archived: false,
    tags: ['work'],
    daily: '2026-01-02',
    createdAt: 1000,
    updatedAt: 2000
  });
});

test('createNote inserts a row and returns a UUID-backed note', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  const note = await api.createNote({
    title: 'Hello',
    html: '<p>Hi</p>',
    tags: ['#one', 'two'],
    starred: true
  });

  assert.match(note.id, /^[0-9a-f-]{36}$/i);
  assert.equal(note.title, 'Hello');
  assert.equal(note.starred, true);
  assert.deepEqual(note.tags, ['one', 'two']);
  assert.ok(note.createdAt > 0);

  const insert = state.calls.find((call) => call.table === 'notes' && call.op === 'insert');
  assert.equal(insert.values.title, 'Hello');
  assert.equal(insert.values.user_id, undefined);
});

test('updateNote saves a patch and returns the updated note', async () => {
  const state = createState();
  state.tables.notes = [noteRow()];
  const { api } = loadAdapter(configured(), state);

  const note = await api.updateNote(NOTE_ID, {
    title: 'Changed',
    html: '<p>changed</p>',
    folderId: null
  });

  assert.equal(note.title, 'Changed');
  assert.equal(state.tables.notes[0].title, 'Changed');
});

test('updateNote rejects an invalid id with 404', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  await assert.rejects(api.updateNote('n_not-a-uuid', { title: 'x' }), (error) => {
    assert.equal(error.status, 404);
    return true;
  });
});

test('deleteFolder detaches notes before deleting the folder', async () => {
  const state = createState();
  state.tables.folders = [{ id: FOLDER_ID, user_id: USER.id, name: 'Work', created_at: 1, updated_at: 1 }];
  state.tables.notes = [
    noteRow({ id: NOTE_ID, folder_id: FOLDER_ID }),
    noteRow({ id: OTHER_ID, folder_id: null })
  ];
  const { api } = loadAdapter(configured(), state);

  const result = await api.deleteFolder(FOLDER_ID);

  assert.equal(result.deleted, 1);
  assert.equal(state.tables.folders.length, 0);
  assert.equal(state.tables.notes[0].folder_id, null);
  assert.equal(state.tables.notes[1].folder_id, null);
});

test('listFolders maps rows and orders by creation time', async () => {
  const state = createState();
  state.tables.folders = [
    { id: FOLDER_ID, user_id: USER.id, name: 'Later', created_at: 20, updated_at: 20 },
    { id: OTHER_ID, user_id: USER.id, name: 'Earlier', created_at: 10, updated_at: 10 }
  ];
  const { api } = loadAdapter(configured(), state);

  const folders = await api.listFolders();

  assert.deepEqual(folders.map((folder) => folder.name), ['Earlier', 'Later']);
  assert.equal(folders[0].createdAt, 10);
});

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

test('createVersion skips empty, duplicate and too-frequent versions', async () => {
  const state = createState();
  state.tables.notes = [noteRow()];
  const { api } = loadAdapter(configured(), state);

  const empty = await api.createVersion(NOTE_ID, '', '', false);
  assert.equal(empty.skipped, true);

  const first = await api.createVersion(NOTE_ID, 'Title', '<p>one</p>', false);
  assert.equal(first.skipped, false);
  assert.equal(first.version.title, 'Title');

  const duplicate = await api.createVersion(NOTE_ID, 'Title', '<p>one</p>', true);
  assert.equal(duplicate.skipped, true);

  const tooSoon = await api.createVersion(NOTE_ID, 'Title', '<p>two</p>', false);
  assert.equal(tooSoon.skipped, true);

  const forced = await api.createVersion(NOTE_ID, 'Title', '<p>two</p>', true);
  assert.equal(forced.skipped, false);
});

test('createVersion keeps only the newest 12 versions', async () => {
  const state = createState();
  state.tables.notes = [noteRow()];
  state.tables.note_versions = Array.from({ length: 12 }, (_, index) => ({
    id: nodeCrypto.randomUUID(),
    user_id: USER.id,
    note_id: NOTE_ID,
    title: 'v' + index,
    html: '<p>' + index + '</p>',
    created_at: 1000 + index
  }));
  const { api } = loadAdapter(configured(), state);

  await api.createVersion(NOTE_ID, 'newest', '<p>newest</p>', true);

  assert.equal(state.tables.note_versions.length, 12);
  assert.ok(state.tables.note_versions.some((version) => version.title === 'newest'));
  assert.ok(!state.tables.note_versions.some((version) => version.title === 'v0'));
});

test('restoreVersion snapshots the current text and restores the old version', async () => {
  const state = createState();
  state.tables.notes = [noteRow({ title: 'Current', html: '<p>current</p>' })];
  state.tables.note_versions = [{
    id: VERSION_ID,
    user_id: USER.id,
    note_id: NOTE_ID,
    title: 'Old',
    html: '<p>old</p>',
    created_at: 500
  }];
  const { api } = loadAdapter(configured(), state);

  const note = await api.restoreVersion(NOTE_ID, VERSION_ID);

  assert.equal(note.title, 'Old');
  assert.equal(note.html, '<p>old</p>');
  assert.equal(state.tables.notes[0].title, 'Old');
  assert.ok(state.tables.note_versions.some((version) => version.title === 'Current'));
});

test('listVersions returns [] for an invalid note id', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  assert.deepEqual(await api.listVersions('n_local-id'), []);
});

/* ------------------------------------------------------------------ */
/* Import / export                                                     */
/* ------------------------------------------------------------------ */

test('importData remaps folder ids and preserves note timestamps', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  const result = await api.importData({
    app: 'notes',
    version: 1,
    folders: [{ id: 'old-folder', name: 'Work' }],
    notes: [
      {
        title: 'Inside',
        html: '<p>inside</p>',
        folderId: 'old-folder',
        createdAt: 123,
        updatedAt: 456,
        tags: ['tag']
      },
      {
        title: 'Loose',
        html: '<p>loose</p>',
        folderId: 'missing-folder'
      }
    ]
  });

  assert.deepEqual(result.imported, { folders: 1, notes: 2 });
  assert.equal(result.folders.length, 1);
  assert.equal(result.folders[0].name, 'Work');

  const inside = result.notes.find((note) => note.title === 'Inside');
  const loose = result.notes.find((note) => note.title === 'Loose');

  assert.equal(inside.folderId, result.folders[0].id);
  assert.equal(inside.createdAt, 123);
  assert.equal(inside.updatedAt, 456);
  assert.equal(loose.folderId, null);
});

test('importData accepts a bare array of notes', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  const result = await api.importData([
    { title: 'One', html: '<p>1</p>' },
    { title: 'Two', html: '<p>2</p>' }
  ]);

  assert.equal(result.imported.notes, 2);
  assert.equal(result.imported.folders, 0);
});

test('exportData returns the documented backup shape', async () => {
  const state = createState();
  state.tables.folders = [{ id: FOLDER_ID, user_id: USER.id, name: 'Work', created_at: 1, updated_at: 1 }];
  state.tables.notes = [noteRow()];
  const { api } = loadAdapter(configured(), state);

  const payload = await api.exportData();

  assert.equal(payload.app, 'notes');
  assert.equal(payload.version, 2);
  assert.equal(typeof payload.exportedAt, 'string');
  assert.equal(payload.folders.length, 1);
  assert.equal(payload.notes.length, 1);
});

/* ------------------------------------------------------------------ */
/* Unauthorized handling                                               */
/* ------------------------------------------------------------------ */

test('data errors with an expired JWT call the unauthorized handler', async () => {
  const state = createState();
  state.dataError = { status: 401, message: 'JWT expired' };
  const { api } = loadAdapter(configured(), state);

  let called = 0;
  api.setUnauthorizedHandler(() => { called += 1; });

  await assert.rejects(api.listNotes(), (error) => {
    assert.equal(error.status, 401);
    assert.equal(error.message, 'Your session expired. Please sign in again.');
    return true;
  });
  assert.equal(called, 1);
});

test('direct HTTP helpers are unavailable in Supabase mode', async () => {
  const state = createState();
  const { api } = loadAdapter(configured(), state);

  await assert.rejects(api.get('/api/notes'), /not available in Supabase mode/);
});
