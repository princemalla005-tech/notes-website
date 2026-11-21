'use strict';

const config = require('./config');
const crypto = require('node:crypto');
const {
  encryptText,
  decryptText,
  wrapUserKey,
  unwrapUserKey,
  randomId,
  DEK_BYTES
} = require('./crypto');
const { transaction } = require('./db');
const {
  sanitizeNoteHtml,
  sanitizeTitle,
  sanitizeTags,
  sanitizeDaily,
  sanitizeFolderName
} = require('./sanitize');

const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,100}$/;

function isId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function newId() {
  return randomId();
}

function toTimestamp(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function toBool(value) {
  return value ? 1 : 0;
}

function decryptField(ciphertext, iv, tag, key, aad) {
  try {
    return decryptText(
      Buffer.from(ciphertext),
      Buffer.from(iv),
      Buffer.from(tag),
      key,
      aad
    );
  } catch {
    throw new Error(
      'Failed to decrypt stored data. The database and master key do not match.'
    );
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.created_at
  };
}

function createStore(db, masterKey) {
  const statements = {
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email_norm = ?'),
    userKey: db.prepare('SELECT * FROM user_keys WHERE user_id = ?'),
    noteRow: db.prepare('SELECT * FROM notes WHERE user_id = ? AND id = ?'),
    folderRow: db.prepare('SELECT * FROM folders WHERE user_id = ? AND id = ?'),
    versionRow: db.prepare(
      'SELECT * FROM note_versions WHERE user_id = ? AND id = ?'
    )
  };

  function getUserById(userId) {
    return statements.userById.get(userId) || null;
  }

  function getUserByEmail(emailNorm) {
    return statements.userByEmail.get(emailNorm) || null;
  }

  function getDek(userId) {
    const row = statements.userKey.get(userId);
    if (!row) throw new Error('Encryption key is missing for this account.');
    return unwrapUserKey(
      {
        ciphertext: row.wrapped_dek,
        iv: row.wrap_iv,
        tag: row.wrap_tag
      },
      masterKey,
      userId
    );
  }

  function createUser(input) {
    const userId = newId();
    const created = Date.now();

    return transaction(db, () => {
      db.prepare(
        `INSERT INTO users (
          id, username, username_norm, email, email_norm,
          password_hash, password_salt, password_params, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        input.username,
        input.username.toLowerCase(),
        input.email,
        input.email.toLowerCase(),
        input.passwordHash,
        input.passwordSalt,
        JSON.stringify(input.passwordParams),
        created,
        created
      );

      const dek = crypto.randomBytes(DEK_BYTES);
      const wrapped = wrapUserKey(dek, masterKey, userId);
      db.prepare(
        `INSERT INTO user_keys (user_id, wrapped_dek, wrap_iv, wrap_tag, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(userId, wrapped.ciphertext, wrapped.iv, wrapped.tag, created);

      return publicUser(statements.userById.get(userId));
    });
  }

  function updateUserPassword(userId, passwordHash, passwordSalt, passwordParams) {
    db.prepare(
      `UPDATE users
       SET password_hash = ?, password_salt = ?, password_params = ?, updated_at = ?
       WHERE id = ?`
    ).run(passwordHash, passwordSalt, JSON.stringify(passwordParams), Date.now(), userId);
  }

  /* ---------- notes ---------- */

  function noteAad(userId, noteId, field) {
    return `note:${userId}:${noteId}:${field}`;
  }

  function mapNoteRow(row, dek) {
    if (!row) return null;
    const tagsText = decryptField(
      row.tags_enc,
      row.tags_iv,
      row.tags_tag,
      dek,
      noteAad(row.user_id, row.id, 'tags')
    );
    let tags = [];
    try {
      const parsed = JSON.parse(tagsText || '[]');
      if (Array.isArray(parsed)) tags = parsed;
    } catch {
      tags = [];
    }

    const dailyText = decryptField(
      row.daily_enc,
      row.daily_iv,
      row.daily_tag,
      dek,
      noteAad(row.user_id, row.id, 'daily')
    );

    return {
      id: row.id,
      title: decryptField(
        row.title_enc,
        row.title_iv,
        row.title_tag,
        dek,
        noteAad(row.user_id, row.id, 'title')
      ),
      html: decryptField(
        row.html_enc,
        row.html_iv,
        row.html_tag,
        dek,
        noteAad(row.user_id, row.id, 'html')
      ),
      folderId: row.folder_id || null,
      starred: !!row.starred,
      trashed: !!row.trashed,
      pinned: !!row.pinned,
      archived: !!row.archived,
      tags,
      daily: dailyText || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function getNote(userId, noteId) {
    if (!isId(noteId)) return null;
    const row = statements.noteRow.get(userId, noteId);
    if (!row) return null;
    return mapNoteRow(row, getDek(userId));
  }

  function listNotes(userId) {
    const dek = getDek(userId);
    const rows = db
      .prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId);
    return rows.map((row) => mapNoteRow(row, dek));
  }

  function folderExists(userId, folderId) {
    if (!folderId || !isId(folderId)) return false;
    return !!statements.folderRow.get(userId, folderId);
  }

  function insertNoteRow(userId, dek, data, forcedId) {
    const noteId = isId(forcedId) && !statements.noteRow.get(userId, forcedId)
      ? forcedId
      : newId();
    const now = Date.now();
    const createdAt = toTimestamp(data.createdAt, now);
    const updatedAt = toTimestamp(data.updatedAt, now);
    const title = sanitizeTitle(data.title);
    const html = sanitizeNoteHtml(data.html);
    const tags = sanitizeTags(data.tags);
    const daily = sanitizeDaily(data.daily);
    const folderId = folderExists(userId, data.folderId) ? data.folderId : null;

    const titleEnc = encryptText(title, dek, noteAad(userId, noteId, 'title'));
    const htmlEnc = encryptText(html, dek, noteAad(userId, noteId, 'html'));
    const tagsEnc = encryptText(
      JSON.stringify(tags),
      dek,
      noteAad(userId, noteId, 'tags')
    );
    const dailyEnc = encryptText(daily || '', dek, noteAad(userId, noteId, 'daily'));

    db.prepare(
      `INSERT INTO notes (
        user_id, id, title_enc, title_iv, title_tag,
        html_enc, html_iv, html_tag,
        tags_enc, tags_iv, tags_tag,
        daily_enc, daily_iv, daily_tag,
        folder_id, starred, trashed, pinned, archived,
        created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      noteId,
      titleEnc.ciphertext,
      titleEnc.iv,
      titleEnc.tag,
      htmlEnc.ciphertext,
      htmlEnc.iv,
      htmlEnc.tag,
      tagsEnc.ciphertext,
      tagsEnc.iv,
      tagsEnc.tag,
      dailyEnc.ciphertext,
      dailyEnc.iv,
      dailyEnc.tag,
      folderId,
      toBool(data.starred),
      toBool(data.trashed),
      toBool(data.pinned),
      toBool(data.archived),
      createdAt,
      updatedAt,
      1
    );

    return noteId;
  }

  function createNote(userId, data) {
    return transaction(db, () => {
      const dek = getDek(userId);
      const noteId = insertNoteRow(userId, dek, data, data.id);
      return mapNoteRow(statements.noteRow.get(userId, noteId), dek);
    });
  }

  function applyNotePatch(userId, noteId, patch, dek) {
    const row = statements.noteRow.get(userId, noteId);
    if (!row) return null;

    const current = mapNoteRow(row, dek);
    const next = {
      title: patch.title === undefined ? current.title : patch.title,
      html: patch.html === undefined ? current.html : patch.html,
      tags: patch.tags === undefined ? current.tags : patch.tags,
      daily: patch.daily === undefined ? current.daily : patch.daily,
      folderId: patch.folderId === undefined ? current.folderId : patch.folderId,
      starred: patch.starred === undefined ? current.starred : !!patch.starred,
      trashed: patch.trashed === undefined ? current.trashed : !!patch.trashed,
      pinned: patch.pinned === undefined ? current.pinned : !!patch.pinned,
      archived: patch.archived === undefined ? current.archived : !!patch.archived
    };

    const title = sanitizeTitle(next.title);
    const html = sanitizeNoteHtml(next.html);
    const tags = sanitizeTags(next.tags);
    const daily = sanitizeDaily(next.daily);
    const folderId = folderExists(userId, next.folderId) ? next.folderId : null;
    const updatedAt = Date.now();

    const titleEnc = encryptText(title, dek, noteAad(userId, noteId, 'title'));
    const htmlEnc = encryptText(html, dek, noteAad(userId, noteId, 'html'));
    const tagsEnc = encryptText(
      JSON.stringify(tags),
      dek,
      noteAad(userId, noteId, 'tags')
    );
    const dailyEnc = encryptText(daily || '', dek, noteAad(userId, noteId, 'daily'));

    db.prepare(
      `UPDATE notes SET
        title_enc = ?, title_iv = ?, title_tag = ?,
        html_enc = ?, html_iv = ?, html_tag = ?,
        tags_enc = ?, tags_iv = ?, tags_tag = ?,
        daily_enc = ?, daily_iv = ?, daily_tag = ?,
        folder_id = ?, starred = ?, trashed = ?, pinned = ?, archived = ?,
        updated_at = ?, version = version + 1
      WHERE user_id = ? AND id = ?`
    ).run(
      titleEnc.ciphertext,
      titleEnc.iv,
      titleEnc.tag,
      htmlEnc.ciphertext,
      htmlEnc.iv,
      htmlEnc.tag,
      tagsEnc.ciphertext,
      tagsEnc.iv,
      tagsEnc.tag,
      dailyEnc.ciphertext,
      dailyEnc.iv,
      dailyEnc.tag,
      folderId,
      toBool(next.starred),
      toBool(next.trashed),
      toBool(next.pinned),
      toBool(next.archived),
      updatedAt,
      userId,
      noteId
    );

    return mapNoteRow(statements.noteRow.get(userId, noteId), dek);
  }

  function updateNote(userId, noteId, patch) {
    if (!isId(noteId)) return null;
    return transaction(db, () => {
      const row = statements.noteRow.get(userId, noteId);
      if (!row) return null;
      return applyNotePatch(userId, noteId, patch, getDek(userId));
    });
  }

  function deleteNote(userId, noteId) {
    if (!isId(noteId)) return false;
    const result = db
      .prepare('DELETE FROM notes WHERE user_id = ? AND id = ?')
      .run(userId, noteId);
    return Number(result.changes || 0) > 0;
  }

  function emptyTrash(userId) {
    const result = db
      .prepare('DELETE FROM notes WHERE user_id = ? AND trashed = 1')
      .run(userId);
    return Number(result.changes || 0);
  }

  /* ---------- folders ---------- */

  function folderAad(userId, folderId) {
    return `folder:${userId}:${folderId}:name`;
  }

  function mapFolderRow(row, dek) {
    return {
      id: row.id,
      name: decryptField(
        row.name_enc,
        row.name_iv,
        row.name_tag,
        dek,
        folderAad(row.user_id, row.id)
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function listFolders(userId) {
    const dek = getDek(userId);
    const rows = db
      .prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC')
      .all(userId);
    return rows.map((row) => mapFolderRow(row, dek));
  }

  function insertFolderRow(userId, dek, name, forcedId) {
    const folderId = isId(forcedId) && !statements.folderRow.get(userId, forcedId)
      ? forcedId
      : newId();
    const now = Date.now();
    const cleanName = sanitizeFolderName(name);
    const enc = encryptText(cleanName, dek, folderAad(userId, folderId));

    db.prepare(
      `INSERT INTO folders (user_id, id, name_enc, name_iv, name_tag, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, folderId, enc.ciphertext, enc.iv, enc.tag, now, now);

    return folderId;
  }

  function createFolder(userId, name) {
    return transaction(db, () => {
      const dek = getDek(userId);
      const folderId = insertFolderRow(userId, dek, name);
      return mapFolderRow(statements.folderRow.get(userId, folderId), dek);
    });
  }

  function renameFolder(userId, folderId, name) {
    if (!isId(folderId)) return null;
    return transaction(db, () => {
      const row = statements.folderRow.get(userId, folderId);
      if (!row) return null;
      const dek = getDek(userId);
      const cleanName = sanitizeFolderName(name);
      const enc = encryptText(cleanName, dek, folderAad(userId, folderId));
      db.prepare(
        `UPDATE folders SET name_enc = ?, name_iv = ?, name_tag = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`
      ).run(enc.ciphertext, enc.iv, enc.tag, Date.now(), userId, folderId);
      return mapFolderRow(statements.folderRow.get(userId, folderId), dek);
    });
  }

  function deleteFolder(userId, folderId) {
    if (!isId(folderId)) return false;
    return transaction(db, () => {
      const row = statements.folderRow.get(userId, folderId);
      if (!row) return false;
      db.prepare(
        'UPDATE notes SET folder_id = NULL, updated_at = ? WHERE user_id = ? AND folder_id = ?'
      ).run(Date.now(), userId, folderId);
      db.prepare('DELETE FROM folders WHERE user_id = ? AND id = ?').run(userId, folderId);
      return true;
    });
  }

  /* ---------- versions ---------- */

  function versionAad(userId, versionId, field) {
    return `version:${userId}:${versionId}:${field}`;
  }

  function mapVersionRow(row, dek) {
    return {
      id: row.id,
      noteId: row.note_id,
      title: decryptField(
        row.title_enc,
        row.title_iv,
        row.title_tag,
        dek,
        versionAad(row.user_id, row.id, 'title')
      ),
      html: decryptField(
        row.html_enc,
        row.html_iv,
        row.html_tag,
        dek,
        versionAad(row.user_id, row.id, 'html')
      ),
      createdAt: row.created_at
    };
  }

  function listVersions(userId, noteId) {
    if (!isId(noteId)) return null;
    if (!statements.noteRow.get(userId, noteId)) return null;
    const dek = getDek(userId);
    const rows = db
      .prepare(
        `SELECT * FROM note_versions
         WHERE user_id = ? AND note_id = ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, noteId, config.VERSION_LIMIT);
    return rows.map((row) => mapVersionRow(row, dek));
  }

  function createVersion(userId, noteId, data = {}) {
    if (!isId(noteId)) return null;

    return transaction(db, () => {
      const noteRow = statements.noteRow.get(userId, noteId);
      if (!noteRow) return null;
      const dek = getDek(userId);

      const title = sanitizeTitle(data.title);
      const html = sanitizeNoteHtml(data.html);
      if (!title && !html) return { skipped: true, version: null };

      const latest = db
        .prepare(
          `SELECT * FROM note_versions
           WHERE user_id = ? AND note_id = ?
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(userId, noteId);

      if (latest) {
        const last = mapVersionRow(latest, dek);
        if (last.title === title && last.html === html) {
          return { skipped: true, version: last };
        }
        if (!data.force && Date.now() - last.createdAt < config.VERSION_MIN_INTERVAL_MS) {
          return { skipped: true, version: last };
        }
      }

      const versionId = newId();
      const created = Date.now();
      const titleEnc = encryptText(title, dek, versionAad(userId, versionId, 'title'));
      const htmlEnc = encryptText(html, dek, versionAad(userId, versionId, 'html'));

      db.prepare(
        `INSERT INTO note_versions (
          user_id, id, note_id, title_enc, title_iv, title_tag,
          html_enc, html_iv, html_tag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        versionId,
        noteId,
        titleEnc.ciphertext,
        titleEnc.iv,
        titleEnc.tag,
        htmlEnc.ciphertext,
        htmlEnc.iv,
        htmlEnc.tag,
        created
      );

      db.prepare(
        `DELETE FROM note_versions
         WHERE user_id = ? AND note_id = ? AND id NOT IN (
           SELECT id FROM note_versions
           WHERE user_id = ? AND note_id = ?
           ORDER BY created_at DESC LIMIT ?
         )`
      ).run(userId, noteId, userId, noteId, config.VERSION_LIMIT);

      return {
        skipped: false,
        version: mapVersionRow(statements.versionRow.get(userId, versionId), dek)
      };
    });
  }

  function restoreVersion(userId, noteId, versionId) {
    if (!isId(noteId) || !isId(versionId)) return null;

    return transaction(db, () => {
      const versionRow = statements.versionRow.get(userId, versionId);
      if (!versionRow || versionRow.note_id !== noteId) return null;
      const dek = getDek(userId);
      const version = mapVersionRow(versionRow, dek);
      const noteRow = statements.noteRow.get(userId, noteId);
      if (!noteRow) return null;
      const current = mapNoteRow(noteRow, dek);

      const snapshotId = newId();
      const snapshotAt = Date.now();
      const snapTitle = encryptText(
        sanitizeTitle(current.title),
        dek,
        versionAad(userId, snapshotId, 'title')
      );
      const snapHtml = encryptText(
        sanitizeNoteHtml(current.html),
        dek,
        versionAad(userId, snapshotId, 'html')
      );
      db.prepare(
        `INSERT INTO note_versions (
          user_id, id, note_id, title_enc, title_iv, title_tag,
          html_enc, html_iv, html_tag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        snapshotId,
        noteId,
        snapTitle.ciphertext,
        snapTitle.iv,
        snapTitle.tag,
        snapHtml.ciphertext,
        snapHtml.iv,
        snapHtml.tag,
        snapshotAt
      );

      return applyNotePatch(
        userId,
        noteId,
        { title: version.title, html: version.html },
        dek
      );
    });
  }

  function deleteVersions(userId, noteId) {
    if (!isId(noteId)) return 0;
    const result = db
      .prepare('DELETE FROM note_versions WHERE user_id = ? AND note_id = ?')
      .run(userId, noteId);
    return Number(result.changes || 0);
  }

  /* ---------- import / export ---------- */

  function importData(userId, payload) {
    const folders = Array.isArray(payload.folders) ? payload.folders : [];
    const notes = Array.isArray(payload.notes) ? payload.notes : [];

    return transaction(db, () => {
      const dek = getDek(userId);
      const folderMap = new Map();
      let folderCount = 0;

      for (const folder of folders) {
        const name = sanitizeFolderName(folder && folder.name);
        if (!name) continue;
        const folderId = insertFolderRow(userId, dek, name);
        if (folder && typeof folder.id === 'string') {
          folderMap.set(folder.id, folderId);
        }
        folderCount += 1;
      }

      let noteCount = 0;
      for (const note of notes) {
        if (!note || typeof note !== 'object') continue;
        const folderId =
          note.folderId && folderMap.has(note.folderId)
            ? folderMap.get(note.folderId)
            : null;
        insertNoteRow(userId, dek, { ...note, folderId }, null);
        noteCount += 1;
      }

      return {
        folders: listFolders(userId),
        notes: listNotes(userId),
        imported: { folders: folderCount, notes: noteCount }
      };
    });
  }

  function exportData(userId) {
    return {
      app: 'notes',
      version: 2,
      exportedAt: new Date().toISOString(),
      folders: listFolders(userId),
      notes: listNotes(userId)
    };
  }

  function createWelcomeNote(userId) {
    const html =
      '<h1>Welcome to your private notes</h1>' +
      '<p>This notebook belongs only to your account. Notes are encrypted on the server before they are stored.</p>' +
      '<p>Use the sidebar to create folders, search, star notes and open the trash. Everything saves automatically.</p>' +
      '<p>If you used the old version of Notes, export a backup there and import it here to bring your notes across.</p>' +
      '<p><strong>Tip:</strong> download a backup from the account menu regularly. The database and the master key file are both needed to recover your notes.</p>';

    return createNote(userId, {
      title: 'Welcome',
      html,
      tags: ['welcome']
    });
  }

  return {
    getUserById,
    getUserByEmail,
    publicUser,
    getDek,
    createUser,
    updateUserPassword,
    listNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    emptyTrash,
    listFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    listVersions,
    createVersion,
    restoreVersion,
    deleteVersions,
    importData,
    exportData,
    createWelcomeNote
  };
}

module.exports = {
  createStore,
  isId
};
