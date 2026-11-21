/*
 * Supabase adapter for the Notes frontend.
 *
 * This file replaces window.NotesApi with an implementation backed by
 * Supabase Auth + Postgres (with Row Level Security) when assets/config.js
 * contains a project URL and anon key. If it does not, the local API client
 * in assets/api.js is left in place, so `npm.cmd start` keeps working.
 *
 * Security notes:
 *  - Only the public anon key is used here. The service_role key must never
 *    be shipped to a browser; this file refuses to start if it detects one.
 *  - Every table has RLS policies scoped to auth.uid(). The browser never
 *    sends a user id that the database trusts for row ownership.
 *  - Supabase Auth persists its own session token in browser storage. The
 *    adapter stores it in sessionStorage unless "Keep me signed in" was
 *    checked, in which case it uses localStorage. Note text is never written
 *    to browser storage.
 */
(function () {
  'use strict';

  var cfg = window.NotesConfig || {};
  var supabaseUrl = String(cfg.supabaseUrl || '').trim();
  var supabaseAnonKey = String(cfg.supabaseAnonKey || '').trim();

  /* No configuration: keep the local API client from assets/api.js. */
  if (!supabaseUrl || !supabaseAnonKey) return;

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[Notes] Supabase library is missing. Load assets/vendor/supabase.js before assets/api-supabase.js.');
    return;
  }

  var REMEMBER_KEY = 'notes:remember';
  var AUTH_STORAGE_KEY = 'notes:supabase-auth';
  var VERSION_LIMIT = 12;
  var VERSION_MIN_INTERVAL_MS = 90 * 1000;
  var MAX_IMPORT_NOTES = 5000;
  var MAX_IMPORT_FOLDERS = 500;
  var MAX_NOTE_HTML = 1000000;
  var MAX_TITLE = 200;
  var MAX_TAG = 24;
  var MAX_TAGS = 12;
  var MAX_FOLDER_NAME = 60;

  /* ---------- errors ---------- */

  function ApiError(message, status, code) {
    this.name = 'ApiError';
    this.message = message || 'Request failed.';
    this.status = status || 0;
    this.code = code || 'error';
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function rawMessage(error) {
    if (!error) return '';
    return String(error.message || error.error_description || error.details || '');
  }

  function friendlyMessage(error, fallback) {
    var raw = rawMessage(error);
    if (/Invalid login credentials/i.test(raw)) return 'Email or password is incorrect.';
    if (/Email not confirmed/i.test(raw)) return 'Confirm your email address before signing in.';
    if (/User already registered|already been registered|already registered/i.test(raw)) {
      return 'An account with that email already exists.';
    }
    if (/Password should be at least/i.test(raw)) return raw;
    if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(raw)) {
      return 'Cannot reach Supabase. Check your internet connection.';
    }
    if (/JWT expired|invalid JWT|Auth session missing/i.test(raw)) {
      return 'Your session expired. Please sign in again.';
    }
    if (/JSON object requested/i.test(raw)) return 'That item no longer exists.';
    if (/violates row-level security|new row violates row-level security/i.test(raw)) {
      return 'You do not have permission to change that item.';
    }
    return raw || fallback || 'Request failed.';
  }

  function isUnauthorized(error) {
    if (!error) return false;
    if (Number(error.status) === 401) return true;
    var code = String(error.code || '');
    if (code === 'PGRST301' || code === 'bad_jwt' || code === '401') return true;
    return /JWT expired|invalid JWT|not authenticated|Auth session missing|session.*expired/i.test(rawMessage(error));
  }

  function toApiError(error, fallback) {
    var status = Number(error && error.status) || 0;
    var code = String((error && error.code) || 'error');
    if (!status && isUnauthorized(error)) status = 401;
    if (!status && code === 'PGRST116') status = 404;
    return new ApiError(friendlyMessage(error, fallback), status, code);
  }

  function fail(error, fallback) {
    if (isUnauthorized(error)) notifyUnauthorized();
    throw toApiError(error, fallback);
  }

  function unauthorized() {
    return new ApiError('Please sign in.', 401, 'unauthorized');
  }

  /* ---------- configuration safety ---------- */

  function jwtRole(token) {
    try {
      var part = String(token).split('.')[1];
      if (!part) return null;
      var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var payload = JSON.parse(atob(b64));
      return payload && payload.role ? String(payload.role) : null;
    } catch (e) {
      return null;
    }
  }

  if (jwtRole(supabaseAnonKey) && jwtRole(supabaseAnonKey) !== 'anon') {
    console.error(
      '[Notes] Refusing to start: the configured Supabase key is not an anon/public key. ' +
      'Remove the service_role key from assets/config.js immediately.'
    );
    return;
  }

  /* ---------- auth storage (remember me) ---------- */

  function rememberEnabled() {
    try { return window.localStorage.getItem(REMEMBER_KEY) === '1'; } catch (e) { return false; }
  }

  function setRemember(on) {
    try {
      if (on) window.localStorage.setItem(REMEMBER_KEY, '1');
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch (e) {}
  }

  function activeStorage() {
    return rememberEnabled() ? window.localStorage : window.sessionStorage;
  }

  function clearStorageArea(area) {
    try {
      for (var i = area.length - 1; i >= 0; i -= 1) {
        var key = area.key(i);
        if (key && key.indexOf(AUTH_STORAGE_KEY) === 0) area.removeItem(key);
      }
    } catch (e) {}
  }

  function clearInactiveStorage() {
    clearStorageArea(rememberEnabled() ? window.sessionStorage : window.localStorage);
  }

  function clearLocalAuth() {
    setRemember(false);
    clearStorageArea(window.localStorage);
    clearStorageArea(window.sessionStorage);
  }

  var authStorage = {
    getItem: function (key) {
      try { return activeStorage().getItem(key); } catch (e) { return null; }
    },
    setItem: function (key, value) {
      try { activeStorage().setItem(key, value); } catch (e) {}
    },
    removeItem: function (key) {
      try { window.localStorage.removeItem(key); } catch (e) {}
      try { window.sessionStorage.removeItem(key); } catch (e) {}
    }
  };

  var client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: authStorage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  var unauthorizedHandler = null;

  function notifyUnauthorized() {
    if (typeof unauthorizedHandler !== 'function') return;
    try { unauthorizedHandler(); } catch (e) {}
  }

  client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') notifyUnauthorized();
  });

  /* ---------- helpers ---------- */

  function cleanString(value, max) {
    var text = String(value == null ? '' : value);
    return max ? text.slice(0, max) : text;
  }

  function cleanTags(value) {
    var seen = Object.create(null);
    var out = [];
    (Array.isArray(value) ? value : []).forEach(function (tag) {
      var name = String(tag || '').replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG);
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(name);
    });
    return out.slice(0, MAX_TAGS);
  }

  function cleanDaily(value) {
    var text = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    var date = new Date(text + 'T00:00:00Z');
    if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return null;
    return text;
  }

  function timestamp(value, fallback) {
    var number = Number(value);
    if (!isFinite(number) || number < 0) return fallback;
    return Math.floor(number);
  }

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function uuidOrNull(value) {
    var text = String(value || '');
    return UUID_RE.test(text) ? text : null;
  }

  function newUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    /* Fallback for older browsers; only used for import row ids. */
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function mapUser(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    var email = String(user.email || '');
    var username = String(meta.username || '').trim();
    if (!username) username = email.split('@')[0] || 'You';
    return {
      id: user.id,
      username: username,
      email: email,
      createdAt: Date.parse(user.created_at) || Date.now()
    };
  }

  function mapNote(row) {
    return {
      id: row.id,
      title: row.title || '',
      html: row.html || '',
      folderId: row.folder_id || null,
      starred: !!row.starred,
      trashed: !!row.trashed,
      pinned: !!row.pinned,
      archived: !!row.archived,
      tags: Array.isArray(row.tags) ? row.tags : [],
      daily: row.daily || null,
      createdAt: Number(row.created_at) || 0,
      updatedAt: Number(row.updated_at) || 0
    };
  }

  function mapFolder(row) {
    return {
      id: row.id,
      name: row.name || '',
      createdAt: Number(row.created_at) || 0,
      updatedAt: Number(row.updated_at) || 0
    };
  }

  function mapVersion(row) {
    return {
      id: row.id,
      noteId: row.note_id,
      title: row.title || '',
      html: row.html || '',
      createdAt: Number(row.created_at) || 0
    };
  }

  function noteRow(note) {
    return {
      title: cleanString(note && note.title, MAX_TITLE),
      html: cleanString(note && note.html, MAX_NOTE_HTML),
      folder_id: uuidOrNull(note && note.folderId),
      starred: !!(note && note.starred),
      trashed: !!(note && note.trashed),
      pinned: !!(note && note.pinned),
      archived: !!(note && note.archived),
      tags: cleanTags(note && note.tags),
      daily: cleanDaily(note && note.daily)
    };
  }

  function cleanAuthHash() {
    var hash = window.location.hash || '';
    if (!/(access_token|refresh_token|error_description|error)=/.test(hash)) return;
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
      window.location.hash = '';
    }
  }

  /* ---------- auth ---------- */

  function me() {
    return client.auth.getSession().then(function (result) {
      if (result.error) fail(result.error, 'Could not check your session.');
      var session = result.data && result.data.session;
      if (!session) throw unauthorized();

      return client.auth.getUser().then(function (userResult) {
        if (userResult.error) {
          if (isUnauthorized(userResult.error)) {
            clearLocalAuth();
            throw unauthorized();
          }
          fail(userResult.error, 'Could not verify your session.');
        }
        var user = userResult.data && userResult.data.user;
        if (!user) throw unauthorized();
        cleanAuthHash();
        return { user: mapUser(user), csrfToken: null };
      });
    });
  }

  function login(email, password, rememberMe) {
    var previousRemember = rememberEnabled();
    setRemember(!!rememberMe);

    return client.auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || '')
    }).then(function (result) {
      if (result.error) {
        setRemember(previousRemember);
        fail(result.error, 'Could not sign in.');
      }
      if (!result.data || !result.data.user) {
        setRemember(previousRemember);
        throw new ApiError('Could not sign in.', 0, 'auth_error');
      }
      /* The new session is in the chosen storage; drop any older session
         from the other storage area. */
      clearInactiveStorage();
      return { user: mapUser(result.data.user), csrfToken: null };
    }, function (error) {
      setRemember(previousRemember);
      throw toApiError(error, 'Could not sign in.');
    });
  }

  function register(username, email, password, passwordConfirm) {
    var name = String(username || '').trim();
    if (name.length < 3 || name.length > 32 || !/^[A-Za-z0-9_.-]+$/.test(name)) {
      return Promise.reject(new ApiError(
        'Username must be 3-32 characters and use only letters, numbers, dots, dashes or underscores.',
        400,
        'invalid_input'
      ));
    }
    if (String(password || '') !== String(passwordConfirm || '')) {
      return Promise.reject(new ApiError('Passwords do not match.', 400, 'invalid_input'));
    }

    /* New accounts are not "remembered" unless the user logs in with that box checked. */
    var previousRemember = rememberEnabled();
    setRemember(false);

    return client.auth.signUp({
      email: String(email || '').trim(),
      password: String(password || ''),
      options: { data: { username: name } }
    }).then(function (result) {
      if (result.error) {
        setRemember(previousRemember);
        fail(result.error, 'Could not create your account.');
      }
      var user = result.data && result.data.user;
      var session = result.data && result.data.session;
      if (!user) {
        setRemember(previousRemember);
        throw new ApiError('Could not create your account.', 0, 'auth_error');
      }

      /* New sessions live in sessionStorage; clear any old remembered one. */
      clearStorageArea(window.localStorage);

      return {
        user: mapUser(user),
        csrfToken: null,
        needsConfirmation: !session
      };
    }, function (error) {
      setRemember(previousRemember);
      throw toApiError(error, 'Could not create your account.');
    });
  }

  function logout() {
    return client.auth.signOut().then(function (result) {
      clearLocalAuth();
      if (result && result.error && !/session/i.test(rawMessage(result.error))) {
        throw toApiError(result.error, 'Could not sign out.');
      }
      return { ok: true };
    }, function (error) {
      clearLocalAuth();
      throw toApiError(error, 'Could not sign out.');
    });
  }

  function changePassword(currentPassword, newPassword, confirmPassword) {
    if (String(newPassword || '') !== String(confirmPassword || '')) {
      return Promise.reject(new ApiError('New passwords do not match.', 400, 'invalid_input'));
    }

    return client.auth.getUser().then(function (result) {
      if (result.error) fail(result.error, 'Could not verify your account.');
      var user = result.data && result.data.user;
      if (!user || !user.email) throw unauthorized();

      return client.auth.signInWithPassword({
        email: user.email,
        password: String(currentPassword || '')
      }).then(function (check) {
        if (check.error) {
          throw new ApiError('Current password is incorrect.', 400, 'invalid_credentials');
        }
        return client.auth.updateUser({ password: String(newPassword || '') });
      });
    }).then(function (result) {
      if (result && result.error) fail(result.error, 'Could not update your password.');
      /* Best effort: revoke other devices, keep this session signed in. */
      return client.auth.signOut({ scope: 'others' }).catch(function () {});
    }).then(function () {
      return { ok: true };
    });
  }

  /* ---------- notes ---------- */

  function listNotes() {
    return client.from('notes').select('*').order('updated_at', { ascending: false })
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not load your notes.');
        return (result.data || []).map(mapNote);
      });
  }

  function createNote(note) {
    var row = noteRow(note);
    row.created_at = Date.now();
    row.updated_at = row.created_at;

    return client.from('notes').insert(row).select().single().then(function (result) {
      if (result.error) fail(result.error, 'Could not create that note.');
      return mapNote(result.data);
    });
  }

  function updateNote(id, note) {
    if (!uuidOrNull(id)) return Promise.reject(new ApiError('That note no longer exists.', 404, 'not_found'));

    return client.from('notes').update(noteRow(note)).eq('id', id).select().single()
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not save that note.');
        return mapNote(result.data);
      });
  }

  function deleteNote(id) {
    if (!uuidOrNull(id)) return Promise.resolve({ deleted: 0 });
    return client.from('notes').delete().eq('id', id).select('id').then(function (result) {
      if (result.error) fail(result.error, 'Could not delete that note.');
      return { deleted: (result.data || []).length };
    });
  }

  function emptyTrash() {
    return client.from('notes').delete().eq('trashed', true).select('id').then(function (result) {
      if (result.error) fail(result.error, 'Could not empty the trash.');
      return { deleted: (result.data || []).length };
    });
  }

  /* ---------- folders ---------- */

  function listFolders() {
    return client.from('folders').select('*').order('created_at', { ascending: true })
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not load your folders.');
        return (result.data || []).map(mapFolder);
      });
  }

  function createFolder(name) {
    var cleanName = cleanString(name, MAX_FOLDER_NAME).trim();
    if (!cleanName) return Promise.reject(new ApiError('Folder name is required.', 400, 'invalid_input'));

    return client.from('folders').insert({ name: cleanName }).select().single()
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not create that folder.');
        return mapFolder(result.data);
      });
  }

  function renameFolder(id, name) {
    if (!uuidOrNull(id)) return Promise.reject(new ApiError('That folder no longer exists.', 404, 'not_found'));
    var cleanName = cleanString(name, MAX_FOLDER_NAME).trim();
    if (!cleanName) return Promise.reject(new ApiError('Folder name is required.', 400, 'invalid_input'));

    return client.from('folders').update({ name: cleanName }).eq('id', id).select().single()
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not rename that folder.');
        return mapFolder(result.data);
      });
  }

  function deleteFolder(id) {
    if (!uuidOrNull(id)) return Promise.resolve({ deleted: 0 });

    /* Detach notes first so the UI never keeps a dangling folder id. The FK
       also uses ON DELETE SET NULL (folder_id), but doing it explicitly keeps
       this working on older Postgres versions. */
    return client.from('notes').update({ folder_id: null }).eq('folder_id', id).then(function (detach) {
      if (detach.error) fail(detach.error, 'Could not update the notes in that folder.');
      return client.from('folders').delete().eq('id', id).select('id');
    }).then(function (result) {
      if (result.error) fail(result.error, 'Could not delete that folder.');
      return { deleted: (result.data || []).length };
    });
  }

  /* ---------- versions ---------- */

  function listVersions(noteId) {
    if (!uuidOrNull(noteId)) return Promise.resolve([]);

    return client.from('note_versions').select('*').eq('note_id', noteId)
      .order('created_at', { ascending: false }).limit(VERSION_LIMIT)
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not load version history.');
        return (result.data || []).map(mapVersion);
      });
  }

  function pruneVersions(noteId) {
    return client.from('note_versions').select('id').eq('note_id', noteId)
      .order('created_at', { ascending: false }).then(function (result) {
        if (result.error) return;
        var extra = (result.data || []).slice(VERSION_LIMIT).map(function (row) { return row.id; });
        if (!extra.length) return;
        return client.from('note_versions').delete().in('id', extra);
      });
  }

  function createVersion(noteId, title, html, force) {
    if (!uuidOrNull(noteId)) return Promise.resolve({ skipped: true, version: null });

    var cleanTitle = cleanString(title, MAX_TITLE);
    var cleanHtml = cleanString(html, MAX_NOTE_HTML);
    if (!cleanTitle && !cleanHtml) return Promise.resolve({ skipped: true, version: null });

    return client.from('note_versions').select('*').eq('note_id', noteId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(function (latestResult) {
        if (latestResult.error) fail(latestResult.error, 'Could not save version history.');

        var latest = latestResult.data ? mapVersion(latestResult.data) : null;
        if (latest && latest.title === cleanTitle && latest.html === cleanHtml) {
          return { skipped: true, version: latest };
        }
        if (latest && !force && Date.now() - latest.createdAt < VERSION_MIN_INTERVAL_MS) {
          return { skipped: true, version: latest };
        }

        return client.from('note_versions').insert({
          note_id: noteId,
          title: cleanTitle,
          html: cleanHtml,
          created_at: Date.now()
        }).select().single().then(function (inserted) {
          if (inserted.error) fail(inserted.error, 'Could not save version history.');
          var version = mapVersion(inserted.data);
          return pruneVersions(noteId).then(function () {
            return { skipped: false, version: version };
          });
        });
      });
  }

  function restoreVersion(noteId, versionId) {
    if (!uuidOrNull(noteId) || !uuidOrNull(versionId)) {
      return Promise.reject(new ApiError('That version no longer exists.', 404, 'not_found'));
    }

    return client.from('note_versions').select('*').eq('id', versionId).eq('note_id', noteId)
      .maybeSingle().then(function (versionResult) {
        if (versionResult.error) fail(versionResult.error, 'Could not restore that version.');
        if (!versionResult.data) throw new ApiError('That version no longer exists.', 404, 'not_found');

        return client.from('notes').select('*').eq('id', noteId).single().then(function (noteResult) {
          if (noteResult.error) fail(noteResult.error, 'Could not restore that version.');
          var current = mapNote(noteResult.data);
          var version = mapVersion(versionResult.data);

          /* Keep the current text as a version before overwriting it. */
          return client.from('note_versions').insert({
            note_id: noteId,
            title: current.title,
            html: current.html,
            created_at: Date.now()
          }).then(function (snapshot) {
            if (snapshot.error) fail(snapshot.error, 'Could not save the current text first.');

            return client.from('notes').update({
              title: version.title,
              html: version.html
            }).eq('id', noteId).select().single().then(function (updated) {
              if (updated.error) fail(updated.error, 'Could not restore that version.');
              return pruneVersions(noteId).then(function () {
                return mapNote(updated.data);
              });
            });
          });
        });
      });
  }

  function deleteVersions(noteId) {
    if (!uuidOrNull(noteId)) return Promise.resolve({ deleted: 0 });
    return client.from('note_versions').delete().eq('note_id', noteId).select('id')
      .then(function (result) {
        if (result.error) fail(result.error, 'Could not delete version history.');
        return { deleted: (result.data || []).length };
      });
  }

  /* ---------- import / export ---------- */

  function chunkRows(rows, maxRows, maxChars) {
    var batches = [];
    var current = [];
    var size = 0;

    rows.forEach(function (row) {
      var rowSize = JSON.stringify(row).length;
      if (current.length && (current.length >= maxRows || size + rowSize > maxChars)) {
        batches.push(current);
        current = [];
        size = 0;
      }
      current.push(row);
      size += rowSize;
    });
    if (current.length) batches.push(current);
    return batches;
  }

  function insertInBatches(table, rows, maxRows, maxChars, fallback) {
    var batches = chunkRows(rows, maxRows, maxChars);
    var chain = Promise.resolve();

    batches.forEach(function (batch) {
      chain = chain.then(function () {
        return client.from(table).insert(batch).then(function (result) {
          if (result.error) fail(result.error, fallback);
        });
      });
    });

    return chain;
  }

  function importData(payload) {
    var source = Array.isArray(payload) ? { notes: payload, folders: [] } : (payload || {});
    var sourceFolders = Array.isArray(source.folders) ? source.folders : [];
    var sourceNotes = Array.isArray(source.notes) ? source.notes : [];

    if (sourceNotes.length > MAX_IMPORT_NOTES) {
      return Promise.reject(new ApiError('That backup has too many notes (limit ' + MAX_IMPORT_NOTES + ').', 400, 'invalid_input'));
    }
    if (sourceFolders.length > MAX_IMPORT_FOLDERS) {
      return Promise.reject(new ApiError('That backup has too many folders (limit ' + MAX_IMPORT_FOLDERS + ').', 400, 'invalid_input'));
    }

    var folderRows = [];
    var folderMap = Object.create(null);
    var now = Date.now();

    sourceFolders.forEach(function (folder) {
      var name = cleanString(folder && folder.name, MAX_FOLDER_NAME).trim();
      if (!name) return;
      var id = newUuid();
      folderRows.push({ id: id, name: name, created_at: now, updated_at: now });
      if (folder && typeof folder.id === 'string') folderMap[folder.id] = id;
    });

    var noteRows = [];
    sourceNotes.forEach(function (note) {
      if (!note || typeof note !== 'object') return;
      var row = noteRow(note);
      row.id = newUuid();
      row.created_at = timestamp(note.createdAt, now);
      row.updated_at = timestamp(note.updatedAt, row.created_at);
      row.folder_id = note.folderId && folderMap[note.folderId]
        ? folderMap[note.folderId]
        : null;
      noteRows.push(row);
    });

    return insertInBatches('folders', folderRows, 200, 1000000, 'Could not import your folders.')
      .then(function () {
        return insertInBatches('notes', noteRows, 100, 8000000, 'Could not import your notes.');
      })
      .then(function () {
        return Promise.all([listFolders(), listNotes()]);
      })
      .then(function (results) {
        return {
          folders: results[0],
          notes: results[1],
          imported: { folders: folderRows.length, notes: noteRows.length }
        };
      });
  }

  function exportData() {
    return Promise.all([listFolders(), listNotes()]).then(function (results) {
      return {
        app: 'notes',
        version: 2,
        exportedAt: new Date().toISOString(),
        folders: results[0],
        notes: results[1]
      };
    });
  }

  /* ---------- public interface ---------- */

  function notePayload(note) {
    return {
      title: (note && note.title) || '',
      html: (note && note.html) || '',
      folderId: (note && note.folderId) || null,
      starred: !!(note && note.starred),
      trashed: !!(note && note.trashed),
      pinned: !!(note && note.pinned),
      archived: !!(note && note.archived),
      tags: Array.isArray(note && note.tags) ? note.tags : [],
      daily: (note && note.daily) || null
    };
  }

  function unsupported() {
    return Promise.reject(new ApiError(
      'Direct HTTP requests are not available in Supabase mode.',
      0,
      'unsupported'
    ));
  }

  window.NotesApi = {
    backend: 'supabase',
    ApiError: ApiError,
    setCsrf: function () {},
    getCsrf: function () { return null; },
    setUnauthorizedHandler: function (handler) {
      unauthorizedHandler = typeof handler === 'function' ? handler : null;
    },
    request: unsupported,
    get: unsupported,
    post: unsupported,
    put: unsupported,
    del: unsupported,
    notePayload: notePayload,

    me: me,
    login: login,
    register: register,
    logout: logout,
    changePassword: changePassword,

    listNotes: listNotes,
    createNote: createNote,
    updateNote: updateNote,
    deleteNote: deleteNote,
    emptyTrash: emptyTrash,

    listVersions: listVersions,
    createVersion: createVersion,
    restoreVersion: restoreVersion,
    deleteVersions: deleteVersions,

    listFolders: listFolders,
    createFolder: createFolder,
    renameFolder: renameFolder,
    deleteFolder: deleteFolder,

    importData: importData,
    exportData: exportData
  };
})();
