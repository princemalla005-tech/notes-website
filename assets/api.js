/*
 * Same-origin API client for the local Notes server.
 *
 * Security notes:
 *  - The CSRF token lives in memory only (never localStorage), so a stolen
 *    storage dump cannot be replayed against the API.
 *  - The session cookie is HttpOnly, so JavaScript can never read it.
 *  - Every mutating request sends the token in the x-csrf-token header.
 */
(function () {
  'use strict';

  var csrfToken = null;
  var unauthorizedHandler = null;

  function setCsrf(token) {
    csrfToken = typeof token === 'string' && token ? token : null;
  }

  function getCsrf() {
    return csrfToken;
  }

  function setUnauthorizedHandler(handler) {
    unauthorizedHandler = typeof handler === 'function' ? handler : null;
  }

  function ApiError(message, status, code) {
    this.name = 'ApiError';
    this.message = message || 'Request failed.';
    this.status = status || 0;
    this.code = code || 'error';
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function request(method, path, body, options) {
    var opts = options || {};
    var headers = { Accept: 'application/json' };
    var init = {
      method: method,
      credentials: 'same-origin',
      headers: headers,
      cache: 'no-store'
    };

    if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    if (method !== 'GET' && method !== 'HEAD') {
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
    }

    return fetch(path, init).then(function (response) {
      var contentType = response.headers.get('content-type') || '';
      var parse = contentType.indexOf('application/json') !== -1
        ? response.json().catch(function () { return {}; })
        : response.text().then(function (text) { return { error: text }; });

      return parse.then(function (payload) {
        if (response.ok) return payload;

        if (response.status === 401) {
          setCsrf(null);
          if (unauthorizedHandler && !opts.skipUnauthorized) {
            try { unauthorizedHandler(); } catch (e) {}
          }
        }

        var message = payload && payload.error ? payload.error : 'Request failed (' + response.status + ').';
        throw new ApiError(message, response.status, payload && payload.code);
      });
    }, function () {
      throw new ApiError(
        'Cannot reach the local Notes server. Is it running?',
        0,
        'network_error'
      );
    });
  }

  function get(path, options) {
    return request('GET', path, null, options);
  }

  function post(path, body, options) {
    return request('POST', path, body === undefined ? null : body, options);
  }

  function put(path, body, options) {
    return request('PUT', path, body === undefined ? null : body, options);
  }

  function del(path, body, options) {
    return request('DELETE', path, body === undefined ? null : body, options);
  }

  function notePayload(note) {
    return {
      title: note.title || '',
      html: note.html || '',
      folderId: note.folderId || null,
      starred: !!note.starred,
      trashed: !!note.trashed,
      pinned: !!note.pinned,
      archived: !!note.archived,
      tags: Array.isArray(note.tags) ? note.tags : [],
      daily: note.daily || null
    };
  }

  window.NotesApi = {
    ApiError: ApiError,
    setCsrf: setCsrf,
    getCsrf: getCsrf,
    setUnauthorizedHandler: setUnauthorizedHandler,
    request: request,
    get: get,
    post: post,
    put: put,
    del: del,
    notePayload: notePayload,

    me: function () {
      return get('/api/auth/me').then(function (data) {
        setCsrf(data.csrfToken);
        return data;
      });
    },
    login: function (email, password, rememberMe) {
      return post('/api/auth/login', {
        email: email,
        password: password,
        rememberMe: !!rememberMe
      }).then(function (data) {
        setCsrf(data.csrfToken);
        return data;
      });
    },
    register: function (username, email, password, passwordConfirm) {
      return post('/api/auth/register', {
        username: username,
        email: email,
        password: password,
        passwordConfirm: passwordConfirm
      }).then(function (data) {
        setCsrf(data.csrfToken);
        return data;
      });
    },
    logout: function () {
      return post('/api/auth/logout').then(function (data) {
        setCsrf(null);
        return data;
      });
    },
    changePassword: function (currentPassword, newPassword, confirmPassword) {
      return post('/api/auth/password', {
        currentPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      });
    },

    listNotes: function () {
      return get('/api/notes').then(function (data) { return data.notes || []; });
    },
    createNote: function (note) {
      return post('/api/notes', notePayload(note)).then(function (data) { return data.note; });
    },
    updateNote: function (id, note) {
      return put('/api/notes/' + encodeURIComponent(id), notePayload(note))
        .then(function (data) { return data.note; });
    },
    deleteNote: function (id) {
      return del('/api/notes/' + encodeURIComponent(id));
    },
    emptyTrash: function () {
      return post('/api/notes/empty-trash');
    },

    listVersions: function (noteId) {
      return get('/api/notes/' + encodeURIComponent(noteId) + '/versions')
        .then(function (data) { return data.versions || []; });
    },
    createVersion: function (noteId, title, html, force) {
      return post('/api/notes/' + encodeURIComponent(noteId) + '/versions', {
        title: title || '',
        html: html || '',
        force: !!force
      });
    },
    restoreVersion: function (noteId, versionId) {
      return post(
        '/api/notes/' + encodeURIComponent(noteId) + '/versions/' +
        encodeURIComponent(versionId) + '/restore'
      ).then(function (data) { return data.note; });
    },
    deleteVersions: function (noteId) {
      return del('/api/notes/' + encodeURIComponent(noteId) + '/versions');
    },

    listFolders: function () {
      return get('/api/folders').then(function (data) { return data.folders || []; });
    },
    createFolder: function (name) {
      return post('/api/folders', { name: name }).then(function (data) { return data.folder; });
    },
    renameFolder: function (id, name) {
      return put('/api/folders/' + encodeURIComponent(id), { name: name })
        .then(function (data) { return data.folder; });
    },
    deleteFolder: function (id) {
      return del('/api/folders/' + encodeURIComponent(id));
    },

    importData: function (payload) {
      return post('/api/import', payload);
    },
    exportData: function () {
      return get('/api/export');
    }
  };
})();
