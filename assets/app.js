/* Notes — private, multi-user document editor backed by the local encrypted API. */
(function () {
  'use strict';

  var api = window.NotesApi;
  var PASSWORD_MIN = 6;

  var LS = {
    theme: 'notes:theme',
    selected: 'notes:selected',
    clocks: 'notes:clocks',
    spell: 'notes:spell',
    sort: 'notes:sort',
    lang: 'notes:lang'
  };

  var $ = function (id) { return document.getElementById(id); };

  var sidebar = $('sidebar');
  var sidebarOpen = $('sidebar-open');
  var sidebarClose = $('sidebar-close');
  var scrim = $('scrim');
  var newNoteBtn = $('new-note');
  var newNoteListBtn = $('new-note-list');
  var searchInput = $('search');
  var searchClear = $('search-clear');
  var countAll = $('count-all');
  var countStarred = $('count-starred');
  var countArchive = $('count-archive');
  var countTrash = $('count-trash');
  var addFolderBtn = $('add-folder');
  var folderList = $('folder-list');
  var tagsBlock = $('tags-block');
  var tagList = $('tag-list');
  var tagsClear = $('tags-clear');
  var sortSelect = $('sort-select');
  var newTemplateBtn = $('new-template');
  var paletteOpenBtn = $('palette-open');
  var dailyNoteBtn = $('daily-note');
  var focusExit = $('focus-exit');
  var paletteModal = $('palette-modal');
  var paletteInput = $('palette-input');
  var paletteResults = $('palette-results');
  var shortcutsModal = $('shortcuts-modal');
  var tagsModal = $('tags-modal');
  var tagCurrent = $('tag-current');
  var tagForm = $('tag-form');
  var tagInput = $('tag-input');
  var tagSuggest = $('tag-suggest');
  var historyModal = $('history-modal');
  var historyList = $('history-list');
  var historySnapshotBtn = $('history-snapshot');
  var templateModal = $('template-modal');
  var templateGrid = $('template-grid');
  var exportAllBtn = $('export-all');
  var importInput = $('import-file');
  var themeToggle = $('theme-toggle');
  var themeIcon = $('theme-icon');
  var themeLabel = $('theme-label');
  var langOpenBtn = $('lang-open');
  var langCurrent = $('lang-current');
  var langModal = $('lang-modal');
  var langSearch = $('lang-search');
  var langList = $('lang-list');
  var docCount = $('doc-count');

  var appEl = $('app');
  var introEl = $('intro');
  var introOpenBtn = $('intro-open');
  var introSkipBtn = $('intro-skip');
  var introMetaEl = $('intro-meta');
  var introLoaderEl = $('intro-loader');
  var introLoaderSubEl = $('intro-loader-sub');

  /* Authentication + account UI */
  var authScreen = $('auth-screen');
  var authTabLogin = $('auth-tab-login');
  var authTabRegister = $('auth-tab-register');
  var authLoginForm = $('auth-login-form');
  var authRegisterForm = $('auth-register-form');
  var loginEmail = $('login-email');
  var loginPassword = $('login-password');
  var loginRemember = $('login-remember');
  var loginSubmit = $('login-submit');
  var loginError = $('auth-login-error');
  var registerUsername = $('register-username');
  var registerEmail = $('register-email');
  var registerPassword = $('register-password');
  var registerConfirm = $('register-confirm');
  var registerSubmit = $('register-submit');
  var registerError = $('auth-register-error');

  var accountChip = $('account-chip');
  var accountAvatar = $('account-avatar');
  var accountName = $('account-name');
  var accountEmail = $('account-email');
  var profileModal = $('profile-modal');
  var profileAvatar = $('profile-avatar');
  var profileName = $('profile-name');
  var profileEmail = $('profile-email');
  var profileSince = $('profile-since');
  var profileExport = $('profile-export');
  var profileLogout = $('profile-logout');
  var passwordForm = $('password-form');
  var passwordCurrent = $('password-current');
  var passwordNew = $('password-new');
  var passwordConfirm = $('password-confirm');
  var passwordSubmit = $('password-submit');
  var passwordError = $('password-error');
  var passwordOk = $('password-ok');

  var currentUser = null;
  var authBusy = false;
  var authView = 'login';

  var listTitle = $('list-title');
  var listSub = $('list-sub');
  var emptyTrashBtn = $('empty-trash');
  var noteList = $('note-list');
  var listEmpty = $('list-empty');
  var listEmptyTitle = $('list-empty-title');
  var listEmptyText = $('list-empty-text');
  var emptyNew = $('empty-new');

  var editorEmpty = $('editor-empty');
  var editorShell = $('editor-shell');
  var startNewBtn = $('start-new');
  var backListBtn = $('back-list');
  var docTitle = $('doc-title');
  var saveStatus = $('save-status');
  var wordCount = $('word-count');
  var readTime = $('read-time');
  var charCount = $('char-count');
  var docTags = $('doc-tags');
  var pageScroll = $('page-scroll');
  var readProgressBar = $('read-progress-bar');
  var docFolder = $('doc-folder');
  var starBtn = $('star-btn');
  var folderSelect = $('folder-select');
  var docMenu = $('doc-menu');
  var toolbar = $('toolbar');
  var blockFormat = $('block-format');
  var linkBtn = $('link-btn');
  var hiliteColor = $('hilite-color');
  var foreColor = $('fore-color');
  var hiliteDot = $('hilite-dot');
  var foreDot = $('fore-dot');
  var trashBanner = $('trash-banner');
  var restoreBtn = $('restore-btn');
  var purgeBtn = $('purge-btn');
  var editor = $('editor');
  var spellBtn = $('spell-btn');
  var toastEl = $('toast');
  var live = $('live');
  var pageEl = document.querySelector('.page');
  var editorPane = $('editor-pane');

  var aiOpenBtn = $('ai-open');
  var aiGenerateBtn = $('ai-generate');
  var aiDrawer = $('ai-drawer');
  var aiScrim = $('ai-scrim');
  var aiCloseBtn = $('ai-close');
  var aiSettingsBtn = $('ai-settings-open');
  var aiNewChatBtn = $('ai-new-chat');
  var aiContextLabel = $('ai-context-label');
  var aiSelPill = $('ai-sel-pill');
  var aiQuick = $('ai-quick');
  var aiLang = $('ai-lang');
  var aiTranscript = $('ai-transcript');
  var aiEmpty = $('ai-empty');
  var aiSetupCta = $('ai-setup-cta');
  var aiForm = $('ai-form');
  var aiInput = $('ai-input');
  var aiSendBtn = $('ai-send');
  var aiStopBtn = $('ai-stop');
  var aiProgress = $('ai-progress');
  var aiModelBadge = $('ai-model-badge');

  var clockOpenBtn = $('clock-open');
  var clockModal = $('clock-modal');
  var clockList = $('clock-list');
  var clockCityInput = $('clock-city');
  var clockTzSelect = $('clock-tz');
  var clockAddBtn = $('clock-add-btn');
  var timerDisplay = $('timer-display');
  var timerHInput = $('timer-h');
  var timerMInput = $('timer-m');
  var timerSInput = $('timer-s');
  var timerStartBtn = $('timer-start');
  var timerPauseBtn = $('timer-pause');
  var timerResetBtn = $('timer-reset');
  var timerStatus = $('timer-status');
  var timerRing = $('timer-ring');
  var timerRingProgress = $('timer-ring-progress');
  var timerState = $('timer-state');
  var timerPresets = $('timer-presets');
  var clockQuick = $('clock-quick');
  var sideClockTime = $('side-clock-time');
  var sideClockDate = $('side-clock-date');
  var sideClockHour = $('side-clock-hour');
  var sideClockMin = $('side-clock-min');
  var sideClockSec = $('side-clock-sec');
  var heroClockTime = $('hero-clock-time');
  var heroClockDate = $('hero-clock-date');
  var heroClockHour = $('hero-clock-hour');
  var heroClockMin = $('hero-clock-min');
  var heroClockSec = $('hero-clock-sec');
  var editorSpotlight = $('editor-spotlight');
  var fxLayer = $('fx-layer');

  var aiSettingsModal = $('ai-settings-modal');
  var aiKeyInput = $('ai-key');
  var aiKeyToggle = $('ai-key-toggle');
  var aiModelInput = $('ai-model');
  var aiBaseInput = $('ai-base');
  var aiTempInput = $('ai-temp');
  var aiTempOut = $('ai-temp-out');
  var aiModelsHint = $('ai-models-hint');
  var aiModelList = $('ai-model-list');
  var aiLoadModelsBtn = $('ai-load-models');
  var aiTestBtn = $('ai-test');
  var aiSaveBtn = $('ai-save');
  var aiDisconnectBtn = $('ai-disconnect');
  var aiSettingsStatus = $('ai-settings-status');
  var aiSettingsError = $('ai-settings-error');
  var aiSettingsOk = $('ai-settings-ok');

  var genModal = $('gen-modal');
  var genPrompt = $('gen-prompt');
  var genType = $('gen-type');
  var genTone = $('gen-tone');
  var genLength = $('gen-length');
  var genPreview = $('gen-preview');
  var genPreviewBody = $('gen-preview-body');
  var genStatus = $('gen-status');
  var genUsage = $('gen-usage');
  var genRunBtn = $('gen-run');
  var genCreateBtn = $('gen-create');
  var genError = $('gen-error');

  var shareOpenBtn = $('share-open');
  var shareModal = $('share-modal');
  var shareTitleEl = $('share-title');
  var shareSubtitleEl = $('share-subtitle');
  var shareEmailInput = $('share-email');
  var shareEmailBtn = $('share-email-btn');
  var shareAccessSelect = $('share-access');
  var shareAccessIcon = $('share-access-icon');
  var shareAccessTitle = $('share-access-title');
  var shareAccessDesc = $('share-access-desc');
  var sharePasswordField = $('share-password-field');
  var sharePasswordInput = $('share-password');
  var shareLinkInput = $('share-link');
  var shareCopyBtn = $('share-copy');
  var shareDownloadBtn = $('share-download');
  var shareNativeBtn = $('share-native');
  var shareErrorEl = $('share-error');
  var shareLinkRow = document.querySelector('.share-link-row');
  var shareAccessBox = document.querySelector('.share-access');

  var sharedView = $('shared-view');
  var sharedDocEl = $('shared-doc');
  var sharedTitleEl = $('shared-title');
  var sharedMetaEl = $('shared-meta');
  var sharedBodyEl = $('shared-body');
  var sharedBadgeEl = $('shared-badge');
  var sharedCopyBtn = $('shared-copy-note');
  var sharedOpenBtn = $('shared-open-app');
  var sharedLockedEl = $('shared-locked');
  var sharedLockedTitle = $('shared-locked-title');
  var sharedLockedText = $('shared-locked-text');
  var sharedUnlockForm = $('shared-unlock-form');
  var sharedPasswordInput = $('shared-password');
  var sharedErrorEl = $('shared-error');

  var docs = [];
  var folders = [];

  /* ---------- Language ---------- */

  var i18n = window.NotesI18n || null;
  var savedLang = read(LS.lang, 'en');
  var LANG = 'en';
  if (i18n && typeof savedLang === 'string') {
    i18n.languages.some(function (item) {
      if (item[0] === savedLang) { LANG = savedLang; return true; }
      return false;
    });
  }
  var textOrigins = typeof WeakMap === 'function' ? new WeakMap() : null;
  var attrOrigins = typeof WeakMap === 'function' ? new WeakMap() : null;
  var langQuery = '';

  /* User-written text must never be translated. */
  var I18N_SKIP = [
    '#editor', '.doc-content', '#shared-body', '#shared-title', '#shared-meta',
    '#ai-transcript', '#gen-preview-body', '#history-list',
    '.ni-title-text', '.ni-snippet', '.ni-tag', '.ni-folder',
    '.palette-item.note-result .palette-label',
    '.palette-item.note-result .palette-meta',
    '.folder-name', '.tag-name', '.tag-chip', '.tag-suggest-btn',
    '#tag-current', '#tag-suggest',
    '.clock-city-name', '.clock-city-zone', '.clock-city-time',
    '#save-status', '#toast', '#live', '#intro-meta', '#intro-loader-sub',
    '.lang-list', '.lang-native', '.lang-english', '.lang-code', '.lang-current',
    'script', 'style', 'textarea', 'input', 'select', '[contenteditable="true"]'
  ].join(', ');

  /* Same idea for attributes, but inputs and selects keep localisable placeholders. */
  var I18N_ATTR_SKIP = [
    '#editor', '.doc-content', '#shared-body', '#shared-title', '#shared-meta',
    '#ai-transcript', '#gen-preview-body', '#history-list',
    '.ni-title-text', '.ni-snippet', '.ni-tag', '.ni-folder',
    '.folder-name', '.tag-name', '.tag-chip', '.tag-suggest-btn',
    '#tag-current', '#tag-suggest',
    '.clock-city-name', '.clock-city-zone', '.clock-city-time',
    '#save-status', '#toast', '#live', '#intro-meta', '#intro-loader-sub',
    '.lang-list', '.lang-current', '#lang-open',
    '[contenteditable="true"]'
  ].join(', ');

  function t(value) {
    return i18n ? i18n.translate(LANG, value) : value;
  }

  function tc(kind, n) {
    return i18n ? i18n.count(LANG, kind, n) : n + ' ' + kind + (n === 1 ? '' : 's');
  }

  function locale() {
    return i18n ? i18n.localeOf(LANG) : undefined;
  }

  function isRTL() {
    return !!(i18n && i18n.isRTL(LANG));
  }

  function localizeTree(root) {
    if (!i18n || !textOrigins) return;
    var host = root || appEl || document.body;
    if (!host || !document.createTreeWalker) return;

    var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent || parent.closest(I18N_SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var origin = textOrigins.get(node);
      if (origin === undefined) {
        origin = node.nodeValue;
        textOrigins.set(node, origin);
      }
      var next = LANG === 'en' ? origin : t(origin);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    var els = host.querySelectorAll('[placeholder], [title], [aria-label]');
    els.forEach(function (el) {
      if (el.closest(I18N_ATTR_SKIP)) return;
      var store = attrOrigins.get(el);
      if (!store) { store = {}; attrOrigins.set(el, store); }
      ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;
        if (store[attr] === undefined) store[attr] = el.getAttribute(attr);
        var value = LANG === 'en' ? store[attr] : t(store[attr]);
        if (value !== el.getAttribute(attr)) el.setAttribute(attr, value);
      });
    });
  }

  function languageMeta(code) {
    if (!i18n) return ['en', 'English', 'English'];
    for (var i = 0; i < i18n.languages.length; i++) {
      if (i18n.languages[i][0] === code) return i18n.languages[i];
    }
    return ['en', 'English', 'English'];
  }

  function applyLanguage(code, silent) {
    if (!i18n) return;
    var meta = languageMeta(code);
    LANG = meta[0];
    try { localStorage.setItem(LS.lang, JSON.stringify(LANG)); } catch (e) {}

    var rtl = i18n.isRTL(LANG);
    document.documentElement.lang = LANG;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-rtl', rtl);

    if (langCurrent) langCurrent.textContent = meta[2];
    if (langOpenBtn) {
      langOpenBtn.title = t('Language') + ': ' + meta[2];
      langOpenBtn.setAttribute('aria-label', t('Language') + ': ' + meta[2]);
    }

    if (!silent) {
      renderAll();
      renderEditor();
      renderLangList();
    }
    localizeTree(appEl);
    localizeTree(introEl);
    if (langModal && !langModal.hidden) localizeTree(langModal);
  }

  function renderLangList() {
    if (!langList || !i18n) return;
    var query = langQuery.trim().toLowerCase();
    var current = LANG;
    langList.replaceChildren();

    i18n.languages.forEach(function (item) {
      var code = item[0], english = item[1], native = item[2];
      if (query && (code + ' ' + english + ' ' + native).toLowerCase().indexOf(query) === -1) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'lang-item';
      button.dataset.lang = code;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', code === current ? 'true' : 'false');
      if (code === current) button.classList.add('active');

      var dot = document.createElement('span');
      dot.className = 'lang-status' + (i18n.isTranslated(code) ? ' ready' : '');
      dot.setAttribute('aria-hidden', 'true');
      button.appendChild(dot);

      var names = document.createElement('span');
      names.className = 'lang-names';
      var nativeEl = document.createElement('span');
      nativeEl.className = 'lang-native';
      nativeEl.textContent = native;
      var englishEl = document.createElement('span');
      englishEl.className = 'lang-english';
      englishEl.textContent = english;
      names.appendChild(nativeEl);
      names.appendChild(englishEl);
      button.appendChild(names);

      var codeEl = document.createElement('span');
      codeEl.className = 'lang-code';
      codeEl.textContent = code.toUpperCase();
      button.appendChild(codeEl);

      button.addEventListener('click', function () {
        applyLanguage(code);
        toast(metaForToast(code));
      });

      langList.appendChild(button);
    });

    if (!langList.children.length) {
      var empty = document.createElement('p');
      empty.className = 'lang-empty';
      empty.textContent = t('No matches');
      langList.appendChild(empty);
    }
  }

  function metaForToast(code) {
    var meta = languageMeta(code);
    if (i18n && !i18n.isTranslated(code)) {
      return meta[2] + ' — ' + t('English only for now');
    }
    return meta[2];
  }

  function openLangModal() {
    langQuery = '';
    if (langSearch) langSearch.value = '';
    renderLangList();
    openModal('lang-modal');
    window.setTimeout(function () {
      if (langSearch) langSearch.focus();
    }, 60);
  }

  var SORT_OPTIONS = ['updated', 'created', 'title', 'title-desc'];
  var savedSort = read(LS.sort, 'updated');

  var state = {
    view: 'all',          // all | starred | archive | trash | folder
    folderId: null,
    tag: null,
    sort: SORT_OPTIONS.indexOf(savedSort) === -1 ? 'updated' : savedSort,
    query: '',
    selectedId: read(LS.selected, null)
  };

  var dirty = false;
  var saveTimer = null;
  var toastTimer = null;
  var savedRange = null;
  var seenNotes = Object.create(null);
  var lastRenderedId = null;
  var editorSwitchTimer = 0;

  var aiStreaming = false;
  var aiController = null;
  var aiHistory = [];
  var aiLastRequest = null;
  var aiActive = null;
  var aiRunToken = 0;
  var aiGenStreaming = false;
  var aiGenHtml = '';
  var aiGenTitle = '';
  var aiGenRaw = '';

  var clocks = [];
  var clockInterval = null;
  var timerInterval = null;
  var timerSeconds = 0;
  var timerTotal = 0;
  var timerRunning = false;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var spellCheckEnabled = false;
  var spellCheckTimer = null;
  var spellErrors = new Set();
  var lastSpellWords = '';

  var shareAccessMode = 'link';
  var shareSeq = 0;
  var sharePasswordTimer = null;
  var shareCopyTimer = null;
  var shareReadyTimer = null;
  var sharedPayload = null;
  var sharedToken = '';
  var sharedSaveAllowed = false;

  /* ---------- Storage helpers ---------- */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    /* Note, folder, history and AI data are never written to browser storage. */
    if (typeof key !== 'string' || !key) return false;

    if (key === 'notes:docs') {
      if (Array.isArray(value)) docs = value;
      scheduleSync();
      return true;
    }
    if (key === 'notes:folders') {
      if (Array.isArray(value)) folders = value;
      scheduleSync();
      return true;
    }
    if (key === 'notes:history' || key === 'notes:ai' || key === 'notes:shareAccess') {
      return true;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      writingError('Browser storage is full — export a backup before adding more.');
      return false;
    }
  }

  /* ---------- Server persistence ---------- */

  var syncTimer = null;
  var syncRunning = false;
  var syncAgain = false;
  var syncPromise = null;
  var noteIndex = Object.create(null);
  var folderIndex = Object.create(null);
  var versionCache = [];
  var versionCacheNoteId = null;

  function writeDocs() {
    scheduleSync();
    return true;
  }

  function writeFolders() {
    scheduleSync();
    return true;
  }

  function noteSnapshot(note) {
    return {
      title: String(note.title || ''),
      html: String(note.html || ''),
      folderId: note.folderId || null,
      starred: !!note.starred,
      trashed: !!note.trashed,
      pinned: !!note.pinned,
      archived: !!note.archived,
      tags: Array.isArray(note.tags) ? note.tags.slice() : [],
      daily: note.daily || null
    };
  }

  function sameSnapshot(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function adoptServerNote(doc, serverNote) {
    var oldId = doc.id;
    doc.id = serverNote.id;
    doc.title = String(serverNote.title || '');
    doc.html = sanitizeHtml(serverNote.html || '');
    doc.folderId = serverNote.folderId || null;
    doc.starred = !!serverNote.starred;
    doc.trashed = !!serverNote.trashed;
    doc.pinned = !!serverNote.pinned;
    doc.archived = !!serverNote.archived;
    doc.tags = cleanTags(serverNote.tags);
    doc.daily = serverNote.daily || null;
    doc.createdAt = Number(serverNote.createdAt) || doc.createdAt;
    doc.updatedAt = Number(serverNote.updatedAt) || doc.updatedAt;
    noteIndex[serverNote.id] = noteSnapshot(doc);

    if (oldId !== serverNote.id) {
      if (state.selectedId === oldId) {
        state.selectedId = serverNote.id;
        persistSelected();
      }
      if (versionCacheNoteId === oldId) versionCacheNoteId = serverNote.id;
    }
  }

  function syncFolders() {
    var tasks = [];

    folders.forEach(function (folder) {
      if (!folder.id) folder.id = uid();
      var known = folderIndex[folder.id];
      if (!known) {
        tasks.push(api.createFolder(folder.name).then(function (server) {
          var oldId = folder.id;
          folder.id = server.id;
          folder.name = server.name;
          folder.createdAt = server.createdAt;
          folder.updatedAt = server.updatedAt;
          folderIndex[server.id] = { name: server.name };
          if (oldId !== server.id) {
            docs.forEach(function (doc) {
              if (doc.folderId === oldId) doc.folderId = server.id;
            });
            if (state.folderId === oldId) state.folderId = server.id;
            renderFolders();
            renderFolderSelect();
          }
        }));
      } else if (known.name !== folder.name) {
        tasks.push(api.renameFolder(folder.id, folder.name).then(function (server) {
          folder.name = server.name;
          folderIndex[folder.id] = { name: server.name };
        }));
      }
    });

    Object.keys(folderIndex).forEach(function (id) {
      var stillThere = folders.some(function (folder) { return folder.id === id; });
      if (stillThere) return;
      tasks.push(
        api.deleteFolder(id).catch(function (error) {
          if (error.status !== 404) throw error;
        })
      );
      delete folderIndex[id];
    });

    return Promise.all(tasks);
  }

  function syncNotes() {
    var tasks = [];

    docs.forEach(function (doc) {
      if (!doc.id) doc.id = uid();
      var snap = noteSnapshot(doc);
      var known = noteIndex[doc.id];

      if (!known) {
        tasks.push(api.createNote(doc).then(function (server) {
          adoptServerNote(doc, server);
        }));
        return;
      }

      if (!sameSnapshot(known, snap)) {
        tasks.push(api.updateNote(doc.id, doc).then(function (server) {
          adoptServerNote(doc, server);
        }));
      }
    });

    Object.keys(noteIndex).forEach(function (id) {
      var stillThere = docs.some(function (doc) { return doc.id === id; });
      if (stillThere) return;
      tasks.push(
        api.deleteNote(id).catch(function (error) {
          if (error.status !== 404) throw error;
        })
      );
      delete noteIndex[id];
    });

    return Promise.all(tasks);
  }

  function runSync() {
    if (!currentUser) return Promise.resolve();
    if (syncRunning) {
      syncAgain = true;
      return syncPromise || Promise.resolve();
    }

    syncRunning = true;
    syncAgain = false;

    syncPromise = syncFolders()
      .then(syncNotes)
      .then(function () {
        syncRunning = false;
        if (syncAgain) return runSync();
        if (!dirty && saveStatus) setStatus('Saved ' + timeOfDay(Date.now()));
      })
      .catch(function (error) {
        syncRunning = false;
        handleApiError(error, 'Could not save your changes.');
        if (syncAgain) {
          syncAgain = false;
          window.setTimeout(runSync, 1200);
        }
      })
      .then(function (result) {
        syncPromise = null;
        return result;
      });

    return syncPromise;
  }

  function scheduleSync() {
    if (!currentUser) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = window.setTimeout(function () {
      syncTimer = null;
      runSync();
    }, 180);
  }

  function persistSelected() {
    try {
      if (state.selectedId) localStorage.setItem(LS.selected, JSON.stringify(state.selectedId));
      else localStorage.removeItem(LS.selected);
    } catch (e) {}
  }

  function uid() {
    return 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function cleanTags(value) {
    var seen = Object.create(null);
    var out = [];
    (Array.isArray(value) ? value : []).forEach(function (tag) {
      var name = String(tag || '').replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 24);
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(name);
    });
    return out.slice(0, 12);
  }

  /* ---------- HTML safety ---------- */

  var ALLOWED_TAGS = {
    P: 1, DIV: 1, BR: 1, SPAN: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1,
    S: 1, STRIKE: 1, H1: 1, H2: 1, H3: 1, UL: 1, OL: 1, LI: 1,
    BLOCKQUOTE: 1, PRE: 1, CODE: 1, A: 1, HR: 1, FONT: 1, SUB: 1, SUP: 1, MARK: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TH: 1, TD: 1
  };

  var ALLOWED_STYLES = {
    color: 1, 'background-color': 1, 'font-size': 1, 'text-align': 1,
    'font-weight': 1, 'font-style': 1, 'text-decoration': 1
  };

  function sanitizeHtml(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');

    function cleanStyle(value) {
      return String(value).split(';').map(function (part) {
        return part.trim();
      }).filter(Boolean).filter(function (decl) {
        var idx = decl.indexOf(':');
        if (idx < 1) return false;
        var prop = decl.slice(0, idx).trim().toLowerCase();
        var val = decl.slice(idx + 1).trim();
        if (!ALLOWED_STYLES[prop]) return false;
        if (/url\(|expression|javascript:/i.test(val)) return false;
        return true;
      }).join('; ');
    }

    function walk(node) {
      Array.prototype.slice.call(node.children).forEach(walk);

      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'IFRAME' ||
          node.tagName === 'OBJECT' || node.tagName === 'EMBED' || node.tagName === 'NOSCRIPT' ||
          node.tagName === 'SVG' || node.tagName === 'MATH') {
        if (node.remove) node.remove();
        return;
      }

      if (!node.tagName || !ALLOWED_TAGS[node.tagName]) {
        if (node.replaceWith) node.replaceWith.apply(node, Array.prototype.slice.call(node.childNodes));
        return;
      }

      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name === 'href') {
          if (!/^(https?:|mailto:)/i.test(attr.value.trim())) node.removeAttribute(attr.name);
        } else if (name === 'style') {
          var kept = cleanStyle(attr.value);
          if (kept) node.setAttribute('style', kept);
          else node.removeAttribute('style');
        } else if (name === 'color' || name === 'size') {
          if (node.tagName !== 'FONT') node.removeAttribute(attr.name);
        } else if (name === 'colspan' || name === 'rowspan') {
          if (node.tagName !== 'TD' && node.tagName !== 'TH') node.removeAttribute(attr.name);
        } else if (name !== 'target' && name !== 'rel') {
          node.removeAttribute(attr.name);
        }
      });

      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }

    walk(tpl.content);
    return tpl.innerHTML;
  }

  function normalizeDoc(raw) {
    var now = Date.now();
    return {
      id: raw && raw.id ? String(raw.id) : uid(),
      title: String((raw && raw.title) || '').slice(0, 200),
      html: sanitizeHtml(String((raw && raw.html) || '')),
      folderId: raw && raw.folderId ? String(raw.folderId) : null,
      starred: !!(raw && raw.starred),
      trashed: !!(raw && raw.trashed),
      pinned: !!(raw && raw.pinned),
      archived: !!(raw && raw.archived),
      tags: cleanTags(raw && raw.tags),
      daily: raw && raw.daily ? String(raw.daily).slice(0, 10) : null,
      createdAt: Number(raw && raw.createdAt) || now,
      updatedAt: Number(raw && raw.updatedAt) || now
    };
  }

  function plainText(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    tpl.content.querySelectorAll('br').forEach(function (n) { n.replaceWith('\n'); });
    tpl.content.querySelectorAll('p,div,li,h1,h2,h3,blockquote,pre,hr,tr').forEach(function (n) {
      n.appendChild(document.createTextNode('\n'));
    });
    return (tpl.content.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function snippetOf(doc) {
    return plainText(doc.html).replace(/\s+/g, ' ').trim().slice(0, 130);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function countWords(text) {
    var matches = String(text || '').match(/\S+/g);
    return matches ? matches.length : 0;
  }

  /* ---------- Date helpers ---------- */

  function timeOfDay(ts) {
    return new Date(ts).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  }

  function listDate(ts) {
    var d = new Date(ts);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return timeOfDay(ts);
    var yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    var opts = d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(locale(), opts);
  }

  /* ---------- Queries ---------- */

  function selectedDoc() {
    for (var i = 0; i < docs.length; i++) {
      if (docs[i].id === state.selectedId) return docs[i];
    }
    return null;
  }

  function folderById(id) {
    for (var i = 0; i < folders.length; i++) {
      if (folders[i].id === id) return folders[i];
    }
    return null;
  }

  function folderName(id) {
    var folder = folderById(id);
    return folder ? folder.name : '';
  }

  function compareDocs(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (state.sort === 'created') return b.createdAt - a.createdAt;
    if (state.sort === 'title') {
      return (a.title || 'Untitled note').localeCompare(b.title || 'Untitled note', undefined, { sensitivity: 'base' });
    }
    if (state.sort === 'title-desc') {
      return (b.title || 'Untitled note').localeCompare(a.title || 'Untitled note', undefined, { sensitivity: 'base' });
    }
    return b.updatedAt - a.updatedAt;
  }

  function visibleDocs() {
    var list = docs.filter(function (doc) {
      if (state.view === 'trash') return doc.trashed;
      if (doc.trashed) return false;
      if (state.view === 'archive') return doc.archived;
      return !doc.archived;
    });

    if (state.view === 'starred') {
      list = list.filter(function (doc) { return doc.starred; });
    }
    if (state.view === 'folder') {
      list = list.filter(function (doc) { return doc.folderId === state.folderId; });
    }
    if (state.tag) {
      var wanted = state.tag.toLowerCase();
      list = list.filter(function (doc) {
        return (doc.tags || []).some(function (tag) { return tag.toLowerCase() === wanted; });
      });
    }
    if (state.query) {
      var q = state.query;
      list = list.filter(function (doc) {
        var haystack = (doc.title || '') + ' ' + plainText(doc.html) + ' ' + (doc.tags || []).join(' ');
        return haystack.toLowerCase().indexOf(q) !== -1;
      });
    }

    return list.sort(compareDocs);
  }

  /* ---------- Sidebar ---------- */

  function renderCounts() {
    var active = docs.filter(function (d) { return !d.trashed && !d.archived; });
    var starred = active.filter(function (d) { return d.starred; });
    var archived = docs.filter(function (d) { return !d.trashed && d.archived; });
    var trashed = docs.filter(function (d) { return d.trashed; });

    countAll.textContent = active.length;
    countStarred.textContent = starred.length;
    if (countArchive) countArchive.textContent = archived.length;
    countTrash.textContent = trashed.length;
    docCount.textContent = active.length + (active.length === 1 ? ' note' : ' notes');
  }

  function renderFolders() {
    folderList.replaceChildren();

    if (!folders.length) {
      var empty = document.createElement('p');
      empty.className = 'folder-empty';
      empty.textContent = 'No folders yet';
      folderList.appendChild(empty);
      return;
    }

    folders.forEach(function (folder) {
      var row = document.createElement('div');
      row.className = 'folder-item';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.dataset.id = folder.id;
      if (state.view === 'folder' && state.folderId === folder.id) row.classList.add('active');

      row.appendChild(icon('file', 'ic'));

      var name = document.createElement('span');
      name.className = 'folder-name';
      name.textContent = folder.name;
      row.appendChild(name);

      var count = document.createElement('span');
      count.className = 'folder-count';
      count.textContent = docs.filter(function (d) {
        return !d.trashed && !d.archived && d.folderId === folder.id;
      }).length;
      row.appendChild(count);

      var actions = document.createElement('span');
      actions.className = 'folder-actions';

      var rename = document.createElement('button');
      rename.type = 'button';
      rename.className = 'folder-action';
      rename.dataset.faction = 'rename';
      rename.title = 'Rename folder';
      rename.setAttribute('aria-label', 'Rename ' + folder.name);
      rename.textContent = '✎';

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'folder-action';
      remove.dataset.faction = 'delete';
      remove.title = 'Delete folder';
      remove.setAttribute('aria-label', 'Delete ' + folder.name);
      remove.textContent = '×';

      actions.appendChild(rename);
      actions.appendChild(remove);
      row.appendChild(actions);

      row.addEventListener('click', function (event) {
        var action = event.target.closest('[data-faction]');
        if (action) {
          event.stopPropagation();
          if (action.dataset.faction === 'rename') renameFolder(folder);
          else deleteFolder(folder);
          return;
        }
        state.view = 'folder';
        state.folderId = folder.id;
        state.tag = null;
        seenNotes = Object.create(null);
        renderAll();
        closeSidebar();
      });

      row.addEventListener('keydown', function (event) {
        if (event.target !== row) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          row.click();
        }
      });

      row.addEventListener('dragover', function (event) {
        if (!event.dataTransfer) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        row.classList.add('drop-target');
      });

      row.addEventListener('dragleave', function () {
        row.classList.remove('drop-target');
      });

      row.addEventListener('drop', function (event) {
        event.preventDefault();
        row.classList.remove('drop-target');
        var id = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        if (id) moveDocToFolder(id, folder.id);
      });

      folderList.appendChild(row);
    });
  }

  function renderFolderSelect() {
    var current = folderSelect.value;
    folderSelect.replaceChildren();
    var none = document.createElement('option');
    none.value = '';
    none.textContent = 'No folder';
    folderSelect.appendChild(none);

    folders.forEach(function (folder) {
      var option = document.createElement('option');
      option.value = folder.id;
      option.textContent = folder.name;
      folderSelect.appendChild(option);
    });

    var doc = selectedDoc();
    folderSelect.value = doc && doc.folderId ? doc.folderId : (current || '');
  }

  function addFolder() {
    var name = window.prompt('Folder name');
    if (name === null) return;
    name = name.trim().slice(0, 60);
    if (!name) return;

    folders.push({ id: uid(), name: name });
    writeFolders();
    renderFolders();
    renderFolderSelect();
    toast('Folder created');
  }

  function renameFolder(folder) {
    var name = window.prompt('Rename folder', folder.name);
    if (name === null) return;
    name = name.trim().slice(0, 60);
    if (!name) return;

    folder.name = name;
    writeFolders();
    renderFolders();
    renderFolderSelect();
    if (selectedDoc()) docFolder.textContent = folderName(selectedDoc().folderId) || 'No folder';
    renderList();
    toast('Folder renamed');
  }

  function deleteFolder(folder) {
    if (!window.confirm('Delete “' + folder.name + '”? The notes inside will stay in All notes.')) return;

    docs.forEach(function (doc) {
      if (doc.folderId === folder.id) doc.folderId = null;
    });
    folders = folders.filter(function (f) { return f.id !== folder.id; });

    if (state.view === 'folder' && state.folderId === folder.id) {
      state.view = 'all';
      state.folderId = null;
    }

    writeFolders();
    writeDocs();
    renderAll();
    renderEditor();
    toast('Folder deleted');
  }

  /* ---------- Notes list ---------- */

  function icon(name, className) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className || 'ic');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function buildNoteItem(doc) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'note-item';
    if (doc.id === state.selectedId) item.classList.add('active');

    if (!doc.trashed) {
      item.draggable = true;
      item.title = 'Drag onto a folder to move';
      item.addEventListener('dragstart', function (event) {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData('text/plain', doc.id);
        event.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', function () {
        item.classList.remove('dragging');
      });
    }

    var titleRow = document.createElement('span');
    titleRow.className = 'ni-title';

    if (doc.pinned) titleRow.appendChild(icon('pin', 'ni-pin'));
    if (doc.starred) titleRow.appendChild(icon('star', 'ni-star'));

    var titleText = document.createElement('span');
    titleText.className = 'ni-title-text';
    titleText.textContent = doc.title || t('Untitled note');
    titleRow.appendChild(titleText);
    item.appendChild(titleRow);

    var snippet = document.createElement('span');
    snippet.className = 'ni-snippet';
    snippet.textContent = snippetOf(doc) || t('No additional text');
    item.appendChild(snippet);

    if (doc.tags && doc.tags.length) {
      var tags = document.createElement('span');
      tags.className = 'ni-tags';
      doc.tags.slice(0, 3).forEach(function (tag) {
        var chip = document.createElement('span');
        chip.className = 'ni-tag';
        chip.textContent = '#' + tag;
        tags.appendChild(chip);
      });
      if (doc.tags.length > 3) {
        var more = document.createElement('span');
        more.className = 'ni-tag more';
        more.textContent = '+' + (doc.tags.length - 3);
        tags.appendChild(more);
      }
      item.appendChild(tags);
    }

    var meta = document.createElement('span');
    meta.className = 'ni-meta';

    var time = document.createElement('span');
    time.textContent = listDate(doc.updatedAt);
    time.title = 'Edited ' + new Date(doc.updatedAt).toLocaleString(locale());
    meta.appendChild(time);

    var right = document.createElement('span');
    if (doc.trashed) {
      right.className = 'ni-trash';
      right.textContent = 'In trash';
    } else if (doc.archived) {
      right.className = 'ni-archived';
      right.textContent = 'Archived';
    } else {
      right.className = 'ni-folder';
      right.textContent = folderName(doc.folderId);
    }
    meta.appendChild(right);
    item.appendChild(meta);

    item.addEventListener('click', function () { selectDoc(doc.id); });
    return item;
  }

  function renderList() {
    var list = visibleDocs();

    noteList.replaceChildren();
    list.forEach(function (doc, index) {
      var item = buildNoteItem(doc);
      if (!seenNotes[doc.id]) {
        seenNotes[doc.id] = true;
        item.classList.add('enter');
        item.style.setProperty('--i', String(Math.min(index, 7)));
      }
      noteList.appendChild(item);
    });

    noteList.hidden = list.length === 0;
    listEmpty.hidden = list.length > 0;

    if (!list.length) {
      var title = 'No notes yet';
      var text = 'Create your first note to get started.';

      if (state.query) {
        title = 'No matches';
        text = 'No notes contain “' + state.query + '”.';
      } else if (state.tag) {
        title = 'No notes with #' + state.tag;
        text = 'Add this tag to a note, or clear the tag filter.';
      } else if (state.view === 'trash') {
        title = 'Trash is empty';
        text = 'Notes you delete will appear here.';
      } else if (state.view === 'starred') {
        title = 'No starred notes';
        text = 'Tap the star on a note to keep it here.';
      } else if (state.view === 'archive') {
        title = 'Nothing archived';
        text = 'Archive notes to keep them out of the way without deleting them.';
      } else if (state.view === 'folder') {
        var folder = folderById(state.folderId);
        title = 'Nothing in this folder';
        text = 'Create a note here, or drag a note onto the folder in the sidebar.';
      }

      listEmptyTitle.textContent = title;
      listEmptyText.textContent = text;
      emptyNew.hidden = state.view === 'trash' || state.view === 'starred' || state.view === 'archive';
    }

    var viewTitle = {
      all: 'All notes',
      starred: 'Starred',
      archive: 'Archive',
      trash: 'Trash'
    }[state.view];

    if (state.view === 'folder') {
      var currentFolder = folderById(state.folderId);
      viewTitle = currentFolder ? currentFolder.name : 'Folder';
    }
    if (state.tag) viewTitle = '#' + state.tag;

    listTitle.textContent = viewTitle;
    listSub.textContent = state.query
      ? list.length + (list.length === 1 ? ' match' : ' matches')
      : list.length + (list.length === 1 ? ' note' : ' notes');

    emptyTrashBtn.hidden = !(state.view === 'trash' && docs.some(function (d) { return d.trashed; }));
    if (sortSelect) sortSelect.value = state.sort;

    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.view === state.view);
    });

    folderList.querySelectorAll('.folder-item').forEach(function (row) {
      row.classList.toggle('active', state.view === 'folder' && row.dataset.id === state.folderId);
    });

    if (tagList) {
      tagList.querySelectorAll('.tag-item').forEach(function (row) {
        row.classList.toggle('active', !!state.tag && row.dataset.tag === state.tag);
      });
    }
  }

  /* ---------- Editor ---------- */

  function setStatus(text) {
    saveStatus.textContent = t(text);
  }

  function updateWordCount() {
    var text = plainText(editor.innerHTML);
    var words = countWords(text);
    wordCount.textContent = words + (words === 1 ? ' word' : ' words');
    if (readTime) {
      var minutes = words ? Math.max(1, Math.ceil(words / 200)) : 0;
      readTime.textContent = minutes + ' min read';
    }
    if (charCount) {
      var chars = text.replace(/\s+/g, ' ').trim().length;
      charCount.textContent = chars.toLocaleString(locale()) + (chars === 1 ? ' character' : ' characters');
    }
  }

  function filterByTag(tag) {
    if (!tag) return;
    saveNow();
    state.tag = tag;
    state.view = 'all';
    state.folderId = null;
    state.query = '';
    searchInput.value = '';
    searchClear.hidden = true;
    seenNotes = Object.create(null);
    renderAll();
    renderEditor();
    closeSidebar();
  }

  function renderDocTags(doc) {
    if (!docTags) return;
    docTags.replaceChildren();

    var tags = doc.tags || [];
    if (!tags.length && !doc.pinned && !doc.archived) {
      docTags.hidden = true;
      return;
    }
    docTags.hidden = false;

    if (doc.pinned) {
      var pinned = document.createElement('span');
      pinned.className = 'doc-state pinned';
      pinned.appendChild(icon('pin', 'ic'));
      pinned.appendChild(document.createTextNode('Pinned'));
      docTags.appendChild(pinned);
    }

    if (doc.archived) {
      var archived = document.createElement('span');
      archived.className = 'doc-state archived';
      archived.appendChild(icon('archive', 'ic'));
      archived.appendChild(document.createTextNode('Archived'));
      docTags.appendChild(archived);
    }

    tags.forEach(function (tag) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'doc-tag';
      chip.textContent = '#' + tag;
      chip.title = 'Show all notes tagged #' + tag;
      chip.addEventListener('click', function () { filterByTag(tag); });
      docTags.appendChild(chip);
    });

    if (!doc.trashed) {
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'doc-tag-add';
      add.textContent = '+ Tag';
      add.title = 'Edit tags';
      add.setAttribute('aria-label', 'Edit tags');
      add.addEventListener('click', openTagsModal);
      docTags.appendChild(add);
    }
  }

  function updateReadProgress() {
    if (!pageScroll || !readProgressBar) return;
    var max = pageScroll.scrollHeight - pageScroll.clientHeight;
    var ratio = max > 0 ? pageScroll.scrollTop / max : 0;
    readProgressBar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, ratio)).toFixed(4) + ')';
  }

  function updateEmpty() {
    editor.classList.toggle('is-empty', plainText(editor.innerHTML) === '');
  }

  function renderEditor() {
    var doc = selectedDoc();

    if (!doc) {
      editorEmpty.hidden = false;
      editorShell.hidden = true;
      document.title = t('Notes');
      lastRenderedId = null;
      updateAiContext();
      localizeTree(appEl);
      return;
    }

    editorEmpty.hidden = true;
    editorShell.hidden = false;

    docTitle.value = doc.title;
    docTitle.disabled = doc.trashed;
    editor.innerHTML = doc.html;
    editor.contentEditable = doc.trashed ? 'false' : 'true';

    toolbar.classList.toggle('is-disabled', doc.trashed);
    trashBanner.hidden = !doc.trashed;

    starBtn.setAttribute('aria-pressed', doc.starred ? 'true' : 'false');
    starBtn.setAttribute('aria-label', doc.starred ? 'Remove star' : 'Star note');
    starBtn.title = doc.starred ? 'Remove star' : 'Star note';

    folderSelect.value = doc.folderId || '';
    docFolder.textContent = folderName(doc.folderId) || 'No folder';

    var deleteAction = docMenu.querySelector('[data-act="delete"]');
    if (deleteAction) deleteAction.textContent = doc.trashed ? 'Delete forever' : 'Move to trash';
    var pinAction = docMenu.querySelector('[data-act="pin"]');
    if (pinAction) pinAction.textContent = doc.pinned ? 'Unpin note' : 'Pin note';
    var archiveAction = docMenu.querySelector('[data-act="archive"]');
    if (archiveAction) archiveAction.textContent = doc.archived ? 'Unarchive' : 'Archive';

    setStatus(doc.trashed ? 'In trash' : 'Saved ' + timeOfDay(doc.updatedAt));
    saveStatus.title = 'Last edited ' + new Date(doc.updatedAt).toLocaleString(locale());
    updateWordCount();
    updateEmpty();
    renderDocTags(doc);
    updateAiContext();

    if (doc.id !== lastRenderedId) {
      lastRenderedId = doc.id;
      if (pageScroll) pageScroll.scrollTop = 0;
      updateReadProgress();
      if (pageEl) {
        pageEl.classList.remove('page-in');
        void pageEl.offsetWidth;
        pageEl.classList.add('page-in');
      }
      if (editorPane) {
        editorPane.classList.remove('is-switching');
        void editorPane.offsetWidth;
        editorPane.classList.add('is-switching');
        window.clearTimeout(editorSwitchTimer);
        editorSwitchTimer = window.setTimeout(function () {
          editorPane.classList.remove('is-switching');
        }, 650);
      }
    }

    document.title = (doc.title || t('Untitled')) + ' – ' + t('Notes');
    localizeTree(appEl);
  }

  function renderAll() {
    renderCounts();
    renderFolders();
    renderFolderSelect();
    renderTags();
    renderList();
    localizeTree(appEl);
  }

  function selectDoc(id) {
    if (id === state.selectedId) {
      if (window.innerWidth <= 760) document.body.classList.add('show-editor');
      return;
    }

    saveNow();
    state.selectedId = id;
    persistSelected();

    renderList();
    renderEditor();

    if (window.innerWidth <= 760) document.body.classList.add('show-editor');
    closeSidebar();
  }

  function createNote(folderId) {
    saveNow();

    var now = Date.now();
    var tag = state.tag || null;
    var doc = {
      id: uid(),
      title: '',
      html: '',
      folderId: folderId !== undefined
        ? folderId
        : (state.view === 'folder' ? state.folderId : null),
      starred: false,
      trashed: false,
      pinned: false,
      archived: false,
      tags: tag ? [tag] : [],
      daily: null,
      createdAt: now,
      updatedAt: now
    };

    docs.unshift(doc);
    writeDocs();

    if (state.view === 'trash' || state.view === 'starred' || state.view === 'archive') state.view = 'all';
    state.selectedId = doc.id;
    state.query = '';
    searchInput.value = '';
    searchClear.hidden = true;
    persistSelected();

    renderAll();
    renderEditor();

    if (window.innerWidth <= 760) document.body.classList.add('show-editor');
    closeSidebar();
    docTitle.focus();
  }

  /* ---------- Tags, pinning, archive, templates, history & palette ---------- */

  function allTags() {
    var map = Object.create(null);
    docs.forEach(function (doc) {
      if (doc.trashed || doc.archived) return;
      (doc.tags || []).forEach(function (tag) {
        var key = tag.toLowerCase();
        if (!map[key]) map[key] = { name: tag, count: 0 };
        map[key].count++;
      });
    });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  function renderTags() {
    if (!tagList) return;
    var tags = allTags();
    tagList.replaceChildren();

    if (tagsClear) tagsClear.hidden = !state.tag;
    if (tagsBlock) tagsBlock.hidden = !tags.length && !state.tag;
    if (!tags.length) return;

    tags.forEach(function (tag) {
      var row = document.createElement('div');
      row.className = 'tag-item';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.dataset.tag = tag.name;
      if (state.tag && state.tag.toLowerCase() === tag.name.toLowerCase()) row.classList.add('active');

      row.appendChild(icon('tag', 'ic'));

      var name = document.createElement('span');
      name.className = 'tag-name';
      name.textContent = '#' + tag.name;
      row.appendChild(name);

      var count = document.createElement('span');
      count.className = 'tag-count';
      count.textContent = tag.count;
      row.appendChild(count);

      function choose() {
        state.tag = state.tag && state.tag.toLowerCase() === tag.name.toLowerCase() ? null : tag.name;
        state.view = 'all';
        state.folderId = null;
        seenNotes = Object.create(null);
        renderAll();
        closeSidebar();
      }

      row.addEventListener('click', choose);
      row.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choose();
        }
      });

      tagList.appendChild(row);
    });
  }

  function togglePin() {
    var doc = selectedDoc();
    if (!doc) return;
    saveNow();
    doc.pinned = !doc.pinned;
    doc.updatedAt = Date.now();
    writeDocs();
    renderAll();
    renderEditor();
    toast(doc.pinned ? 'Pinned to top' : 'Unpinned');
  }

  function toggleArchive() {
    var doc = selectedDoc();
    if (!doc || doc.trashed) return;
    saveNow();
    doc.archived = !doc.archived;
    doc.updatedAt = Date.now();
    writeDocs();

    var hiddenNow = state.view === 'archive' ? !doc.archived : doc.archived;
    if (hiddenNow) selectFirstVisible();

    renderAll();
    renderEditor();
    toast(doc.archived ? 'Note archived' : 'Note unarchived');
  }

  function moveDocToFolder(id, folderId) {
    var doc = null;
    docs.forEach(function (item) { if (item.id === id) doc = item; });
    if (!doc || doc.trashed) return;
    if ((doc.folderId || null) === (folderId || null)) return;

    doc.folderId = folderId || null;
    doc.updatedAt = Date.now();
    writeDocs();

    if (state.selectedId === doc.id) {
      folderSelect.value = doc.folderId || '';
      docFolder.textContent = folderName(doc.folderId) || 'No folder';
    }
    renderAll();
    toast('Moved to ' + (folderName(doc.folderId) || 'All notes'));
  }

  /* Tags modal */

  function renderTagModal() {
    var doc = selectedDoc();
    if (!doc || !tagCurrent) return;

    tagCurrent.replaceChildren();
    if (!doc.tags.length) {
      var empty = document.createElement('p');
      empty.className = 'tag-empty';
      empty.textContent = 'No tags on this note yet.';
      tagCurrent.appendChild(empty);
    } else {
      doc.tags.forEach(function (tag) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        var label = document.createElement('span');
        label.textContent = '#' + tag;
        chip.appendChild(label);

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.removeTag = tag;
        remove.setAttribute('aria-label', 'Remove tag ' + tag);
        remove.textContent = '×';
        chip.appendChild(remove);
        tagCurrent.appendChild(chip);
      });
    }

    if (!tagSuggest) return;
    tagSuggest.replaceChildren();
    var used = Object.create(null);
    doc.tags.forEach(function (tag) { used[tag.toLowerCase()] = true; });
    var suggestions = allTags().filter(function (tag) { return !used[tag.name.toLowerCase()]; }).slice(0, 8);

    if (!suggestions.length) return;
    var heading = document.createElement('p');
    heading.className = 'tag-suggest-label';
    heading.textContent = 'Your tags';
    tagSuggest.appendChild(heading);

    var wrap = document.createElement('div');
    wrap.className = 'tag-suggest-list';
    suggestions.forEach(function (tag) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-suggest-btn';
      btn.dataset.addTag = tag.name;
      btn.textContent = '#' + tag.name;
      wrap.appendChild(btn);
    });
    tagSuggest.appendChild(wrap);
  }

  function openTagsModal() {
    if (!selectedDoc()) return;
    renderTagModal();
    openModal('tags-modal');
    window.setTimeout(function () { if (tagInput) tagInput.focus(); }, 80);
  }

  function addTagToSelected(name) {
    var doc = selectedDoc();
    if (!doc) return;
    var next = cleanTags((doc.tags || []).concat([name]));
    if (next.length === (doc.tags || []).length) return;

    saveNow();
    doc.tags = next;
    doc.updatedAt = Date.now();
    writeDocs();
    renderAll();
    renderDocTags(doc);
    renderTagModal();
    toast('Tag added');
  }

  function removeTagFromSelected(name) {
    var doc = selectedDoc();
    if (!doc) return;
    var wanted = String(name || '').toLowerCase();
    var next = (doc.tags || []).filter(function (tag) { return tag.toLowerCase() !== wanted; });
    if (next.length === (doc.tags || []).length) return;

    doc.tags = next;
    doc.updatedAt = Date.now();
    writeDocs();
    renderAll();
    renderDocTags(doc);
    renderTagModal();
    toast('Tag removed');
  }

  /* Version history */

  function snapshotDoc(doc, force) {
    if (!doc || !currentUser) return;
    if (!doc.id || !noteIndex[doc.id]) return;

    var html = sanitizeHtml(doc.html || '');
    var title = String(doc.title || '');
    if (!html && !title) return;

    api.createVersion(doc.id, title, html, !!force).catch(function (error) {
      if (error && (error.status === 401 || error.status === 404)) return;
      console.warn('[notes] could not save version:', error && error.message);
    });
  }

  function historyEmpty(message) {
    var empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = message;
    historyList.appendChild(empty);
  }

  function renderHistoryList(list) {
    if (!historyList) return;
    historyList.replaceChildren();
    if (!list.length) {
      historyEmpty('No saved versions yet. Versions appear automatically as you edit, or you can save one now.');
      return;
    }

    list.forEach(function (entry, index) {
      var item = document.createElement('div');
      item.className = 'history-item';

      var top = document.createElement('div');
      top.className = 'history-top';

      var when = document.createElement('span');
      when.className = 'history-time';
      when.textContent = new Date(entry.createdAt).toLocaleString(locale(), {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      top.appendChild(when);

      var title = document.createElement('span');
      title.className = 'history-title';
      title.textContent = entry.title || 'Untitled note';
      top.appendChild(title);
      item.appendChild(top);

      var snippet = document.createElement('p');
      snippet.className = 'history-snippet';
      snippet.textContent = plainText(entry.html).replace(/\s+/g, ' ').trim().slice(0, 180) || 'Empty note';
      item.appendChild(snippet);

      var actions = document.createElement('div');
      actions.className = 'history-actions';

      var preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'text-btn';
      preview.dataset.previewVersion = String(index);
      preview.textContent = 'Preview';
      actions.appendChild(preview);

      var restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'btn primary small';
      restore.dataset.restoreVersion = String(index);
      restore.textContent = 'Restore';
      actions.appendChild(restore);

      item.appendChild(actions);

      var body = document.createElement('div');
      body.className = 'history-preview';
      body.hidden = true;
      body.textContent = plainText(entry.html);
      item.appendChild(body);

      historyList.appendChild(item);
    });
  }

  function renderHistoryModal() {
    if (!historyList) return;
    var doc = selectedDoc();
    historyList.replaceChildren();
    if (!doc) return;

    if (versionCacheNoteId === doc.id) {
      renderHistoryList(versionCache);
      return;
    }

    var noteId = doc.id;
    versionCache = [];
    versionCacheNoteId = null;
    historyEmpty('Loading versions…');

    api.listVersions(noteId).then(function (versions) {
      var current = selectedDoc();
      if (!current || current.id !== noteId) return;
      versionCache = versions;
      versionCacheNoteId = noteId;
      renderHistoryList(versions);
    }).catch(function (error) {
      if (versionCacheNoteId !== noteId) {
        historyList.replaceChildren();
        historyEmpty(error && error.message ? error.message : 'Could not load versions.');
      }
    });
  }

  function openHistoryModal() {
    var doc = selectedDoc();
    if (!doc) return;
    saveNow();
    openModal('history-modal');
    versionCache = [];
    versionCacheNoteId = null;

    var ready = noteIndex[doc.id] ? Promise.resolve() : runSync();
    ready.then(function () {
      if (!noteIndex[doc.id]) return null;
      return api.createVersion(doc.id, doc.title, doc.html, true);
    }).catch(function () {
      return null;
    }).then(function () {
      renderHistoryModal();
    });
  }

  function restoreVersion(index) {
    var doc = selectedDoc();
    if (!doc) return;
    if (versionCacheNoteId !== doc.id) return;
    var entry = versionCache[index];
    if (!entry) return;
    if (!window.confirm('Restore this version? Your current text will be saved as a version first.')) return;

    api.restoreVersion(doc.id, entry.id).then(function (serverNote) {
      adoptServerNote(doc, serverNote);
      dirty = false;
      renderAll();
      renderEditor();
      versionCache = [];
      versionCacheNoteId = null;
      renderHistoryModal();
      toast('Version restored');
    }).catch(function (error) {
      handleApiError(error, 'Could not restore that version.');
    });
  }

  /* Daily note */

  function dailyKey(date) {
    var d = date || new Date();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function dailyTitle(date) {
    return (date || new Date()).toLocaleDateString(locale(), {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  function openDailyNote() {
    saveNow();
    var now = new Date();
    var key = dailyKey(now);
    var doc = null;

    docs.forEach(function (item) {
      if (item.daily === key) doc = item;
    });

    if (!doc) {
      doc = normalizeDoc({
        title: dailyTitle(now),
        html: '<h2>Plan</h2><p></p><h2>Notes</h2><p></p><h2>Wins</h2><ul><li></li></ul>',
        tags: ['daily'],
        daily: key,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      docs.unshift(doc);
      writeDocs();
      snapshotDoc(doc, true);
    } else {
      doc.trashed = false;
      doc.archived = false;
      writeDocs();
    }

    state.view = 'all';
    state.folderId = null;
    state.tag = null;
    state.query = '';
    searchInput.value = '';
    searchClear.hidden = true;
    state.selectedId = doc.id;
    persistSelected();
    seenNotes = Object.create(null);

    renderAll();
    renderEditor();
    closeSidebar();
    if (window.innerWidth <= 760) document.body.classList.add('show-editor');
    toast("Today's note");
  }

  /* Templates */

  var TEMPLATES = [
    {
      id: 'meeting', name: 'Meeting notes', icon: 'file',
      desc: 'Agenda, decisions and action items.',
      title: 'Meeting notes',
      tags: ['meeting'],
      html: '<h2>Attendees</h2><p></p><h2>Agenda</h2><ul><li></li></ul>' +
        '<h2>Decisions</h2><p></p><h2>Action items</h2><ul><li></li></ul>'
    },
    {
      id: 'todo', name: 'To-do list', icon: 'check',
      desc: 'A simple today and later list.',
      title: 'To-do list',
      tags: ['todo'],
      html: '<h2>Today</h2><ul><li></li></ul><h2>Later</h2><ul><li></li></ul>'
    },
    {
      id: 'journal', name: 'Journal', icon: 'sun',
      desc: 'Reflect on the day and what you are grateful for.',
      title: dailyTitle(new Date()) + ' — journal',
      tags: ['journal'],
      html: '<h2>How I feel</h2><p></p><h2>What happened</h2><p></p>' +
        '<h2>Grateful for</h2><ul><li></li></ul>'
    },
    {
      id: 'project', name: 'Project plan', icon: 'template',
      desc: 'Goal, scope, milestones and risks.',
      title: 'Project plan',
      tags: ['project'],
      html: '<h2>Goal</h2><p></p><h2>Scope</h2><p></p>' +
        '<h2>Milestones</h2><ol><li></li></ol><h2>Risks</h2><p></p>'
    },
    {
      id: 'review', name: 'Weekly review', icon: 'history',
      desc: 'Highlights, challenges and next week.',
      title: 'Weekly review',
      tags: ['review'],
      html: '<h2>Highlights</h2><ul><li></li></ul><h2>Challenges</h2><p></p>' +
        '<h2>Next week</h2><ul><li></li></ul>'
    },
    {
      id: 'ideas', name: 'Brainstorm', icon: 'sparkle',
      desc: 'A question and as many ideas as you can.',
      title: 'Brainstorm',
      tags: ['ideas'],
      html: '<h2>Question</h2><p></p><h2>Ideas</h2><ul><li></li></ul>'
    },
    {
      id: 'reading', name: 'Reading notes', icon: 'file',
      desc: 'Key ideas and quotes from a book.',
      title: 'Reading notes',
      tags: ['reading'],
      html: '<h2>Book</h2><p></p><h2>Key ideas</h2><ul><li></li></ul>' +
        '<h2>Quotes</h2><blockquote></blockquote>'
    }
  ];

  function renderTemplateGrid() {
    if (!templateGrid) return;
    templateGrid.replaceChildren();
    TEMPLATES.forEach(function (tpl) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'template-card';
      card.dataset.template = tpl.id;

      var mark = document.createElement('span');
      mark.className = 'template-icon';
      mark.appendChild(icon(tpl.icon, 'ic'));
      card.appendChild(mark);

      var name = document.createElement('strong');
      name.className = 'template-name';
      name.textContent = tpl.name;
      card.appendChild(name);

      var desc = document.createElement('span');
      desc.className = 'template-desc';
      desc.textContent = tpl.desc;
      card.appendChild(desc);

      templateGrid.appendChild(card);
    });
  }

  function openTemplateModal() {
    renderTemplateGrid();
    openModal('template-modal');
  }

  function createFromTemplate(id) {
    var tpl = null;
    TEMPLATES.forEach(function (item) { if (item.id === id) tpl = item; });
    if (!tpl) return;

    saveNow();
    var now = Date.now();
    var doc = normalizeDoc({
      title: tpl.title,
      html: tpl.html,
      tags: tpl.tags,
      createdAt: now,
      updatedAt: now
    });
    docs.unshift(doc);
    writeDocs();
    snapshotDoc(doc, true);

    state.view = 'all';
    state.folderId = null;
    state.tag = null;
    state.query = '';
    searchInput.value = '';
    searchClear.hidden = true;
    state.selectedId = doc.id;
    persistSelected();
    seenNotes = Object.create(null);

    renderAll();
    renderEditor();
    closeModal('template-modal');
    if (window.innerWidth <= 760) document.body.classList.add('show-editor');
    docTitle.focus();
    toast('Template added');
  }

  /* Focus mode */

  function enterFocus() {
    if (!selectedDoc()) {
      toast('Select a note first');
      return;
    }
    saveNow();
    document.body.classList.add('focus-mode');
    if (focusExit) focusExit.hidden = false;
    closeSidebar();
    toast('Focus mode — press Esc to exit');
  }

  function exitFocus() {
    document.body.classList.remove('focus-mode');
    if (focusExit) focusExit.hidden = true;
  }

  function toggleFocus() {
    if (document.body.classList.contains('focus-mode')) exitFocus();
    else enterFocus();
  }

  /* Command palette */

  var paletteItems = [];
  var paletteIndex = 0;

  function paletteCommands() {
    return [
      { label: 'New note', hint: 'Alt+N', icon: 'plus', run: function () { createNote(); } },
      { label: 'New from template', hint: '', icon: 'template', run: openTemplateModal },
      { label: "Today's note", hint: 'Ctrl+Shift+D', icon: 'sun', run: openDailyNote },
      { label: 'Search notes', hint: '/', icon: 'search', run: function () { searchInput.focus(); searchInput.select(); } },
      { label: 'Toggle dark mode', hint: '', icon: 'moon', run: function () { themeToggle.click(); } },
      { label: 'World clock & timer', hint: 'Ctrl+Shift+T', icon: 'clock', run: openClockModal },
      { label: 'Pin or unpin this note', hint: '', icon: 'pin', run: togglePin },
      { label: 'Edit tags', hint: '', icon: 'tag', run: openTagsModal },
      { label: 'Version history', hint: '', icon: 'history', run: openHistoryModal },
      { label: 'Archive or unarchive this note', hint: '', icon: 'archive', run: toggleArchive },
      { label: 'Focus mode', hint: 'Ctrl+Shift+F', icon: 'expand', run: enterFocus },
      { label: 'Keyboard shortcuts', hint: '?', icon: 'keyboard', run: function () { openModal('shortcuts-modal'); } },
      { label: 'Export backup', hint: '', icon: 'download', run: exportAll },
      { label: 'Print this note', hint: 'Ctrl+P', icon: 'file', run: function () { saveNow(); window.print(); } },
      { label: 'Empty trash', hint: '', icon: 'trash', run: emptyTrash }
    ];
  }

  function setPaletteIndex(next) {
    if (!paletteItems.length) return;
    paletteIndex = (next + paletteItems.length) % paletteItems.length;
    paletteResults.querySelectorAll('.palette-item').forEach(function (node, index) {
      node.classList.toggle('active', index === paletteIndex);
      if (index === paletteIndex && node.scrollIntoView) {
        node.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function runPaletteItem(item) {
    if (!item) return;
    closeModal('palette-modal');
    if (item.kind === 'command') {
      item.command.run();
      return;
    }
    if (item.kind === 'note') {
      var doc = item.doc;
      saveNow();
      state.view = doc.trashed ? 'trash' : (doc.archived ? 'archive' : 'all');
      state.folderId = null;
      state.tag = null;
      state.query = '';
      searchInput.value = '';
      searchClear.hidden = true;
      state.selectedId = doc.id;
      persistSelected();
      seenNotes = Object.create(null);
      renderAll();
      renderEditor();
      closeSidebar();
      if (window.innerWidth <= 760) document.body.classList.add('show-editor');
    }
  }

  function renderPalette(query) {
    if (!paletteResults) return;
    paletteResults.replaceChildren();
    paletteItems = [];
    paletteIndex = 0;

    var q = String(query || '').trim().toLowerCase();

    paletteCommands().forEach(function (command) {
      if (q && command.label.toLowerCase().indexOf(q) === -1) return;
      paletteItems.push({ kind: 'command', command: command });
    });

    if (q) {
      docs.filter(function (doc) {
        var haystack = ((doc.title || '') + ' ' + plainText(doc.html) + ' ' + (doc.tags || []).join(' ')).toLowerCase();
        return haystack.indexOf(q) !== -1;
      }).sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      }).slice(0, 8).forEach(function (doc) {
        paletteItems.push({ kind: 'note', doc: doc });
      });
    }

    if (!paletteItems.length) {
      var empty = document.createElement('p');
      empty.className = 'palette-empty';
      empty.textContent = 'No commands or notes match “' + query + '”.';
      paletteResults.appendChild(empty);
      return;
    }

    paletteItems.forEach(function (item, index) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'palette-item' + (index === 0 ? ' active' : '') +
        (item.kind === 'note' ? ' note-result' : '');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', index === 0 ? 'true' : 'false');

      var mark = document.createElement('span');
      mark.className = 'palette-icon';
      if (item.kind === 'command') mark.appendChild(icon(item.command.icon, 'ic'));
      else mark.appendChild(icon(item.doc.trashed ? 'trash' : item.doc.archived ? 'archive' : 'file', 'ic'));
      row.appendChild(mark);

      var copy = document.createElement('span');
      copy.className = 'palette-copy';

      var label = document.createElement('span');
      label.className = 'palette-label';
      label.textContent = item.kind === 'command'
        ? item.command.label
        : (item.doc.title || 'Untitled note');
      copy.appendChild(label);

      var meta = document.createElement('span');
      meta.className = 'palette-meta';
      if (item.kind === 'command') {
        meta.textContent = 'Action';
      } else {
        meta.textContent = (item.doc.archived ? 'Archived · ' : '') +
          (folderName(item.doc.folderId) || 'No folder') + ' · ' + listDate(item.doc.updatedAt);
      }
      copy.appendChild(meta);
      row.appendChild(copy);

      if (item.kind === 'command' && item.command.hint) {
        var hint = document.createElement('span');
        hint.className = 'palette-hint';
        hint.textContent = item.command.hint;
        row.appendChild(hint);
      }

      row.addEventListener('mouseenter', function () { setPaletteIndex(index); });
      row.addEventListener('click', function () { runPaletteItem(item); });

      paletteResults.appendChild(row);
    });
  }

  function openPalette() {
    if (!paletteModal) return;
    paletteInput.value = '';
    renderPalette('');
    openModal('palette-modal');
    window.setTimeout(function () { paletteInput.focus(); }, 80);
  }

  function movePalette(step) {
    setPaletteIndex(paletteIndex + step);
  }

  function choosePaletteItem() {
    runPaletteItem(paletteItems[paletteIndex]);
  }

  function handleEdit() {
    var doc = selectedDoc();
    if (!doc || doc.trashed) return;

    doc.html = editor.innerHTML;
    doc.updatedAt = Date.now();
    dirty = true;

    setStatus('Saving…');
    updateWordCount();
    updateEmpty();
    scheduleSave();
    updateToolbar();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 500);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    var doc = selectedDoc();
    if (!doc || !dirty) return;

    if (!currentUser) return;

    doc.html = sanitizeHtml(editor.innerHTML);
    doc.updatedAt = Date.now();

    dirty = false;
    writeDocs();
    snapshotDoc(doc);
    setStatus('Saving…');
    saveStatus.title = 'Last edited ' + new Date(doc.updatedAt).toLocaleString(locale());
    saveStatus.classList.remove('flash');
    void saveStatus.offsetWidth;
    saveStatus.classList.add('flash');
    renderList();
    renderCounts();
  }

  /* ---------- Formatting ---------- */

  function runCommand(cmd, value) {
    if (!editor.isContentEditable) return;
    editor.focus();
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, value === undefined ? null : value);
    } catch (e) {}
    handleEdit();
    updateToolbar();
  }

  function updateToolbar() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.anchorNode || !editor.contains(sel.anchorNode)) return;

    ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList',
      'justifyLeft', 'justifyCenter', 'justifyRight'].forEach(function (cmd) {
      var btn = toolbar.querySelector('[data-cmd="' + cmd + '"]');
      if (!btn) return;
      var on = false;
      try { on = document.queryCommandState(cmd); } catch (e) {}
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('active', on);
    });

    var block = '';
    try { block = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); } catch (e) {}
    blockFormat.value = ['h1', 'h2', 'h3', 'blockquote', 'pre'].indexOf(block) !== -1 ? block : 'p';
  }

  function rememberRange() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (editor.contains(sel.anchorNode) && editor.contains(sel.focusNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreRange() {
    if (!savedRange) return;
    if (!editor.contains(savedRange.commonAncestorContainer)) return;
    editor.focus();
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function insertLink() {
    rememberRange();

    var sel = window.getSelection();
    var node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    var existing = node && node.closest ? node.closest('a') : null;

    var url = window.prompt('Link URL', existing ? existing.getAttribute('href') : 'https://');
    if (url === null) return;

    url = url.trim();
    if (!url) {
      if (existing) {
        restoreRange();
        runCommand('unlink');
      }
      return;
    }

    if (!/^(https?:|mailto:)/i.test(url)) url = 'https://' + url;

    restoreRange();
    editor.focus();

    if (sel.isCollapsed) {
      document.execCommand('insertHTML', false,
        '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>');
      handleEdit();
    } else {
      runCommand('createLink', url);
    }

    editor.querySelectorAll('a[href]').forEach(function (a) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  /* ---------- Trash ---------- */

  function selectFirstVisible() {
    var next = visibleDocs()[0];
    state.selectedId = next ? next.id : null;
    persistSelected();
  }

  function trashCurrent() {
    var doc = selectedDoc();
    if (!doc || doc.trashed) return;

    saveNow();
    doc.trashed = true;
    doc.updatedAt = Date.now();
    writeDocs();

    selectFirstVisible();
    renderAll();
    renderEditor();
    toast('Moved to trash');
  }

  function restoreCurrent() {
    var doc = selectedDoc();
    if (!doc || !doc.trashed) return;

    var wasArchived = doc.archived;
    doc.trashed = false;
    doc.updatedAt = Date.now();
    writeDocs();

    state.view = wasArchived ? 'archive' : 'all';
    state.folderId = null;
    state.tag = null;
    renderAll();
    renderEditor();
    toast('Note restored');
  }

  function purgeCurrent() {
    var doc = selectedDoc();
    if (!doc) return;
    if (!window.confirm('Delete “' + (doc.title || 'Untitled') + '” forever? This cannot be undone.')) return;

    docs = docs.filter(function (d) { return d.id !== doc.id; });
    writeDocs();

    selectFirstVisible();
    renderAll();
    renderEditor();
    toast('Deleted forever');
  }

  function emptyTrash() {
    if (!docs.some(function (d) { return d.trashed; })) return;
    if (!window.confirm('Delete every note in Trash forever? This cannot be undone.')) return;

    docs = docs.filter(function (d) { return !d.trashed; });
    writeDocs();

    if (!docs.some(function (d) { return d.id === state.selectedId; })) {
      state.selectedId = null;
      persistSelected();
    }

    renderAll();
    renderEditor();
    toast('Trash emptied');
  }

  /* ---------- Duplicate / export ---------- */

  function duplicateCurrent() {
    var doc = selectedDoc();
    if (!doc) return;

    saveNow();
    var now = Date.now();
    var copy = normalizeDoc({
      title: (doc.title || 'Untitled') + ' (copy)',
      html: doc.html,
      folderId: doc.folderId,
      starred: false,
      trashed: false,
      pinned: false,
      archived: false,
      tags: (doc.tags || []).slice(),
      createdAt: now,
      updatedAt: now
    });

    docs.unshift(copy);
    writeDocs();

    state.selectedId = copy.id;
    persistSelected();
    renderAll();
    renderEditor();
    toast('Note duplicated');
  }

  function slug(value) {
    return String(value || 'note')
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'note';
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function exportCurrent(kind) {
    var doc = selectedDoc();
    if (!doc) return;

    saveNow();
    var title = doc.title || 'Untitled';
    var name = slug(title);

    if (kind === 'txt') {
      download(name + '.txt', title + '\n\n' + plainText(doc.html) + '\n', 'text/plain;charset=utf-8');
      toast('Text file downloaded');
      return;
    }

    var html =
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + escapeHtml(title) + '</title>\n<style>\n' +
      'body{max-width:760px;margin:48px auto;padding:0 24px;font:16px/1.75 "Segoe UI",system-ui,Arial,sans-serif;color:#1f2328}\n' +
      'h1,h2,h3{line-height:1.3;letter-spacing:-.015em}\n' +
      'blockquote{margin:0 0 1em;padding:2px 0 2px 16px;border-left:3px solid #2563eb;color:#6b7280}\n' +
      'pre{padding:12px 14px;border-radius:9px;background:#f0f2f5;overflow-x:auto;white-space:pre-wrap}\n' +
      'a{color:#1d4ed8}\n' +
      'hr{border:0;border-top:1px solid #cfd4dc;margin:1.5em 0}\n' +
      '</style>\n</head>\n<body>\n<h1>' + escapeHtml(title) + '</h1>\n' +
      doc.html + '\n</body>\n</html>';

    download(name + '.html', html, 'text/html;charset=utf-8');
    toast('HTML file downloaded');
  }

  function exportAll() {
    if (!currentUser) return;
    saveNow();
    runSync()
      .then(function () { return api.exportData(); })
      .then(function (payload) {
        var stamp = new Date().toISOString().slice(0, 10);
        download(
          'notes-backup-' + stamp + '.json',
          JSON.stringify(payload, null, 2),
          'application/json'
        );
        toast('Backup downloaded');
      })
      .catch(function (error) {
        handleApiError(error, 'Could not export your notes.');
      });
  }

  function importFile(file) {
    if (!file || !currentUser) return;

    file.text().then(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        writingError('Could not read that backup file');
        return null;
      }

      var rawNotes = Array.isArray(data) ? data : (data && Array.isArray(data.notes) ? data.notes : null);
      if (!rawNotes) {
        writingError('That file is not a Notes backup');
        return null;
      }

      return api.importData(data).then(function (result) {
        return loadWorkspace().then(function () {
          var imported = result && result.imported ? result.imported : {};
          toast('Imported ' + (Number(imported.notes) || 0) + ' notes');
        });
      });
    }).catch(function (error) {
      writingError(error && error.message ? error.message : 'Could not import that backup file');
    });
  }

  /* ---------- Sharing ---------- */

  function shareDate(ts) {
    var date = new Date(Number(ts) || Date.now());
    if (isNaN(date.getTime())) date = new Date();
    return date.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function bytesToB64(bytes) {
    var chunk = 0x8000;
    var binary = '';
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function b64ToBytes(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function toB64Url(b64) {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64Url(value) {
    var text = String(value).replace(/-/g, '+').replace(/_/g, '/');
    while (text.length % 4) text += '=';
    return text;
  }

  function deflateBytes(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buffer) {
      return new Uint8Array(buffer);
    });
  }

  function inflateBytes(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buffer) {
      return new Uint8Array(buffer);
    });
  }

  function deriveShareKey(password, salt) {
    var base = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return base.then(function (key) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' },
        key,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  function encodeShare(payload, password) {
    var json = new TextEncoder().encode(JSON.stringify(payload));

    if (password) {
      if (!(window.crypto && crypto.subtle)) {
        return Promise.reject(new Error('Password protection is not available in this browser.'));
      }
      var salt = crypto.getRandomValues(new Uint8Array(16));
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return deriveShareKey(password, salt).then(function (key) {
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, json);
      }).then(function (cipher) {
        return 'p.' + toB64Url(bytesToB64(salt)) + '.' + toB64Url(bytesToB64(iv)) +
          '.' + toB64Url(bytesToB64(new Uint8Array(cipher)));
      });
    }

    if (typeof CompressionStream === 'function') {
      return deflateBytes(json).then(function (packed) {
        return 'z.' + toB64Url(bytesToB64(packed));
      });
    }

    return Promise.resolve('j.' + toB64Url(bytesToB64(json)));
  }

  function decodeShare(token, password) {
    if (!token) return Promise.reject(new Error('This link is empty.'));
    if (token.length > 4000000) return Promise.reject(new Error('This link is too large to open.'));

    if (token.indexOf('p.') === 0) {
      if (!password) {
        var locked = new Error('This note is password protected.');
        locked.locked = true;
        return Promise.reject(locked);
      }
      if (!(window.crypto && crypto.subtle)) {
        return Promise.reject(new Error('This browser cannot decrypt the link. Try Chrome or Edge.'));
      }
      var parts = token.split('.');
      if (parts.length !== 4) return Promise.reject(new Error('This link is damaged.'));

      var salt = b64ToBytes(fromB64Url(parts[1]));
      var iv = b64ToBytes(fromB64Url(parts[2]));
      var data = b64ToBytes(fromB64Url(parts[3]));

      return deriveShareKey(password, salt).then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
      }).then(function (plain) {
        return JSON.parse(new TextDecoder().decode(plain));
      }).catch(function () {
        var wrong = new Error('That password did not work.');
        wrong.locked = true;
        throw wrong;
      });
    }

    var kind = token.charAt(0);
    if (kind !== 'z' && kind !== 'j') return Promise.reject(new Error('This link is not a Notes share link.'));

    if (kind === 'z' && typeof DecompressionStream !== 'function') {
      return Promise.reject(new Error('This browser cannot open compressed links. Try Chrome or Edge.'));
    }

    var bytes = b64ToBytes(fromB64Url(token.slice(2)));
    var ready = kind === 'z' ? inflateBytes(bytes) : Promise.resolve(bytes);

    return ready.then(function (plain) {
      var payload = JSON.parse(new TextDecoder().decode(plain));
      if (!payload || typeof payload !== 'object' || typeof payload.h !== 'string') {
        throw new Error('This link does not contain a note.');
      }
      return payload;
    }).catch(function (err) {
      if (err && /Unexpected|JSON/i.test(err.message || '')) throw new Error('This link is damaged or incomplete.');
      throw err;
    });
  }

  function shareBaseUrl() {
    return location.href.split('#')[0];
  }

  function updateShareAccess() {
    /* Sharing is disabled in this build. */
    return;

    shareAccessMode = shareAccessSelect.value;
    var use = shareAccessIcon.querySelector('use');

    if (shareAccessMode === 'password') {
      if (use) use.setAttribute('href', '#i-lock');
      shareAccessTitle.textContent = 'Password protected';
      shareAccessDesc.textContent = 'Only people with the password can open this note.';
      shareSubtitleEl.textContent = 'The link is locked with a password.';
    } else if (shareAccessMode === 'copy') {
      if (use) use.setAttribute('href', '#i-globe');
      shareAccessTitle.textContent = 'Anyone with the link';
      shareAccessDesc.textContent = 'Can view the note and save their own copy.';
      shareSubtitleEl.textContent = 'Anyone with the link can save a copy to their notes.';
    } else {
      if (use) use.setAttribute('href', '#i-globe');
      shareAccessTitle.textContent = 'Anyone with the link';
      shareAccessDesc.textContent = 'Can view the note.';
      shareSubtitleEl.textContent = 'Anyone with the link can open a read-only copy.';
    }

    sharePasswordField.hidden = shareAccessMode !== 'password';
    shareAccessIcon.classList.remove('pop');
    void shareAccessIcon.offsetWidth;
    shareAccessIcon.classList.add('pop');
  }

  function refreshShareLink() {
    /* Sharing is disabled in this build. */
    return;

    var doc = selectedDoc();
    if (!doc) return;

    var seq = ++shareSeq;
    var password = shareAccessMode === 'password' ? sharePasswordInput.value : '';
    var tooShort = shareAccessMode === 'password' && password.length < 4;

    if (tooShort) {
      shareLinkInput.value = '';
      shareLinkInput.placeholder = 'Choose a password to create the link';
      shareCopyBtn.disabled = true;
      shareDownloadBtn.disabled = false;
      shareErrorEl.hidden = true;
      shareLinkRow.classList.remove('is-loading');
      return;
    }

    shareLinkInput.value = '';
    shareLinkInput.placeholder = 'Creating link…';
    shareCopyBtn.disabled = true;
    shareDownloadBtn.disabled = true;
    shareLinkRow.classList.remove('is-ready');
    shareLinkRow.classList.add('is-loading');

    var payload = {
      v: 1,
      t: doc.title || 'Untitled note',
      h: doc.html || '',
      a: shareAccessMode === 'copy' ? 'copy' : 'view',
      u: doc.updatedAt || Date.now()
    };

    encodeShare(payload, password).then(function (token) {
      if (seq !== shareSeq) return;
      shareLinkInput.value = shareBaseUrl() + '#share=' + token;
      shareLinkInput.placeholder = '';
      shareCopyBtn.disabled = false;
      shareDownloadBtn.disabled = false;
      shareErrorEl.hidden = true;
      shareLinkRow.classList.remove('is-loading');
      shareLinkRow.classList.remove('is-ready');
      void shareLinkRow.offsetWidth;
      shareLinkRow.classList.add('is-ready');
      clearTimeout(shareReadyTimer);
      shareReadyTimer = window.setTimeout(function () {
        shareLinkRow.classList.remove('is-ready');
      }, 700);
    }).catch(function (err) {
      if (seq !== shareSeq) return;
      shareLinkInput.value = '';
      shareLinkInput.placeholder = 'Could not create the link';
      shareErrorEl.textContent = (err && err.message) || 'Could not create the link.';
      shareErrorEl.hidden = false;
      shareCopyBtn.disabled = true;
      shareDownloadBtn.disabled = false;
      shareLinkRow.classList.remove('is-loading');
    });
  }

  function openShareDialog() {
    /* Sharing is disabled in this build. */
    return;

    var doc = selectedDoc();
    if (!doc) {
      toast('Open a note first');
      return;
    }
    if (doc.trashed) {
      toast('Restore the note before sharing it');
      return;
    }

    saveNow();
    shareTitleEl.textContent = 'Share “' + (doc.title || 'Untitled note') + '”';
    shareEmailInput.value = '';
    sharePasswordInput.value = '';
    shareErrorEl.hidden = true;
    clearTimeout(shareCopyTimer);
    shareCopyBtn.classList.remove('is-copied');
    shareCopyBtn.textContent = 'Copy link';
    shareOpenBtn.classList.remove('pulse');
    void shareOpenBtn.offsetWidth;
    shareOpenBtn.classList.add('pulse');
    updateShareAccess();
    updateNativeShare();
    openModal('share-modal');
    refreshShareLink();
  }

  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    area.remove();
    return ok;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }, function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function handleShareCopy() {
    var link = shareLinkInput.value;
    if (!link || link.indexOf('#share=') === -1) {
      toast('Create the link first');
      return;
    }
    copyToClipboard(link).then(function (ok) {
      if (ok) {
        clearTimeout(shareCopyTimer);
        shareCopyBtn.classList.add('is-copied');
        shareCopyBtn.textContent = 'Copied';
        shareCopyTimer = window.setTimeout(function () {
          shareCopyBtn.classList.remove('is-copied');
          shareCopyBtn.textContent = 'Copy link';
        }, 1800);
      }
      toast(ok ? 'Link copied' : 'Could not copy — select the link and press Ctrl+C');
    });
  }

  function emailShareLink() {
    var link = shareLinkInput.value;
    if (!link || link.indexOf('#share=') === -1) {
      toast('Create the link first');
      return;
    }

    var doc = selectedDoc();
    var title = doc ? (doc.title || 'Untitled note') : 'Shared note';
    var subject = 'Shared note: ' + title;
    var body = 'I shared a note with you: ' + title + '\n\n';

    if (link.length <= 1500) {
      body += link + '\n\n';
    } else {
      body += 'The link is very long, so it was copied to your clipboard — paste it here.\n\n';
      copyToClipboard(link);
    }

    if (shareAccessMode === 'password') {
      body += 'Password: (send this to them separately)\n\n';
    }

    body += 'It opens in the Notes app.';

    var to = shareEmailInput.value.trim();
    window.location.href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function buildShareHtml(doc, access) {
    var title = doc.title || 'Untitled note';
    var date = shareDate(doc.updatedAt);
    var canCopy = access === 'copy';
    var note = {
      id: 'shared_' + Date.now().toString(36),
      title: title,
      html: doc.html || '',
      folderId: null,
      starred: false,
      trashed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    var json = JSON.stringify({
      app: 'notes',
      version: 1,
      exportedAt: new Date().toISOString(),
      folders: [],
      notes: [note]
    }).replace(/</g, '\\u003c');

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<meta name="robots" content="noindex">\n' +
      '<title>' + escapeHtml(title) + '</title>\n<style>\n' +
      ':root{--ink:#1f2328;--muted:#6b7280;--line:#e2e5ea;--paper:#fff;--bg:#f5f6f8;--accent:#2563eb}\n' +
      '@media(prefers-color-scheme:dark){:root{--ink:#e7e9ec;--muted:#9aa3ad;--line:#2e333a;--paper:#20242a;--bg:#131518;--accent:#7aa2ff}}\n' +
      '*{box-sizing:border-box}\n' +
      'body{margin:0;padding:32px 18px 64px;background:var(--bg);color:var(--ink);font:16px/1.75 "Segoe UI",system-ui,Arial,sans-serif}\n' +
      '.bar{max-width:820px;margin:0 auto 16px;display:flex;align-items:center;gap:10px;font-size:.78rem;color:var(--muted)}\n' +
      '.brand{display:inline-flex;align-items:center;gap:7px;font-weight:700;color:var(--ink)}\n' +
      '.badge{border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--paper);font-weight:600}\n' +
      '.spacer{flex:1}\n' +
      '.sheet{max-width:820px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:clamp(24px,5vw,58px);box-shadow:0 1px 2px rgba(16,24,40,.05),0 14px 34px rgba(16,24,40,.09)}\n' +
      'h1.title{margin:0 0 6px;font-size:2rem;line-height:1.2;letter-spacing:-.02em}\n' +
      '.meta{margin:0 0 28px;font-size:.76rem;color:var(--muted)}\n' +
      '.content{font-size:1rem;line-height:1.75;word-wrap:break-word;overflow-wrap:break-word}\n' +
      '.content>:first-child{margin-top:0}.content>:last-child{margin-bottom:0}\n' +
      '.content p,.content div{margin:0 0 .8em}\n' +
      '.content h1{margin:1.1em 0 .45em;font-size:1.85rem;line-height:1.25}\n' +
      '.content h2{margin:1.15em 0 .4em;font-size:1.4rem;line-height:1.3}\n' +
      '.content h3{margin:1.1em 0 .35em;font-size:1.15rem;line-height:1.35}\n' +
      '.content ul,.content ol{margin:0 0 .85em;padding-left:1.5em}\n' +
      '.content li{margin:.22em 0}\n' +
      '.content blockquote{margin:0 0 .9em;padding:2px 0 2px 16px;border-left:3px solid var(--accent);color:var(--muted)}\n' +
      '.content pre{margin:0 0 .9em;padding:12px 14px;border-radius:9px;background:var(--bg);border:1px solid var(--line);font:0.84em/1.6 "Cascadia Code",Consolas,monospace;overflow-x:auto;white-space:pre-wrap}\n' +
      '.content code{font-family:"Cascadia Code",Consolas,monospace;font-size:.88em;padding:1px 5px;border-radius:5px;background:var(--bg)}\n' +
      '.content a{color:var(--accent);text-underline-offset:2px}\n' +
      '.content hr{margin:1.5em 0;border:0;border-top:1px solid var(--line)}\n' +
      '.content table{border-collapse:collapse;width:100%;margin:0 0 1em}\n' +
      '.content th,.content td{border:1px solid var(--line);padding:7px 10px;text-align:left}\n' +
      '.foot{margin:28px 0 0;padding-top:14px;border-top:1px solid var(--line);font-size:.72rem;color:var(--muted)}\n' +
      '.btn{height:34px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}\n' +
      '.btn.primary{border-color:transparent;background:var(--accent);color:#fff}\n' +
      '.btn[hidden]{display:none}\n' +
      '@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}\n' +
      '.bar{animation:rise .4s ease both}\n' +
      '.sheet{animation:rise .55s .06s cubic-bezier(.22,1,.36,1) both}\n' +
      '.content>*{animation:rise .42s .14s both}\n' +
      '.btn{transition:transform .15s ease,filter .15s ease,background-color .2s ease}\n' +
      '.btn:hover{transform:translateY(-1px);filter:brightness(1.05)}\n' +
      '.btn:active{transform:scale(.97)}\n' +
      '@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n' +
      '@media print{body{background:#fff;padding:0}.bar,.btn{display:none}.sheet{border:0;box-shadow:none;padding:0;max-width:none}}\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="bar"><span class="brand">Notes</span><span class="badge">' +
      (canCopy ? 'Shared · can save a copy' : 'Shared · read only') + '</span><span class="spacer"></span>' +
      '<button class="btn primary" id="save-copy" type="button"' + (canCopy ? '' : ' hidden') + '>Save a copy to Notes</button></div>\n' +
      '<main class="sheet">\n<h1 class="title">' + escapeHtml(title) + '</h1>\n' +
      '<p class="meta">Updated ' + escapeHtml(date) + '</p>\n' +
      '<article class="content">\n' + (doc.html || '') + '\n</article>\n' +
      '<p class="foot">Shared from <strong>Notes</strong> · saved on the sender\'s computer</p>\n' +
      '</main>\n' +
      '<script id="note-data" type="application/json">' + json + '<\/script>\n' +
      '<script>\n' +
      '(function(){\n' +
      '  var btn = document.getElementById("save-copy");\n' +
      '  if (!btn) return;\n' +
      '  btn.addEventListener("click", function(){\n' +
      '    var data = document.getElementById("note-data").textContent;\n' +
      '    var blob = new Blob([data], { type: "application/json" });\n' +
      '    var url = URL.createObjectURL(blob);\n' +
      '    var a = document.createElement("a");\n' +
      '    a.href = url;\n' +
      '    a.download = ' + JSON.stringify(slug(title) + '.json') + ';\n' +
      '    document.body.appendChild(a);\n' +
      '    a.click();\n' +
      '    a.remove();\n' +
      '    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);\n' +
      '    btn.textContent = "Saved — import the file in Notes";\n' +
      '  });\n' +
      '})();\n' +
      '<\/script>\n</body>\n</html>';
  }

  function downloadShareFile() {
    var doc = selectedDoc();
    if (!doc) return;
    var html = buildShareHtml(doc, shareAccessMode);
    download(slug(doc.title || 'note') + '-shared.html', html, 'text/html;charset=utf-8');
    toast('Shareable file downloaded');
  }

  function updateNativeShare() {
    shareNativeBtn.hidden = typeof navigator.share !== 'function';
  }

  function nativeShareNote() {
    var doc = selectedDoc();
    if (!doc || typeof navigator.share !== 'function') return;

    var title = doc.title || 'Untitled note';
    var data = { title: title, text: 'Shared note: ' + title };
    var file = null;

    try {
      file = new File([buildShareHtml(doc, shareAccessMode)], slug(title) + '-shared.html', { type: 'text/html' });
    } catch (e) {
      file = null;
    }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      data.files = [file];
    } else if (shareLinkInput.value.indexOf('#share=') !== -1) {
      data.url = shareLinkInput.value;
    }

    navigator.share(data).catch(function (err) {
      if (!err || err.name !== 'AbortError') toast('Could not open the share sheet');
    });
  }

  function openSharedView(payload) {
    /* Sharing is disabled in this build. */
    return;

    hideIntroForShare();
    sharedPayload = payload;
    sharedSaveAllowed = payload.a === 'copy';
    sharedTitleEl.textContent = payload.t || 'Untitled note';
    sharedMetaEl.textContent = 'Updated ' + shareDate(payload.u);
    sharedBodyEl.innerHTML = sanitizeHtml(payload.h || '');
    sharedBadgeEl.textContent = sharedSaveAllowed ? 'Can save a copy' : 'Read only';
    sharedBadgeEl.classList.remove('pop');
    void sharedBadgeEl.offsetWidth;
    sharedBadgeEl.classList.add('pop');
    sharedCopyBtn.hidden = !sharedSaveAllowed;
    sharedDocEl.hidden = false;
    sharedLockedEl.hidden = true;
    sharedView.hidden = false;
    document.body.classList.add('shared-mode');
    document.title = (payload.t || 'Untitled note') + ' – Shared note';
  }

  function showSharedLocked(title, message) {
    hideIntroForShare();
    sharedView.hidden = false;
    sharedDocEl.hidden = true;
    sharedLockedEl.hidden = false;
    sharedLockedTitle.textContent = title;
    sharedLockedText.textContent = message;
    sharedErrorEl.hidden = true;
    document.body.classList.add('shared-mode');
    document.title = 'Shared note – Notes';
    if (title === 'This note is protected') {
      window.setTimeout(function () { sharedPasswordInput.focus(); }, 80);
    }
  }

  function closeSharedView() {
    sharedView.hidden = true;
    document.body.classList.remove('shared-mode');
    if (appEl) appEl.inert = false;
    sharedPayload = null;
    try {
      history.replaceState(null, '', location.href.split('#')[0]);
    } catch (e) {
      location.hash = '';
    }
    document.title = 'Notes';
  }

  function saveSharedCopy() {
    /* Sharing is disabled in this build. */
    return;

    if (!sharedPayload || !sharedSaveAllowed) return;

    var now = Date.now();
    var doc = normalizeDoc({
      title: sharedPayload.t || 'Untitled note',
      html: sharedPayload.h,
      folderId: null,
      starred: false,
      trashed: false,
      createdAt: now,
      updatedAt: now
    });

    docs.unshift(doc);
    writeDocs();
    state.selectedId = doc.id;
    persistSelected();
    closeSharedView();
    renderAll();
    renderEditor();
    toast('Saved to your notes');
  }

  function initSharedViewer() {
    /* URL-based sharing is disabled in this build. */
    return false;

    var hash = location.hash || '';
    if (hash.indexOf('#share=') !== 0) return false;

    sharedToken = hash.slice(7);
    sharedView.hidden = false;
    sharedLockedEl.hidden = true;
    sharedDocEl.hidden = true;
    sharedUnlockForm.hidden = false;
    sharedPasswordInput.value = '';
    document.body.classList.add('shared-mode');

    decodeShare(sharedToken).then(function (payload) {
      openSharedView(payload);
    }).catch(function (err) {
      if (err && err.locked) {
        showSharedLocked('This note is protected', 'Enter the password you were given to open it.');
        sharedUnlockForm.hidden = false;
      } else {
        showSharedLocked('This link cannot be opened', (err && err.message) || 'Ask the sender for a new link or the shareable file.');
        sharedUnlockForm.hidden = true;
      }
    });

    return true;
  }

  /* ---------- Theme / toast / sidebar ---------- */

  /* ---------- Opening screen ---------- */

  var INTRO_LOAD_MS = 900;
  var INTRO_LEAVE_MS = 620;

  function openNotes(useFullscreen) {
    if (!introEl || introEl.hidden || introEl.classList.contains('is-leaving') ||
        introEl.classList.contains('is-loading')) {
      return;
    }

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (useFullscreen !== false) {
      try {
        var root = document.documentElement;
        if (!document.fullscreenElement && root.requestFullscreen) {
          var attempt = root.requestFullscreen();
          if (attempt && attempt.catch) attempt.catch(function () {});
        }
      } catch (e) {}
    }

    if (reduced) {
      document.body.classList.remove('intro-open');
      document.body.classList.add('app-opening');
      if (appEl) appEl.inert = false;
      introEl.hidden = true;
      window.setTimeout(function () {
        document.body.classList.remove('app-opening');
      }, 40);
      return;
    }

    // Loading phase: show the loader, then reveal the notebook behind it.
    introEl.classList.add('is-loading');
    introEl.setAttribute('aria-busy', 'true');
    if (introLoaderEl) introLoaderEl.hidden = false;

    window.setTimeout(function () {
      document.body.classList.remove('intro-open');
      document.body.classList.add('app-opening');
      if (appEl) appEl.inert = false;

      introEl.classList.add('is-leaving');
      introEl.removeAttribute('aria-busy');

      window.setTimeout(function () {
        introEl.hidden = true;
        introEl.classList.remove('is-leaving', 'is-loading');
        if (introLoaderEl) introLoaderEl.hidden = true;
      }, INTRO_LEAVE_MS);

      window.setTimeout(function () {
        document.body.classList.remove('app-opening');
      }, 1500);
    }, INTRO_LOAD_MS);

    if (window.innerWidth > 760) {
      window.setTimeout(function () {
        var target = editor && editorShell && !editorShell.hidden ? editor : docTitle;
        if (target && typeof target.focus === 'function') {
          try { target.focus({ preventScroll: true }); } catch (e) {}
        }
      }, INTRO_LOAD_MS + 560);
    }
  }

  function hideIntroForShare() {
    if (!introEl || introEl.hidden) return;
    introEl.hidden = true;
    introEl.classList.remove('is-leaving', 'is-loading');
    introEl.removeAttribute('aria-busy');
    if (introLoaderEl) introLoaderEl.hidden = true;
    document.body.classList.remove('intro-open', 'app-opening');
    if (appEl) appEl.inert = false;
  }

  function applyTheme(theme) {
    var dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
    var use = themeIcon.querySelector('use');
    if (use) use.setAttribute('href', dark ? '#i-sun' : '#i-moon');
  }

  function toast(message) {
    message = t(message);
    toastEl.textContent = message;
    live.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2400);
  }

  /* ---------- Writing Error Animation ---------- */

  var ERROR_EMOJIS = ['😵', '💥', '😱', '🤯', '😭', '🙈', '😬', '💣'];

  function writingError(message) {
    if (!editor) return;

    // Shake the editor area
    editor.classList.add('editor-shake');
    window.setTimeout(function () {
      editor.classList.remove('editor-shake');
    }, 420);

    // Float a random error emoji up from the editor
    var rect = editor.getBoundingClientRect();
    var emoji = document.createElement('div');
    emoji.className = 'error-emoji';
    emoji.textContent = ERROR_EMOJIS[Math.floor(Math.random() * ERROR_EMOJIS.length)];
    emoji.style.left = (rect.left + rect.width / 2 - 24) + 'px';
    emoji.style.top = (rect.top + rect.height / 2 - 24) + 'px';
    document.body.appendChild(emoji);

    window.setTimeout(function () {
      emoji.remove();
    }, 1200);

    // Also show the toast if a message is given
    if (message) toast(message);
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  /* ---------- AI assistant ---------- */

  var AI_SYSTEM =
    'You are the built-in writing assistant inside a private notes app. ' +
    'You are precise, useful and concise. Always reply with a clean HTML fragment and nothing else. ' +
    'Allowed tags: <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <u>, <s>, ' +
    '<blockquote>, <pre>, <code>, <a>, <hr>, <br>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. ' +
    'Never include <html>, <body>, <script>, markdown code fences, or commentary about being an AI. ' +
    'Keep the user\'s language unless asked to translate. ' +
    'When editing text, return the full revised text, ready to replace the original. ' +
    'When summarising, keep it tight and skimmable.';

  function aiConfig() {
    /* AI is disabled in this build. Configuration is never read from or
       written to browser storage. */
    return {
      key: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.7
    };
  }

  function aiReady() {
    return false;
  }

  function aiUpdateBadge() {
    /* AI is disabled in this build. */
  }

  function aiSelection() {
    if (!savedRange || !editor.contains(savedRange.commonAncestorContainer) || savedRange.collapsed) return '';
    return savedRange.toString().trim();
  }

  function updateAiContext() {
    if (!aiContextLabel) return;
    var doc = selectedDoc();
    aiContextLabel.textContent = doc ? (doc.title || 'Untitled note') : 'No note selected';
    var selection = aiSelection();
    if (selection) {
      var words = countWords(selection);
      aiSelPill.hidden = false;
      aiSelPill.textContent = 'Selection · ' + words + (words === 1 ? ' word' : ' words');
    } else {
      aiSelPill.hidden = true;
    }
  }

  function aiCaptureContext() {
    var doc = selectedDoc();
    var selection = aiSelection();
    var range = selection && savedRange ? savedRange.cloneRange() : null;
    var html = doc ? (doc.id === state.selectedId ? editor.innerHTML : doc.html) : '';
    return {
      doc: doc,
      noteId: doc ? doc.id : null,
      title: doc ? (doc.title || 'Untitled note') : '',
      text: doc ? plainText(html) : '',
      selection: selection,
      range: range
    };
  }

  function openAiDrawer() {
    /* AI is disabled in this build. */
    return;

    updateAiContext();
    aiUpdateBadge();
    aiDrawer.hidden = false;
    aiDrawer.setAttribute('aria-hidden', 'false');
    aiOpenBtn.setAttribute('aria-expanded', 'true');
    if (window.innerWidth <= 900) {
      aiScrim.hidden = false;
      window.requestAnimationFrame(function () { aiScrim.classList.add('show'); });
    }
    window.requestAnimationFrame(function () { aiDrawer.classList.add('open'); });
    void aiDrawer.offsetWidth;
    window.setTimeout(function () {
      if (aiReady() && window.innerWidth > 760) aiInput.focus();
    }, 380);
  }

  function closeAiDrawer() {
    aiDrawer.classList.remove('open');
    aiDrawer.setAttribute('aria-hidden', 'true');
    aiOpenBtn.setAttribute('aria-expanded', 'false');
    aiScrim.classList.remove('show');
    window.setTimeout(function () {
      if (!aiDrawer.classList.contains('open')) {
        aiDrawer.hidden = true;
        aiScrim.hidden = true;
      }
    }, 380);
  }

  function toggleAiDrawer() {
    /* AI is disabled in this build. */
    return;

    if (aiDrawer.classList.contains('open')) closeAiDrawer();
    else openAiDrawer();
  }

  function openModal(id) {
    var modal = $(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    window.requestAnimationFrame(function () { modal.classList.add('show'); });
    localizeTree(modal);
  }

  function closeModal(id) {
    var modal = $(id);
    if (!modal) return;
    if (id === 'gen-modal' && aiGenStreaming && aiController) {
      try { aiController.abort(); } catch (e) {}
    }
    modal.classList.remove('show');
    window.setTimeout(function () {
      if (!modal.classList.contains('show')) modal.hidden = true;
      if (!document.querySelector('.modal-backdrop.show')) document.body.classList.remove('modal-open');
    }, 230);
  }

  function aiSetStatus(text, kind) {
    aiSettingsStatus.textContent = text;
    aiSettingsStatus.className = 'ai-status' + (kind ? ' ' + kind : '');
  }

  function aiSetError(message) {
    aiSettingsError.textContent = message;
    aiSettingsError.hidden = !message;
    if (message) aiSettingsOk.hidden = true;
  }

  function aiSetOk(message) {
    aiSettingsOk.textContent = message;
    aiSettingsOk.hidden = !message;
    if (message) aiSettingsError.hidden = true;
  }

  function aiErrorMessage(err) {
    var message = String((err && err.message) || '');
    var status = err && err.status;
    if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(message)) {
      return 'Could not reach the API. Check your internet connection and the Base URL in AI settings.';
    }
    if (status === 401 || /401|Incorrect API key|invalid_api_key/i.test(message)) {
      return 'That API key was rejected. Open AI settings and check it.';
    }
    if (status === 403) {
      return 'OpenAI refused the request. Check your key, billing and model access in AI settings.';
    }
    if (status === 429 || /429|quota|rate limit/i.test(message)) {
      return 'OpenAI is rate-limiting or your quota is used up. Try again in a moment.';
    }
    if (status === 404 || /model.*(not found|does not exist)|does not exist/i.test(message)) {
      return 'That model is not available to your key. Pick another model in AI settings.';
    }
    return message || 'Something went wrong. Try again.';
  }

  function openAiSettings() {
    /* AI is disabled in this build. */
    return;

    var cfg = aiConfig();
    aiKeyInput.value = cfg.key;
    aiKeyInput.type = 'password';
    aiKeyToggle.setAttribute('aria-label', 'Show key');
    aiKeyToggle.title = 'Show key';
    aiKeyToggle.querySelector('use').setAttribute('href', '#i-eye');
    aiModelInput.value = cfg.model;
    aiBaseInput.value = cfg.baseUrl;
    aiTempInput.value = String(cfg.temperature);
    aiTempOut.textContent = String(cfg.temperature);
    aiSetError('');
    aiSetOk('');
    aiModelsHint.textContent = 'Pick a model, or load the ones your key can use.';
    aiSetStatus(cfg.key ? 'Ready · ' + cfg.model : 'Not connected', cfg.key ? 'ok' : '');
    aiDisconnectBtn.hidden = !cfg.key;
    openModal('ai-settings-modal');
    window.setTimeout(function () {
      (cfg.key ? aiModelInput : aiKeyInput).focus();
    }, 260);
  }

  function aiModelsFrom(json) {
    var ids = (json && Array.isArray(json.data) ? json.data : [])
      .map(function (model) { return model && model.id; })
      .filter(Boolean);
    var blocked = /(embedding|whisper|tts|dall-e|moderation|transcribe|realtime|audio|image|search|codex|babbage|davinci|curie|ada)/i;
    return ids.filter(function (id) {
      return !blocked.test(id);
    }).sort();
  }

  function aiFetchModels(key, base) {
    return fetch(base.replace(/\/+$/, '') + '/models', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + key }
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          var message = 'Request failed (' + res.status + ')';
          try {
            var json = JSON.parse(text);
            if (json.error && json.error.message) message = json.error.message;
          } catch (e) {}
          var error = new Error(message);
          error.status = res.status;
          throw error;
        });
      }
      return res.json().then(aiModelsFrom);
    });
  }

  function aiLoadModels() {
    /* AI is disabled in this build. */
    return;

    var key = aiKeyInput.value.trim();
    var base = (aiBaseInput.value.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    if (!key) {
      aiSetError('Paste your API key first.');
      aiKeyInput.focus();
      return;
    }
    aiSetError('');
    aiSetOk('');
    aiSetStatus('Checking…', 'busy');
    aiLoadModelsBtn.disabled = true;
    aiFetchModels(key, base).then(function (models) {
      if (!models.length) throw new Error('No chat models were returned for this key.');
      aiModelList.replaceChildren();
      models.forEach(function (id) {
        var option = document.createElement('option');
        option.value = id;
        aiModelList.appendChild(option);
      });
      if (!aiModelInput.value.trim() || models.indexOf(aiModelInput.value.trim()) === -1) {
        var preferred = models.filter(function (id) { return /mini|4o|4\.1|gpt-5/i.test(id); })[0] || models[0];
        aiModelInput.value = preferred;
      }
      aiModelsHint.textContent = 'Loaded ' + models.length + ' models. Choose one above.';
      aiSetStatus('Connected · ' + models.length + ' models', 'ok');
      aiSetOk('Connection works. Pick a model and save.');
    }).catch(function (err) {
      aiSetError(aiErrorMessage(err));
      aiSetStatus('Not connected', '');
    }).finally(function () {
      aiLoadModelsBtn.disabled = false;
    });
  }

  function aiTestConnection() {
    /* AI is disabled in this build. */
    return;

    var key = aiKeyInput.value.trim();
    var base = (aiBaseInput.value.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    if (!key) {
      aiSetError('Paste your API key first.');
      aiKeyInput.focus();
      return;
    }
    aiSetError('');
    aiSetOk('');
    aiSetStatus('Testing…', 'busy');
    aiTestBtn.disabled = true;
    aiFetchModels(key, base).then(function (models) {
      aiSetStatus('Connected · ' + models.length + ' models', 'ok');
      aiSetOk('Connection works.');
    }).catch(function (err) {
      aiSetError(aiErrorMessage(err));
      aiSetStatus('Not connected', '');
    }).finally(function () {
      aiTestBtn.disabled = false;
    });
  }

  function aiSaveSettings() {
    /* AI is disabled in this build. */
    return;

    var key = aiKeyInput.value.trim();
    var base = (aiBaseInput.value.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    var model = aiModelInput.value.trim() || 'gpt-4o-mini';
    var temperature = Number(aiTempInput.value);

    if (!key) {
      aiSetError('Paste your OpenAI API key first.');
      aiKeyInput.focus();
      return;
    }
    if (!/^https?:\/\//i.test(base)) {
      aiSetError('The Base URL must start with https://');
      aiBaseInput.focus();
      return;
    }
    if (isNaN(temperature)) temperature = 0.7;

    var config = {
      key: key,
      baseUrl: base,
      model: model,
      temperature: Math.max(0, Math.min(1, temperature))
    };
    /* AI configuration is never persisted in this build. */
    void config;
    return;
    aiSetStatus('Saved · ' + model, 'ok');
    aiDisconnectBtn.hidden = false;
    closeModal('ai-settings-modal');
    toast('AI settings saved');
    updateAiContext();
  }

  function aiDisconnect() {
    /* AI is disabled in this build. */
    return;

    if (!window.confirm('Remove the saved API key from this browser?')) return;

    aiKeyInput.value = '';
    aiModelInput.value = '';
    aiBaseInput.value = '';
    aiTempInput.value = '0.7';
    aiTempOut.textContent = '0.7';
    aiDisconnectBtn.hidden = true;
    aiUpdateBadge();
    aiSetStatus('Not connected', '');
    aiSetError('');
    aiSetOk('');
    toast('AI disconnected');
    aiKeyInput.focus();
  }

  function aiTruncate(text, max) {
    var value = String(text || '');
    if (value.length <= max) return value;
    return value.slice(0, max) + '\n\n[note truncated]';
  }

  function aiBuildContext(ctx) {
    if (!ctx || !ctx.doc) {
      return 'No note is open. Answer the question normally, using HTML.';
    }
    var body = ctx.selection || ctx.text || '(the note is empty)';
    var label = ctx.selection ? 'SELECTED TEXT (work only on this)' : 'FULL NOTE';
    return 'CURRENT NOTE\nTitle: ' + (ctx.title || 'Untitled') + '\n' + label + ':\n' + aiTruncate(body, 14000);
  }

  function aiQuickPrompt(kind, language) {
    if (kind === 'summarise') {
      return {
        label: 'Summarise',
        instruction: 'Summarise the current note in 2-4 sentences, then add a short "Key points" bullet list. Use HTML.',
        target: 'none'
      };
    }
    if (kind === 'keypoints') {
      return {
        label: 'Key points',
        instruction: 'Extract the most important points from the current note as a tight bullet list. Use HTML.',
        target: 'none'
      };
    }
    if (kind === 'improve') {
      return {
        label: 'Improve writing',
        instruction: 'Rewrite the text to be clearer, more polished and better structured while keeping its meaning and language. Return only the revised HTML.',
        target: 'edit'
      };
    }
    if (kind === 'grammar') {
      return {
        label: 'Fix grammar',
        instruction: 'Correct spelling, grammar and punctuation. Keep the wording and meaning as close as possible. Return only the corrected HTML.',
        target: 'edit'
      };
    }
    if (kind === 'continue') {
      return {
        label: 'Continue writing',
        instruction: 'Continue writing from where the text ends. Match its tone and style. Return only the continuation as HTML, without repeating the original.',
        target: 'append'
      };
    }
    if (kind === 'translate') {
      return {
        label: 'Translate · ' + language,
        instruction: 'Translate the text into ' + language + '. Return only the translation as HTML.',
        target: 'edit'
      };
    }
    return null;
  }

  function aiRunQuick(kind) {
    /* AI is disabled in this build. */
    return;

    if (!aiReady()) {
      openAiSettings();
      toast('Add your OpenAI API key first');
      return;
    }
    if (aiStreaming || aiGenStreaming) {
      toast('Wait for the current answer to finish');
      return;
    }
    var ctx = aiCaptureContext();
    if (!ctx.doc) {
      toast('Open a note first');
      return;
    }
    if (!ctx.text && !ctx.selection) {
      toast('This note is empty — write something first');
      return;
    }

    var spec = aiQuickPrompt(kind, aiLang.value);
    if (!spec) return;

    var target = { kind: 'none', noteId: ctx.noteId, range: null };
    if (spec.target === 'edit') {
      target = ctx.selection
        ? { kind: 'selection', noteId: ctx.noteId, range: ctx.range }
        : { kind: 'note', noteId: ctx.noteId, range: null };
    } else if (spec.target === 'append') {
      target = { kind: 'append', noteId: ctx.noteId, range: null };
    }

    aiRun({
      instruction: spec.instruction,
      ctx: ctx,
      target: target,
      userText: spec.label,
      history: false,
      label: spec.label
    });
  }

  function aiSendMessage(prompt) {
    /* AI is disabled in this build. */
    return;

    if (!aiReady()) {
      openAiSettings();
      toast('Add your OpenAI API key first');
      return;
    }
    if (aiStreaming || aiGenStreaming) {
      toast('Wait for the current answer to finish');
      return;
    }
    prompt = String(prompt || '').trim();
    if (!prompt) return;

    var ctx = aiCaptureContext();
    aiRun({
      instruction: prompt,
      ctx: ctx,
      target: { kind: 'none', noteId: ctx.noteId, range: null },
      userText: prompt,
      history: true
    });
    aiInput.value = '';
    aiAutoGrow();
  }

  function aiRun(opts) {
    /* AI is disabled in this build. */
    return;

    aiLastRequest = opts;
    var token = ++aiRunToken;
    var ctx = opts.ctx;
    var messages = [
      { role: 'system', content: AI_SYSTEM },
      { role: 'system', content: aiBuildContext(ctx) }
    ];

    if (opts.history) {
      aiHistory.slice(-8).forEach(function (message) {
        messages.push({ role: message.role, content: message.content });
      });
    }
    messages.push({ role: 'user', content: opts.instruction });

    if (opts.history) {
      aiHistory.push({ role: 'user', content: opts.instruction });
    }

    aiAddUserMessage(opts.userText || opts.instruction);
    var wrap = aiStartAssistant();
    var active = { wrap: wrap, raw: '', opts: opts, token: token };
    aiActive = active;
    aiSetStreaming(true);

    var raw = '';
    var lastPaint = 0;

    function paint(force) {
      var now = Date.now();
      if (!force && now - lastPaint < 60) return;
      lastPaint = now;
      wrap.rich.innerHTML = aiRender(raw);
      aiScroll();
    }

    aiStream(messages, function (delta) {
      raw += delta;
      active.raw = raw;
      if (wrap.typing) {
        wrap.typing.remove();
        wrap.typing = null;
        wrap.rich.hidden = false;
      }
      paint(false);
    }).then(function () {
      if (token !== aiRunToken) return;
      aiActive = null;
      paint(true);
      aiFinishAssistant(wrap, raw, opts);
      if (opts.history && raw.trim()) {
        aiHistory.push({ role: 'assistant', content: raw });
      }
    }).catch(function (err) {
      if (token !== aiRunToken) return;
      if (err && err.name === 'AbortError') {
        aiActive = null;
        paint(true);
        aiFinishAssistant(wrap, raw, opts);
        if (opts.history && raw.trim()) {
          aiHistory.push({ role: 'assistant', content: raw });
        }
        toast('Stopped');
      } else {
        aiActive = null;
        aiShowAssistantError(wrap, err);
        if (opts.history) aiHistory.pop();
      }
    }).finally(function () {
      if (token === aiRunToken) aiSetStreaming(false);
    });
  }

  function aiStream(messages, onDelta) {
    var cfg = aiConfig();
    var controller = new AbortController();
    aiController = controller;
    var url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: messages,
        temperature: cfg.temperature,
        stream: true
      }),
      signal: controller.signal
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          var message = 'Request failed (' + res.status + ')';
          try {
            var json = JSON.parse(text);
            if (json.error && json.error.message) message = json.error.message;
          } catch (e) {}
          var error = new Error(message);
          error.status = res.status;
          throw error;
        });
      }
      if (!res.body) throw new Error('This browser cannot stream responses.');

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      function handleLine(line) {
        var trimmed = line.trim();
        if (trimmed.indexOf('data:') !== 0) return;
        var data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') return;
        try {
          var json = JSON.parse(data);
          var choice = json.choices && json.choices[0];
          var delta = choice && choice.delta && choice.delta.content;
          if (delta) onDelta(delta);
        } catch (e) {}
      }

      function pump() {
        return reader.read().then(function (result) {
          if (result.done) {
            buffer += decoder.decode();
            if (buffer.trim()) handleLine(buffer);
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(handleLine);
          return pump();
        });
      }

      return pump();
    }).finally(function () {
      if (aiController === controller) aiController = null;
    });
  }

  function aiScroll() {
    aiTranscript.scrollTop = aiTranscript.scrollHeight;
  }

  function aiAddUserMessage(text) {
    if (aiEmpty) aiEmpty.hidden = true;
    var message = document.createElement('div');
    message.className = 'ai-msg user';
    var bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    bubble.textContent = text;
    message.appendChild(bubble);
    aiTranscript.appendChild(message);
    aiScroll();
  }

  function aiStartAssistant() {
    if (aiEmpty) aiEmpty.hidden = true;
    var message = document.createElement('div');
    message.className = 'ai-msg assistant';
    var bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    var rich = document.createElement('div');
    rich.className = 'ai-rich streaming';
    rich.hidden = true;
    var typing = document.createElement('div');
    typing.className = 'ai-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    bubble.appendChild(typing);
    bubble.appendChild(rich);
    message.appendChild(bubble);
    aiTranscript.appendChild(message);
    aiScroll();
    return { el: message, bubble: bubble, rich: rich, typing: typing };
  }

  function aiFinishAssistant(wrap, raw, opts) {
    if (wrap.typing) {
      wrap.typing.remove();
      wrap.typing = null;
    }
    wrap.rich.classList.remove('streaming');
    if (!raw.trim()) {
      wrap.bubble.classList.add('ai-error');
      wrap.rich.hidden = false;
      wrap.rich.textContent = 'No response came back. Try again, or check AI settings.';
      return;
    }
    wrap.rich.hidden = false;
    wrap.rich.innerHTML = aiRender(raw);
    aiAddActions(wrap, raw, opts);
  }

  function aiShowAssistantError(wrap, err) {
    if (wrap.typing) {
      wrap.typing.remove();
      wrap.typing = null;
    }
    writingError('AI error: ' + aiErrorMessage(err));

    wrap.rich.hidden = false;
    wrap.rich.classList.remove('streaming');
    wrap.bubble.classList.add('ai-error');
    wrap.rich.textContent = aiErrorMessage(err);

    var bar = document.createElement('div');
    bar.className = 'ai-msg-actions';
    bar.style.opacity = '1';
    bar.style.transform = 'none';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ai-mini';
    button.textContent = 'Open AI settings';
    button.addEventListener('click', openAiSettings);
    bar.appendChild(button);
    wrap.el.appendChild(bar);
  }

  function aiSameNote(target) {
    if (!target || !target.noteId) {
      toast('Open a note first');
      return false;
    }
    if (target.noteId !== state.selectedId) {
      toast('Open that note first, then insert');
      return false;
    }
    return true;
  }

  function aiAddActions(wrap, raw, opts) {
    var bar = document.createElement('div');
    bar.className = 'ai-msg-actions';
    var target = (opts && opts.target) || { kind: 'none' };

    function mini(label, iconName, action) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-mini';
      if (iconName) button.appendChild(icon(iconName, 'ic'));
      var span = document.createElement('span');
      span.textContent = label;
      button.appendChild(span);
      button.addEventListener('click', action);
      bar.appendChild(button);
      return button;
    }

    mini('Copy', 'copy', function () {
      aiCopy(plainText(aiRender(raw)) || raw);
      toast('Copied');
    });

    if (target.noteId) {
      if (target.kind === 'selection') {
        mini('Replace selection', 'replace', function () {
          if (!aiSameNote(target)) return;
          aiApplyResult(aiRender(raw), 'selection', target.range);
          toast('Selection replaced');
        });
      } else if (target.kind === 'note') {
        mini('Replace note', 'replace', function () {
          if (!aiSameNote(target)) return;
          if (!window.confirm('Replace the whole note with the AI result? You can undo with Ctrl+Z.')) return;
          aiApplyResult(aiRender(raw), 'note', null);
          toast('Note replaced');
        });
      } else if (target.kind === 'append') {
        mini('Append to note', 'corner', function () {
          if (!aiSameNote(target)) return;
          aiApplyResult(aiRender(raw), 'append', null);
          toast('Added to the end of the note');
        });
      } else {
        mini('Insert at cursor', 'corner', function () {
          if (!aiSameNote(target)) return;
          aiApplyResult(aiRender(raw), 'cursor', target.range || savedRange);
          toast('Inserted into the note');
        });
      }
    }

    if (opts && opts.label && opts.history !== true) {
      mini('Regenerate', 'refresh', function () {
        if (aiStreaming) {
          toast('Wait for the current answer');
          return;
        }
        aiRun(opts);
      });
    }

    wrap.el.appendChild(bar);
  }

  function aiApplyResult(html, mode, range) {
    var doc = selectedDoc();
    if (!doc || doc.trashed) {
      toast('This note is in Trash');
      return;
    }

    editor.focus();
    var selection = window.getSelection();
    selection.removeAllRanges();

    var usableRange = range && editor.contains(range.commonAncestorContainer) ? range : null;
    var direct = false;

    if (mode === 'note') {
      var all = document.createRange();
      all.selectNodeContents(editor);
      selection.addRange(all);
    } else if (mode === 'selection' && usableRange) {
      selection.addRange(usableRange);
    } else if (mode === 'append' || (mode === 'cursor' && !usableRange)) {
      var last = editor.lastElementChild;
      var lastTag = last ? last.tagName : '';

      if (last && /^(UL|OL|BLOCKQUOTE|PRE)$/.test(lastTag)) {
        // Chrome refuses to place a new block after these, so append directly.
        var temp = document.createElement('div');
        temp.innerHTML = html;
        while (temp.firstChild) editor.appendChild(temp.firstChild);
        var directEnd = document.createRange();
        directEnd.selectNodeContents(editor);
        directEnd.collapse(false);
        selection.addRange(directEnd);
        direct = true;
      } else {
        var end = document.createRange();
        end.selectNodeContents(editor);
        end.collapse(false);
        selection.addRange(end);
        if (last) document.execCommand('insertParagraph');
      }
    } else if (usableRange) {
      selection.addRange(usableRange);
    }

    if (!direct) {
      try {
        document.execCommand('insertHTML', false, html);
      } catch (e) {}
    }
    handleEdit();
    saveNow();
    updateAiContext();
  }

  function aiCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { aiCopyFallback(text); });
    } else {
      aiCopyFallback(text);
    }
  }

  function aiCopyFallback(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) {}
    area.remove();
  }

  function aiRender(text) {
    var value = String(text || '');
    value = value.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
    if (/<\/?(p|h[1-3]|ul|ol|li|blockquote|pre|div|strong|em|table|br)\b/i.test(value)) {
      return sanitizeHtml(value);
    }
    return aiMarkdown(value);
  }

  function aiMarkdown(text) {
    function inline(value) {
      return value
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }

    return escapeHtml(text).split(/\n{2,}/).map(function (block) {
      var lines = block.split('\n');

      if (/^\s*(---|\*\*\*|___)\s*$/.test(block)) return '<hr>';

      if (lines.length && lines.every(function (line) { return /^\s*>\s?/.test(line); })) {
        return '<blockquote>' + lines.map(function (line) {
          return '<p>' + inline(line.replace(/^\s*>\s?/, '')) + '</p>';
        }).join('') + '</blockquote>';
      }

      if (lines.length === 1) {
        var heading = lines[0].match(/^\s*(#{1,3})\s+(.+)$/);
        if (heading) {
          var level = heading[1].length;
          return '<h' + level + '>' + inline(heading[2]) + '</h' + level + '>';
        }
      }

      if (lines.length && lines.every(function (line) { return /^\s*[-*•]\s+/.test(line); })) {
        return '<ul>' + lines.map(function (line) {
          return '<li>' + inline(line.replace(/^\s*[-*•]\s+/, '')) + '</li>';
        }).join('') + '</ul>';
      }

      if (lines.length && lines.every(function (line) { return /^\s*\d+[.)]\s+/.test(line); })) {
        return '<ol>' + lines.map(function (line) {
          return '<li>' + inline(line.replace(/^\s*\d+[.)]\s+/, '')) + '</li>';
        }).join('') + '</ol>';
      }

      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }

  function aiSetStreaming(on) {
    aiStreaming = on;
    aiProgress.hidden = !on;
    aiSendBtn.hidden = on;
    aiStopBtn.hidden = !on;
    aiQuick.querySelectorAll('button').forEach(function (button) {
      button.disabled = on;
    });
  }

  function aiStop() {
    var active = aiActive;
    var controller = aiController;

    aiRunToken++;
    aiActive = null;
    aiController = null;

    if (controller) {
      try { controller.abort(); } catch (e) {}
    }

    if (active) {
      if (!active.raw.trim()) {
        if (active.wrap.typing) {
          active.wrap.typing.remove();
          active.wrap.typing = null;
        }
        active.wrap.rich.hidden = false;
        active.wrap.rich.classList.remove('streaming');
        active.wrap.rich.textContent = 'Stopped before the answer started.';
      } else {
        aiFinishAssistant(active.wrap, active.raw, active.opts);
        if (active.opts.history) {
          aiHistory.push({ role: 'assistant', content: active.raw });
        }
      }
    }

    aiSetStreaming(false);
    toast('Stopped');
  }

  function aiResetChat() {
    if (aiStreaming) aiStop();
    aiHistory = [];
    aiTranscript.replaceChildren();
    aiTranscript.appendChild(aiEmpty);
    aiEmpty.hidden = false;
    aiUpdateBadge();
    updateAiContext();
    aiInput.value = '';
    aiAutoGrow();
    aiInput.focus();
    toast('New chat');
  }

  function aiAutoGrow() {
    aiInput.style.height = 'auto';
    aiInput.style.height = Math.min(aiInput.scrollHeight, 140) + 'px';
  }

  function openGenModal() {
    /* AI is disabled in this build. */
    return;

    if (!aiReady()) {
      openAiSettings();
      toast('Add your OpenAI API key first');
      return;
    }
    if (aiStreaming || aiGenStreaming) {
      toast('Wait for the current answer to finish');
      return;
    }
    aiGenHtml = '';
    aiGenTitle = '';
    aiGenRaw = '';
    genPrompt.value = '';
    genPreview.hidden = true;
    genPreviewBody.innerHTML = '';
    genStatus.textContent = 'Writing…';
    genStatus.classList.remove('ready');
    genUsage.textContent = '';
    genError.hidden = true;
    genRunBtn.hidden = false;
    genRunBtn.disabled = false;
    genCreateBtn.hidden = true;
    openModal('gen-modal');
    window.setTimeout(function () { genPrompt.focus(); }, 260);
  }

  function aiRunGenerate() {
    /* AI is disabled in this build. */
    return;

    if (!aiReady()) {
      openAiSettings();
      return;
    }
    if (aiStreaming || aiGenStreaming) {
      toast('Wait for the current answer to finish');
      return;
    }

    var prompt = genPrompt.value.trim();
    if (!prompt) {
      genError.textContent = 'Describe the note you want first.';
      genError.hidden = false;
      genPrompt.focus();
      return;
    }

    genError.hidden = true;
    var instruction = 'Create a complete ' + genType.value.toLowerCase() + ' note about: ' + prompt + '\n' +
      'Tone: ' + genTone.value + '. Length: ' + genLength.value + '.\n' +
      'Start with an <h1> title, then structure it with headings, short paragraphs, and lists where useful. ' +
      'Make it genuinely useful and specific, not generic filler. Return only the HTML fragment.';

    var messages = [
      { role: 'system', content: AI_SYSTEM },
      { role: 'user', content: instruction }
    ];

    aiGenStreaming = true;
    aiGenRaw = '';
    genPreview.hidden = false;
    genPreviewBody.innerHTML = '';
    genStatus.textContent = 'Writing…';
    genStatus.classList.remove('ready');
    genRunBtn.hidden = true;
    genCreateBtn.hidden = true;
    genUsage.textContent = '';

    var lastPaint = 0;
    function paint(force) {
      var now = Date.now();
      if (!force && now - lastPaint < 70) return;
      lastPaint = now;
      genPreviewBody.innerHTML = aiRender(aiGenRaw);
      genPreviewBody.scrollTop = genPreviewBody.scrollHeight;
    }

    aiStream(messages, function (delta) {
      aiGenRaw += delta;
      paint(false);
    }).then(function () {
      if (!aiGenRaw.trim()) throw new Error('The AI returned an empty note. Try a more specific prompt.');
      paint(true);
      aiGenHtml = aiRender(aiGenRaw);
      aiGenTitle = aiDeriveTitle(aiGenHtml, prompt);
      genStatus.textContent = 'Ready';
      genStatus.classList.add('ready');
      genCreateBtn.hidden = false;
      genCreateBtn.focus();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') {
        genStatus.textContent = 'Stopped';
        genRunBtn.hidden = false;
        return;
      }
      genError.textContent = aiErrorMessage(err);
      genError.hidden = false;
      genStatus.textContent = 'Failed';
      genRunBtn.hidden = false;
    }).finally(function () {
      aiGenStreaming = false;
      genRunBtn.disabled = false;
    });
  }

  function aiDeriveTitle(html, prompt) {
    var template = document.createElement('template');
    template.innerHTML = html;
    var heading = template.content.querySelector('h1, h2, h3');
    var title = heading ? heading.textContent : '';
    if (!title) title = String(prompt || '').split('\n')[0];
    title = title.replace(/\s+/g, ' ').trim().replace(/[.:;!?]+$/, '');
    if (title.length > 80) title = title.slice(0, 77).trim() + '…';
    return title || 'AI note';
  }

  function aiCreateGeneratedNote() {
    /* AI is disabled in this build. */
    return;

    if (!aiGenHtml.trim()) {
      toast('Generate a note first');
      return;
    }

    saveNow();
    var now = Date.now();
    var doc = {
      id: uid(),
      title: aiGenTitle || 'AI note',
      html: sanitizeHtml(aiGenHtml),
      folderId: state.view === 'folder' ? state.folderId : null,
      starred: false,
      trashed: false,
      pinned: false,
      archived: false,
      tags: [],
      daily: null,
      createdAt: now,
      updatedAt: now
    };

    docs.unshift(doc);
    writeDocs();

    if (state.view === 'trash' || state.view === 'starred' || state.view === 'archive') state.view = 'all';
    state.selectedId = doc.id;
    persistSelected();
    seenNotes = Object.create(null);

    renderAll();
    renderEditor();
    closeModal('gen-modal');
    closeAiDrawer();
    toast('AI note created');
    if (window.innerWidth <= 760) document.body.classList.add('show-editor');
    docTitle.focus();
  }

  /* ---------- World Clock & Timer ---------- */

  function loadClocks() {
    var raw = read(LS.clocks, null);
    if (Array.isArray(raw)) clocks = raw;
  }

  function saveClocks() {
    write(LS.clocks, clocks);
  }

  function populateTZSelect() {
    if (!clockTzSelect) return;
    var zones;
    try {
      zones = Intl.supportedValuesOf('timeZone');
    } catch (e) {
      zones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London',
        'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Africa/Cairo',
        'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
        'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'
      ];
    }
    zones = zones.slice().sort();
    clockTzSelect.replaceChildren();
    zones.forEach(function (zone) {
      var option = document.createElement('option');
      option.value = zone;
      option.textContent = zone.replace(/_/g, ' ').replace(/\//g, ' / ');
      clockTzSelect.appendChild(option);
    });
  }

  function clockZoneInfo(tz) {
    try {
      var now = new Date();
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZoneName: 'shortOffset'
      }).formatToParts(now);
      var map = {};
      parts.forEach(function (part) { map[part.type] = part.value; });
      var hour = Number(map.hour);
      return {
        time: (map.hour || '00') + ':' + (map.minute || '00') + ':' + (map.second || '00'),
        date: (map.weekday || '') + ', ' + (map.month || '') + ' ' + (map.day || ''),
        offset: map.timeZoneName || '',
        night: hour < 6 || hour >= 18
      };
    } catch (e) {
      return { time: '--:--:--', date: 'Unknown zone', offset: '', night: false };
    }
  }

  function fmtClockTime(tz) {
    return clockZoneInfo(tz).time;
  }

  function renderClocks() {
    if (!clockList) return;
    clockList.replaceChildren();
    if (!clocks.length) {
      var empty = document.createElement('div');
      empty.className = 'clock-empty';
      empty.innerHTML =
        '<span class="clock-empty-ring" aria-hidden="true"><svg class="ic"><use href="#i-globe"/></svg></span>' +
        '<span>No cities added yet. Tap a city below to start.</span>';
      clockList.appendChild(empty);
      return;
    }
    clocks.forEach(function (c, index) {
      var item = document.createElement('div');
      item.className = 'clock-item';
      item.dataset.tz = c.tz;
      item.dataset.id = c.id;
      item.style.setProperty('--i', index);
      item.innerHTML =
        '<span class="clock-day" aria-hidden="true">' +
          '<svg class="ic clock-sun"><use href="#i-sun"/></svg>' +
          '<svg class="ic clock-moon"><use href="#i-moon"/></svg>' +
        '</span>' +
        '<span class="clock-main">' +
          '<span class="clock-city">' + escapeHtml(c.city) + '</span>' +
          '<span class="clock-meta"><span class="clock-date"></span><span class="clock-offset"></span></span>' +
        '</span>' +
        '<span class="clock-time">--:--:--</span>' +
        '<button class="icon-btn clock-remove" type="button" aria-label="Remove ' + escapeHtml(c.city) + '"><svg class="ic" aria-hidden="true"><use href="#i-close"/></svg></button>';
      item.querySelector('.clock-remove').addEventListener('click', function () { removeClock(c.id); });
      clockList.appendChild(item);
    });
    updateClocks();
  }

  function updateClocks() {
    if (!clockList) return;
    Array.prototype.forEach.call(clockList.querySelectorAll('.clock-item'), function (item) {
      var info = clockZoneInfo(item.dataset.tz);
      var timeEl = item.querySelector('.clock-time');
      var dateEl = item.querySelector('.clock-date');
      var offsetEl = item.querySelector('.clock-offset');
      var dayEl = item.querySelector('.clock-day');
      if (timeEl) timeEl.textContent = info.time;
      if (dateEl) dateEl.textContent = info.date;
      if (offsetEl) offsetEl.textContent = info.offset ? '· ' + info.offset : '';
      if (dayEl) dayEl.classList.toggle('is-night', info.night);
    });
  }

  function setHand(el, deg) {
    if (el) el.style.transform = 'rotate(' + deg + 'deg)';
  }

  function tickLocalClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();
    var digital = pad(h) + ':' + pad(m) + ':' + pad(s);

    if (sideClockTime) sideClockTime.textContent = digital;
    if (sideClockDate) {
      sideClockDate.textContent = now.toLocaleDateString(locale(), {
        weekday: 'short', month: 'short', day: 'numeric'
      });
    }
    if (heroClockTime) heroClockTime.textContent = digital;
    if (heroClockDate) {
      var zone = '';
      try {
        zone = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');
      } catch (e) {}
      heroClockDate.textContent = now.toLocaleDateString(locale(), {
        weekday: 'long', month: 'long', day: 'numeric'
      }) + (zone ? ' · ' + zone : '');
    }

    var secDeg = s * 6;
    var minDeg = m * 6 + s * 0.1;
    var hourDeg = (h % 12) * 30 + m * 0.5;
    setHand(sideClockSec, secDeg);
    setHand(sideClockMin, minDeg);
    setHand(sideClockHour, hourDeg);
    setHand(heroClockSec, secDeg);
    setHand(heroClockMin, minDeg);
    setHand(heroClockHour, hourDeg);
  }

  function addClockPreset(city, tz) {
    if (!city || !tz) return;
    if (clocks.some(function (c) { return c.tz === tz; })) {
      toast(city + ' is already on the clock');
      return;
    }
    clocks.push({ id: uid(), city: city, tz: tz });
    saveClocks();
    renderClocks();
    toast('Added ' + city);
  }

  function addClock() {
    var city = String(clockCityInput.value || '').trim();
    var tz = clockTzSelect.value;
    if (!city || !tz) {
      toast('Enter a city and pick a timezone');
      return;
    }
    if (clocks.some(function (c) { return c.tz === tz; })) {
      toast('That timezone is already added');
      return;
    }
    var c = { id: uid(), city: city, tz: tz };
    clocks.push(c);
    saveClocks();
    renderClocks();
    clockCityInput.value = '';
    clockCityInput.focus();
    toast('Added ' + city);
  }

  function removeClock(id) {
    clocks = clocks.filter(function (c) { return c.id !== id; });
    saveClocks();
    renderClocks();
    toast('City removed');
  }

  function startClockInterval() {
    if (clockInterval) clearInterval(clockInterval);
    tickLocalClock();
    updateClocks();
    clockInterval = setInterval(function () {
      tickLocalClock();
      updateClocks();
    }, 1000);
  }

  function stopClockInterval() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function fmtTimer(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  var TIMER_CIRC = 2 * Math.PI * 52;

  function updateTimerRing() {
    if (!timerRingProgress) return;
    var pct = timerTotal > 0 ? Math.max(0, Math.min(1, timerSeconds / timerTotal)) : 0;
    timerRingProgress.style.strokeDasharray = String(TIMER_CIRC);
    timerRingProgress.style.strokeDashoffset = String(TIMER_CIRC * (1 - pct));
    if (timerRing) timerRing.style.setProperty('--p', pct);
  }

  function updateTimerDisplay() {
    if (timerDisplay) timerDisplay.textContent = fmtTimer(timerSeconds);
    updateTimerRing();
  }

  function updateTimerInputs() {
    if (!timerHInput || !timerMInput || !timerSInput) return;
    var h = Math.floor(timerSeconds / 3600);
    var m = Math.floor((timerSeconds % 3600) / 60);
    var s = timerSeconds % 60;
    timerHInput.value = String(h);
    timerMInput.value = String(m);
    timerSInput.value = String(s);
  }

  function setTimerState(text) {
    if (timerState) timerState.textContent = text;
    if (timerStatus) timerStatus.textContent = text === 'Ready' ? '' : text;
  }

  function setTimerPresetActive(seconds) {
    if (!timerPresets) return;
    Array.prototype.forEach.call(timerPresets.querySelectorAll('[data-timer-preset]'), function (btn) {
      btn.classList.toggle('is-active', Number(btn.dataset.timerPreset) === seconds);
    });
  }

  function applyTimerPreset(seconds) {
    timerSeconds = seconds;
    timerTotal = seconds;
    updateTimerInputs();
    updateTimerDisplay();
    setTimerState('Ready');
    setTimerPresetActive(seconds);
  }

  function startTimer() {
    if (timerRunning) return;
    if (timerSeconds <= 0) {
      var h = Number(timerHInput.value) || 0;
      var m = Number(timerMInput.value) || 0;
      var s = Number(timerSInput.value) || 0;
      timerSeconds = h * 3600 + m * 60 + s;
      timerTotal = timerSeconds;
      if (timerSeconds <= 0) {
        toast('Set a time first');
        return;
      }
    } else if (timerTotal <= 0) {
      timerTotal = timerSeconds;
    }
    timerRunning = true;
    if (timerRing) {
      timerRing.classList.remove('is-done', 'is-paused');
      timerRing.classList.add('is-running');
    }
    if (timerStartBtn) timerStartBtn.hidden = true;
    if (timerPauseBtn) timerPauseBtn.hidden = false;
    setTimerState('Running');
    updateTimerRing();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function () {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        timerSeconds = 0;
        updateTimerDisplay();
        if (timerStartBtn) timerStartBtn.hidden = false;
        if (timerPauseBtn) timerPauseBtn.hidden = true;
        setTimerState("Time's up!");
        if (timerRing) {
          timerRing.classList.remove('is-running', 'is-paused');
          timerRing.classList.add('is-done');
          window.setTimeout(function () { timerRing.classList.remove('is-done'); }, 2200);
        }
        toast("Timer finished!");
        celebrateTimer();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!timerRunning) return;
    timerRunning = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (timerStartBtn) timerStartBtn.hidden = false;
    if (timerPauseBtn) timerPauseBtn.hidden = true;
    if (timerRing) {
      timerRing.classList.remove('is-running');
      timerRing.classList.add('is-paused');
    }
    setTimerState('Paused');
  }

  function resetTimer() {
    pauseTimer();
    timerSeconds = 0;
    timerTotal = 0;
    updateTimerDisplay();
    updateTimerInputs();
    setTimerPresetActive(-1);
    if (timerStartBtn) timerStartBtn.hidden = false;
    if (timerPauseBtn) timerPauseBtn.hidden = true;
    if (timerRing) timerRing.classList.remove('is-running', 'is-paused', 'is-done');
    setTimerState('Ready');
    toast('Timer reset');
  }

  function celebrateTimer() {
    if (!fxLayer || (motionQuery && motionQuery.matches)) return;
    var colors = ['#2563eb', '#7c3aed', '#db2777', '#d97706', '#16a34a'];
    for (var i = 0; i < 30; i++) {
      var bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.setProperty('--x', (Math.random() * 100) + 'vw');
      bit.style.setProperty('--d', (Math.random() * 0.55) + 's');
      bit.style.setProperty('--r', (Math.random() * 360) + 'deg');
      bit.style.setProperty('--c', colors[i % colors.length]);
      bit.style.setProperty('--s', (6 + Math.random() * 8) + 'px');
      fxLayer.appendChild(bit);
      (function (el) {
        window.setTimeout(function () { el.remove(); }, 2800);
      })(bit);
    }
  }

  function burstStars(el) {
    if (!fxLayer || !el || (motionQuery && motionQuery.matches)) return;
    var rect = el.getBoundingClientRect();
    for (var i = 0; i < 7; i++) {
      var star = document.createElement('span');
      star.className = 'star-bit';
      var angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
      var dist = 18 + Math.random() * 22;
      star.style.left = (rect.left + rect.width / 2) + 'px';
      star.style.top = (rect.top + rect.height / 2) + 'px';
      star.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
      star.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
      star.style.setProperty('--delay', (i * 12) + 'ms');
      fxLayer.appendChild(star);
      (function (node) {
        window.setTimeout(function () { node.remove(); }, 950);
      })(star);
    }
  }

  function openClockModal() {
    openModal('clock-modal');
    renderClocks();
    tickLocalClock();
    updateTimerDisplay();
    setTimerPresetActive(timerTotal);
  }

  /* ---------- Spell Check ---------- */

  var SPELL_DICT = {
    a:1,able:1,about:1,above:1,across:1,after:1,again:1,against:1,all:1,almost:1,
    alone:1,along:1,already:1,also:1,although:1,always:1,among:1,an:1,and:1,
    another:1,any:1,anybody:1,anyone:1,anything:1,anywhere:1,are:1,area:1,
    around:1,as:1,ask:1,asked:1,asking:1,at:1,away:1,b:1,back:1,backed:1,
    backing:1,backs:1,because:1,been:1,before:1,began:1,behind:1,being:1,
    below:1,between:1,beyond:1,big:1,bigger:1,biggest:1,bird:1,birds:1,
    bit:1,bite:1,bits:1,black:1,blade:1,blew:1,blow:1,blue:1,board:1,
    boat:1,body:1,bone:1,book:1,border:1,bottom:1,bought:1,branch:1,
    break:1,broken:1,broke:1,brush:1,burn:1,burst:1,bus:1,business:1,
    but:1,buy:1,by:1,c:1,call:1,called:1,coming:1,could:1,count:1,
    day:1,days:1,dead:1,deal:1,dear:1,death:1,decide:1,deep:1,do:1,
    does:1,done:1,door:1,down:1,draw:1,dream:1,dress:1,drink:1,drive:1,
    each:1,ear:1,early:1,earth:1,east:1,eat:1,edge:1,end:1,enemy:1,
    enough:1,even:1,evening:1,ever:1,every:1,everybody:1,everyone:1,
    everything:1,everywhere:1,eye:1,eyes:1,face:1,fact:1,far:1,farm:1,
    fast:1,father:1,feet:1,fell:1,feel:1,fell:1,felt:1,few:1,field:1,
    fight:1,find:1,fire:1,first:1,fish:1,five:1,flat:1,floor:1,fly:1,
    follow:1,food:1,foot:1,for:1,force:1,forest:1,forget:1,found:1,
    four:1,free:1,friend:1,from:1,front:1,full:1,fun:1,game:1,garden:1,
    gas:1,gate:1,get:1,girl:1,give:1,glad:1,go:1,god:1,gold:1,good:1,
    got:1,grass:1,gray:1,green:1,ground:1,group:1,grow:1,guess:1,
    hair:1,half:1,hand:1,hang:1,happen:1,happy:1,hard:1,has:1,have:1,
    he:1,head:1,hear:1,heard:1,heart:1,heat:1,heavy:1,held:1,hell:1,
    help:1,her:1,here:1,high:1,him:1,his:1,history:1,hit:1,hold:1,
    home:1,horse:1,hot:1,hour:1,house:1,how:1,huge:1,human:1,hurt:1,
    i:1,ice:1,idea:1,if:1,in:1,inch:1,include:1,inside:1,into:1,is:1,
    it:1,its:1,j:1,join:1,journey:1,joy:1,judge:1,jump:1,just:1,k:1,
    keep:1,key:1,kill:1,kind:1,king:1,kiss:1,knee:1,know:1,known:1,
    l:1,lady:1,lake:1,land:1,language:1,large:1,last:1,late:1,laugh:1,
    law:1,lay:1,lead:1,learn:1,leave:1,left:1,leg:1,less:1,let:1,
    letter:1,level:1,lie:1,life:1,light:1,like:1,line:1,lion:1,list:1,
    listen:1,little:1,live:1,long:1,look:1,lost:1,loud:1,love:1,
    low:1,luck:1,lunch:1,m:1,machine:1,make:1,man:1,many:1,map:1,
    march:1,mark:1,market:1,maybe:1,me:1,mean:1,measure:1,meat:1,
    medicine:1,meet:1,men:1,might:1,mile:1,milk:1,million:1,mind:1,
    mine:1,minute:1,miss:1,mix:1,model:1,money:1,month:1,moon:1,
    more:1,morning:1,most:1,mother:1,mouth:1,move:1,mr:1,mrs:1,
    music:1,must:1,my:1,myself:1,n:1,name:1,nation:1,national:1,
    nature:1,near:1,nearly:1,necessary:1,neck:1,need:1,needle:1,
    nerve:1,nest:1,never:1,new:1,news:1,next:1,nice:1,night:1,
    nine:1,no:1,nobody:1,nod:1,none:1,nor:1,north:1,nose:1,not:1,
    note:1,nothing:1,notice:1,novel:1,now:1,number:1,nut:1,o:1,
    object:1,ocean:1,of:1,off:1,offer:1,office:1,often:1,oil:1,
    old:1,on:1,once:1,one:1,only:1,open:1,or:1,order:1,other:1,
    our:1,out:1,over:1,own:1,owner:1,p:1,page:1,pain:1,paint:1,
    pair:1,pan:1,paper:1,parent:1,park:1,part:1,party:1,pass:1,
    past:1,path:1,pattern:1,pay:1,peace:1,pen:1,pencil:1,people:1,
    perhaps:1,person:1,phrase:1,pick:1,picture:1,piece:1,pig:1,
    pile:1,pillow:1,pin:1,pipe:1,place:1,plan:1,plane:1,plant:1,
    play:1,please:1,pleasure:1,plenty:1,plug:1,plus:1,pocket:1,
    poem:1,poet:1,point:1,pole:1,police:1,polish:1,political:1,
    pond:1,pool:1,poor:1,pop:1,popcorn:1,porch:1,pose:1,position:1,
    possess:1,possible:1,post:1,pot:1,potato:1,pound:1,power:1,
    practice:1,praise:1,pray:1,prefer:1,prepare:1,present:1,pretty:1,
    prevent:1,price:1,pride:1,print:1,private:1,prize:1,problem:1,
    process:1,produce:1,product:1,proud:1,prove:1,provide:1,public:1,
    pull:1,pump:1,punish:1,pupil:1,pure:1,purple:1,push:1,put:1,
    q:1,quality:1,quantity:1,quarter:1,queen:1,question:1,quick:1,
    quiet:1,quit:1,quite:1,quote:1,r:1,rabbit:1,race:1,radio:1,
    rail:1,railroad:1,rain:1,raise:1,ran:1,range:1,rapidly:1,rare:1,
    rather:1,raw:1,reach:1,read:1,ready:1,real:1,really:1,reason:1,
    receive:1,record:1,red:1,remember:1,remind:1,remove:1,repeat:1,
    replace:1,reply:1,report:1,represent:1,require:1,restaurant:1,
    result:1,return:1,rich:1,ride:1,right:1,ring:1,rise:1,river:1,
    road:1,rock:1,roll:1,roof:1,room:1,root:1,rope:1,rose:1,round:1,
    row:1,royal:1,rub:1,rude:1,rug:1,rule:1,run:1,rush:1,s:1,sad:1,
    safe:1,sail:1,salt:1,same:1,sand:1,sat:1,save:1,say:1,scale:1,
    school:1,science:1,scissors:1,score:1,scratch:1,screen:1,sea:1,
    search:1,season:1,seat:1,second:1,secret:1,see:1,seed:1,seek:1,
    seem:1,seen:1,seldom:1,select:1,self:1,sell:1,send:1,sense:1,
    sentence:1,separate:1,serious:1,serve:1,service:1,set:1,settle:1,
    seven:1,several:1,severe:1,shade:1,shadow:1,shake:1,shall:1,
    shape:1,share:1,sharp:1,she:1,sheet:1,shelf:1,shell:1,shine:1,
    ship:1,shirt:1,shoe:1,shoot:1,shop:1,shore:1,short:1,shot:1,
    should:1,shoulder:1,shout:1,show:1,shut:1,sick:1,side:1,sign:1,
    signal:1,silence:1,silly:1,silver:1,similar:1,simple:1,since:1,
    sing:1,singing:1,single:1,sink:1,sister:1,sit:1,six:1,size:1,
    skill:1,skin:1,skirt:1,sky:1,sleep:1,slip:1,slow:1,small:1,
    smart:1,smell:1,smile:1,smoke:1,snake:1,snow:1,so:1,soap:1,
    social:1,sock:1,soft:1,soil:1,soldier:1,solid:1,solution:1,
    solve:1,some:1,somebody:1,someone:1,something:1,sometimes:1,
    somewhere:1,son:1,song:1,soon:1,sort:1,sound:1,soup:1,sour:1,
    south:1,space:1,spare:1,speak:1,speed:1,spell:1,spend:1,spider:1,
    spin:1,spirit:1,spite:1,split:1,spoon:1,sport:1,spot:1,spread:1,
    spring:1,square:1,staff:1,stage:1,stairs:1,stand:1,standard:1,
    star:1,start:1,state:1,station:1,stay:1,steady:1,steam:1,steel:1,
    step:1,stick:1,still:1,stock:1,stomach:1,stone:1,stop:1,store:1,
    story:1,straight:1,strange:1,strap:1,stream:1,street:1,strength:1,
    stretch:1,strike:1,string:1,strip:1,stroke:1,strong:1,structure:1,
    struggle:1,stuck:1,student:1,studio:1,study:1,stuff:1,stupid:1,
    style:1,subject:1,substance:1,success:1,such:1,sudden:1,sugar:1,
    suggest:1,summer:1,sun:1,Sunday:1,super:1,supply:1,support:1,
    suppose:1,sure:1,surface:1,surprise:1,swim:1,swing:1,switch:1,
    symbol:1,system:1,t:1,table:1,tail:1,take:1,tale:1,talk:1,tall:1,
    tank:1,taste:1,tax:1,tea:1,teach:1,team:1,tear:1,telephone:1,
    television:1,tell:1,temperature:1,ten:1,tennis:1,term:1,test:1,
    than:1,thank:1,that:1,the:1,theater:1,their:1,them:1,theme:1,
    then:1,theory:1,there:1,these:1,they:1,thick:1,thin:1,thing:1,
    think:1,third:1,those:1,though:1,thought:1,thousand:1,thread:1,
    three:1,threw:1,throat:1,through:1,throw:1,thumb:1,thunder:1,
    thus:1,tick:1,ticket:1,tide:1,tie:1,tight:1,time:1,tin:1,tiny:1,
    tip:1,tire:1,title:1,to:1,today:1,together:1,tomato:1,tomorrow:1,
    tone:1,tongue:1,tonight:1,too:1,tool:1,tooth:1,top:1,topic:1,
    total:1,touch:1,tough:1,tour:1,toward:1,tower:1,town:1,toy:1,
    trace:1,track:1,trade:1,traffic:1,train:1,transfer:1,trap:1,
    travel:1,treat:1,tree:1,trial:1,tribe:1,trick:1,trip:1,troop:1,
    trouble:1,truck:1,true:1,trust:1,truth:1,try:1,tube:1,tuesday:1,
    turn:1,twelve:1,twenty:1,twice:1,twin:1,two:1,type:1,u:1,
    umbrella:1,uncle:1,under:1,understand:1,uniform:1,union:1,
    unit:1,universe:1,unknown:1,unless:1,until:1,unusual:1,up:1,
    upon:1,upper:1,upstairs:1,us:1,use:1,used:1,useful:1,usual:1,
    usually:1,v:1,valley:1,value:1,van:1,variety:1,very:1,vessel:1,
    victory:1,view:1,village:1,violence:1,visit:1,voice:1,volume:1,
    vote:1,w:1,wait:1,wake:1,walk:1,wall:1,want:1,war:1,warm:1,
    warn:1,watch:1,water:1,wave:1,way:1,weak:1,wealth:1,weapon:1,
    wear:1,weather:1,week:1,weigh:1,weight:1,welcome:1,well:1,
    west:1,wet:1,what:1,wheel:1,when:1,where:1,which:1,while:1,
    white:1,who:1,whole:1,whom:1,whose:1,why:1,wide:1,wife:1,
    wild:1,will:1,win:1,wind:1,window:1,wine:1,wing:1,winter:1,
    wire:1,wise:1,wish:1,with:1,within:1,without:1,wolf:1,woman:1,
    women:1,won:1,wonder:1,wood:1,word:1,work:1,worker:1,world:1,
    worry:1,worth:1,wrap:1,write:1,writer:1,writing:1,wrong:1,
    yard:1,year:1,yellow:1,yes:1,yesterday:1,yet:1,you:1,young:1,
    your:1,yours:1,zero:1,zebra:1,zone:1
  };

  function cleanWord(w) {
    return String(w || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  }

  function isMisspelled(word) {
    var c = cleanWord(word);
    return c.length > 2 && !SPELL_DICT[c];
  }

  function checkSpelling() {
    if (!spellCheckEnabled || !editor) return;
    var text = editor.textContent || '';
    var words = text.split(/\s+/);
    var errors = new Set();
    var errorCount = 0;
    words.forEach(function (w) {
      if (isMisspelled(w)) {
        errors.add(w);
        errorCount++;
      }
    });

    spellErrors = errors;
    updateSpellBadge(errorCount);

    // If there are brand-new errors not seen before, show emoji animation
    var currentSig = text.replace(/\s+/g, ' ').trim();
    if (errorCount > 0 && currentSig !== lastSpellWords) {
      lastSpellWords = currentSig;
      showSpellEmoji();
    }
  }

  function updateSpellBadge(count) {
    var existing = document.querySelector('.spell-badge');
    if (count <= 0) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      var badge = document.createElement('span');
      badge.className = 'spell-badge';
      var editorRect = editor.getBoundingClientRect();
      badge.style.position = 'absolute';
      badge.style.left = (editorRect.left + 10) + 'px';
      badge.style.top = (editorRect.top - 24) + 'px';
      badge.style.zIndex = '100';
      document.body.appendChild(existing = badge);
    }
    existing.textContent = count + ' spelling error' + (count === 1 ? '' : 's') + '  📝';
  }

  function showSpellEmoji() {
    if (!editor) return;
    var rect = editor.getBoundingClientRect();
    var emoji = document.createElement('div');
    emoji.className = 'spell-emoji';
    emoji.textContent = '❌';
    emoji.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    emoji.style.top = (rect.top + 20) + 'px';
    document.body.appendChild(emoji);
    window.setTimeout(function () { emoji.remove(); }, 1100);
  }

  function highlightErrors() {
    if (!spellCheckEnabled || !editor) return;
    var html = editor.innerHTML;
    // Remove previous highlight spans
    html = html.replace(/<mark class="spell-error">([^<]*)<\/mark>/g, '$1');
    spellErrors.forEach(function (err) {
      var re = new RegExp('\\b' + escapeRegExp(err) + '\\b', 'g');
      html = html.replace(re, '<mark class="spell-error">$&</mark>');
    });
    editor.innerHTML = html;
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function toggleSpell() {
    spellCheckEnabled = !spellCheckEnabled;
    spellBtn.setAttribute('aria-pressed', String(spellCheckEnabled));
    try { localStorage.setItem(LS.spell, String(spellCheckEnabled)); } catch (e) {}
    if (spellCheckEnabled) {
      spellBtn.classList.add('tb-active');
      checkSpelling();
    } else {
      spellBtn.classList.remove('tb-active');
      document.querySelectorAll('.spell-error').forEach(function (el) {
        el.outerHTML = el.textContent;
      });
      updateSpellBadge(0);
    }
  }

  function addRipple(event) {
    var button = event.target && event.target.closest
      ? event.target.closest('.btn, .new-note, .ai-send, .ai-trigger, .chip, .ai-new, .share-btn, .intro-cta, .nav-item, .folder-item, .note-item, .tb, .text-btn, .side-clock, .clock-remove')
      : null;
    if (!button || button.disabled) return;

    var rect = button.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2;
    var ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.width = size + 'px';
    ink.style.height = size + 'px';
    ink.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ink.style.top = (event.clientY - rect.top - size / 2) + 'px';
    button.appendChild(ink);
    window.setTimeout(function () { ink.remove(); }, 650);
  }

  /* ---------- Events ---------- */

  newNoteBtn.addEventListener('click', function () { createNote(); });
  newNoteListBtn.addEventListener('click', function () { createNote(); });
  startNewBtn.addEventListener('click', function () { createNote(); });
  emptyNew.addEventListener('click', function () { createNote(); });

  sidebarOpen.addEventListener('click', function () { document.body.classList.add('sidebar-open'); });
  sidebarClose.addEventListener('click', closeSidebar);
  scrim.addEventListener('click', closeSidebar);

  backListBtn.addEventListener('click', function () {
    document.body.classList.remove('show-editor');
  });

  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.view = btn.dataset.view;
      state.folderId = null;
      state.tag = null;
      seenNotes = Object.create(null);
      renderAll();
      closeSidebar();
    });

    if (btn.dataset.view === 'all') {
      btn.title = 'All notes — drop a note here to remove it from its folder';
      btn.addEventListener('dragover', function (event) {
        if (!event.dataTransfer) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        btn.classList.add('drop-target');
      });
      btn.addEventListener('dragleave', function () {
        btn.classList.remove('drop-target');
      });
      btn.addEventListener('drop', function (event) {
        event.preventDefault();
        btn.classList.remove('drop-target');
        var id = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        if (id) moveDocToFolder(id, null);
      });
    }
  });

  if (pageScroll) {
    pageScroll.addEventListener('scroll', updateReadProgress, { passive: true });
  }
  window.addEventListener('resize', updateReadProgress);

  searchInput.addEventListener('input', function () {
    state.query = searchInput.value.trim().toLowerCase();
    searchClear.hidden = !searchInput.value;
    seenNotes = Object.create(null);
    renderList();
  });

  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    state.query = '';
    searchClear.hidden = true;
    renderList();
    searchInput.focus();
  });

  addFolderBtn.addEventListener('click', addFolder);

  docTitle.addEventListener('input', function () {
    var doc = selectedDoc();
    if (!doc || doc.trashed) return;

    doc.title = docTitle.value;
    doc.updatedAt = Date.now();
    dirty = true;
    setStatus('Saving…');
    document.title = (doc.title || 'Untitled') + ' – Notes';
    scheduleSave();
  });

  docTitle.addEventListener('blur', saveNow);

  editor.addEventListener('input', function () {
    handleEdit();
    clearTimeout(spellCheckTimer);
    spellCheckTimer = window.setTimeout(checkSpelling, 350);
  });

  editor.addEventListener('paste', function (event) {
    if (!editor.isContentEditable) return;

    var clipboard = event.clipboardData;
    if (!clipboard) return;

    event.preventDefault();
    var html = clipboard.getData('text/html');
    var text = clipboard.getData('text/plain');

    if (html) {
      var clean = sanitizeHtml(html);
      if (clean) document.execCommand('insertHTML', false, clean);
      else document.execCommand('insertText', false, text);
    } else {
      document.execCommand('insertText', false, text);
    }

    handleEdit();
  });

  editor.addEventListener('drop', function (event) {
    if (!editor.isContentEditable) return;
    var text = event.dataTransfer && event.dataTransfer.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    document.execCommand('insertText', false, text);
    handleEdit();
  });

  editor.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a') : null;
    if (link && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      window.open(link.href, '_blank', 'noopener');
    }
  });

  document.addEventListener('selectionchange', function () {
    rememberRange();
    updateToolbar();
    if (aiDrawer.classList.contains('open')) updateAiContext();
  });

  toolbar.addEventListener('mousedown', function (event) {
    if (event.target.closest('button')) event.preventDefault();
  });

  toolbar.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-cmd]');
    if (!btn) return;
    runCommand(btn.dataset.cmd);
  });

  blockFormat.addEventListener('change', function () {
    restoreRange();
    runCommand('formatBlock', '<' + blockFormat.value + '>');
  });

  linkBtn.addEventListener('click', insertLink);

  hiliteColor.addEventListener('input', function () {
    hiliteDot.style.setProperty('--c', hiliteColor.value);
  });

  hiliteColor.addEventListener('change', function () {
    restoreRange();
    runCommand('hiliteColor', hiliteColor.value);
  });

  foreColor.addEventListener('input', function () {
    foreDot.style.setProperty('--c', foreColor.value);
  });

  foreColor.addEventListener('change', function () {
    restoreRange();
    runCommand('foreColor', foreColor.value);
  });

  starBtn.addEventListener('click', function () {
    var doc = selectedDoc();
    if (!doc) return;

    saveNow();
    doc.starred = !doc.starred;
    doc.updatedAt = Date.now();
    writeDocs();

    if (state.view === 'starred' && !doc.starred) {
      state.view = 'all';
      state.folderId = null;
      renderAll();
    } else {
      renderList();
      renderCounts();
    }

    starBtn.setAttribute('aria-pressed', doc.starred ? 'true' : 'false');
    starBtn.setAttribute('aria-label', doc.starred ? 'Remove star' : 'Star note');
    starBtn.title = doc.starred ? 'Remove star' : 'Star note';
    starBtn.classList.remove('pop');
    void starBtn.offsetWidth;
    if (doc.starred) {
      starBtn.classList.add('pop');
      burstStars(starBtn);
    }
    toast(doc.starred ? 'Starred' : 'Removed from starred');
  });

  folderSelect.addEventListener('change', function () {
    var doc = selectedDoc();
    if (!doc) return;

    doc.folderId = folderSelect.value || null;
    doc.updatedAt = Date.now();
    writeDocs();

    docFolder.textContent = folderName(doc.folderId) || 'No folder';
    renderFolders();
    renderList();
    toast('Note moved');
  });

  restoreBtn.addEventListener('click', restoreCurrent);
  purgeBtn.addEventListener('click', purgeCurrent);
  emptyTrashBtn.addEventListener('click', emptyTrash);

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      state.sort = SORT_OPTIONS.indexOf(sortSelect.value) === -1 ? 'updated' : sortSelect.value;
      write(LS.sort, state.sort);
      seenNotes = Object.create(null);
      renderList();
    });
  }

  if (tagsClear) {
    tagsClear.addEventListener('click', function () {
      state.tag = null;
      renderAll();
    });
  }

  if (newTemplateBtn) newTemplateBtn.addEventListener('click', openTemplateModal);
  if (paletteOpenBtn) paletteOpenBtn.addEventListener('click', openPalette);
  if (dailyNoteBtn) dailyNoteBtn.addEventListener('click', openDailyNote);
  if (focusExit) focusExit.addEventListener('click', exitFocus);

  if (tagForm) {
    tagForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = tagInput.value.trim();
      if (!value) return;
      addTagToSelected(value);
      tagInput.value = '';
      tagInput.focus();
    });
  }

  if (tagCurrent) {
    tagCurrent.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-remove-tag]');
      if (btn) removeTagFromSelected(btn.dataset.removeTag);
    });
  }

  if (tagSuggest) {
    tagSuggest.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-add-tag]');
      if (btn) addTagToSelected(btn.dataset.addTag);
    });
  }

  if (historyList) {
    historyList.addEventListener('click', function (event) {
      var preview = event.target.closest('[data-preview-version]');
      if (preview) {
        var item = preview.closest('.history-item');
        var body = item ? item.querySelector('.history-preview') : null;
        if (body) {
          body.hidden = !body.hidden;
          preview.textContent = body.hidden ? 'Preview' : 'Hide preview';
        }
        return;
      }

      var restore = event.target.closest('[data-restore-version]');
      if (restore) restoreVersion(Number(restore.dataset.restoreVersion));
    });
  }

  if (historySnapshotBtn) {
    historySnapshotBtn.addEventListener('click', function () {
      var doc = selectedDoc();
      if (!doc) return;
      saveNow();
      snapshotDoc(doc, true);
      renderHistoryModal();
      toast('Version saved');
    });
  }

  if (templateGrid) {
    templateGrid.addEventListener('click', function (event) {
      var card = event.target.closest('[data-template]');
      if (card) createFromTemplate(card.dataset.template);
    });
  }

  if (paletteInput) {
    paletteInput.addEventListener('input', function () { renderPalette(paletteInput.value); });
    paletteInput.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        movePalette(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        movePalette(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choosePaletteItem();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeModal('palette-modal');
      }
    });
  }

  ['palette-modal', 'shortcuts-modal', 'tags-modal', 'history-modal', 'template-modal'].forEach(function (id) {
    var modal = $(id);
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal(id);
      });
    }
  });

  docMenu.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-act]');
    if (!btn) return;
    docMenu.open = false;

    var action = btn.dataset.act;
    if (action === 'pin') {
      togglePin();
    } else if (action === 'tags') {
      openTagsModal();
    } else if (action === 'history') {
      openHistoryModal();
    } else if (action === 'archive') {
      toggleArchive();
    } else if (action === 'focus') {
      enterFocus();
    } else if (action === 'shortcuts') {
      openModal('shortcuts-modal');
    } else if (action === 'print') {
      saveNow();
      window.print();
    } else if (action === 'export-html') {
      exportCurrent('html');
    } else if (action === 'export-txt') {
      exportCurrent('txt');
    } else if (action === 'duplicate') {
      duplicateCurrent();
    } else if (action === 'delete') {
      var doc = selectedDoc();
      if (doc && doc.trashed) purgeCurrent();
      else trashCurrent();
    }
  });

  document.addEventListener('click', function (event) {
    if (docMenu.open && !docMenu.contains(event.target)) docMenu.open = false;
  });

  exportAllBtn.addEventListener('click', exportAll);

  importInput.addEventListener('change', function () {
    var file = importInput.files && importInput.files[0];
    importFile(file);
    importInput.value = '';
  });

  /* Opening screen events */

  if (introEl) {
    introEl.addEventListener('click', function (event) {
      if (event.target.closest('#intro-skip')) return;
      openNotes(true);
    });

    if (introOpenBtn) {
      introOpenBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        openNotes(true);
      });
    }

    if (introSkipBtn) {
      introSkipBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        openNotes(false);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (introEl.hidden || introEl.classList.contains('is-leaving')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openNotes(true);
      }
    });
  }

  themeToggle.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.add('theme-transition');
    window.setTimeout(function () { document.body.classList.remove('theme-transition'); }, 380);
    applyTheme(next);
    localizeTree(appEl);
    try { localStorage.setItem(LS.theme, next); } catch (e) {}
  });

  /* Language events */

  if (langOpenBtn) {
    langOpenBtn.addEventListener('click', openLangModal);
  }

  if (langSearch) {
    langSearch.addEventListener('input', function () {
      langQuery = langSearch.value || '';
      renderLangList();
    });
  }

  if (langModal) {
    langModal.addEventListener('click', function (event) {
      if (event.target === langModal) closeModal('lang-modal');
    });
  }

  /* Share events */

  shareOpenBtn.addEventListener('click', openShareDialog);

  shareAccessSelect.addEventListener('change', function () {
    updateShareAccess();
    shareAccessBox.classList.remove('swap');
    void shareAccessBox.offsetWidth;
    shareAccessBox.classList.add('swap');
    refreshShareLink();
    if (shareAccessMode === 'password') {
      window.setTimeout(function () { sharePasswordInput.focus(); }, 40);
    }
  });

  sharePasswordInput.addEventListener('input', function () {
    shareLinkInput.value = '';
    shareLinkInput.placeholder = 'Creating link…';
    shareCopyBtn.disabled = true;
    clearTimeout(sharePasswordTimer);
    sharePasswordTimer = window.setTimeout(refreshShareLink, 320);
  });

  shareCopyBtn.addEventListener('click', handleShareCopy);
  shareEmailBtn.addEventListener('click', emailShareLink);
  shareDownloadBtn.addEventListener('click', downloadShareFile);
  shareNativeBtn.addEventListener('click', nativeShareNote);

  shareModal.addEventListener('click', function (event) {
    if (event.target === shareModal) closeModal('share-modal');
  });

  sharedCopyBtn.addEventListener('click', saveSharedCopy);
  sharedOpenBtn.addEventListener('click', closeSharedView);

  sharedUnlockForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var password = sharedPasswordInput.value;
    if (!password) return;

    var button = sharedUnlockForm.querySelector('button[type="submit"]');
    sharedErrorEl.hidden = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Unlocking…';
    }

    decodeShare(sharedToken, password).then(function (payload) {
      sharedPasswordInput.value = '';
      openSharedView(payload);
    }).catch(function () {
      writingError('Wrong password — try again.');
      sharedErrorEl.textContent = 'That password did not work.';
      sharedErrorEl.hidden = false;
      sharedPasswordInput.select();
      sharedUnlockForm.classList.remove('shake');
      void sharedUnlockForm.offsetWidth;
      sharedUnlockForm.classList.add('shake');
    }).then(function () {
      if (button) {
        button.disabled = false;
        button.textContent = 'Unlock';
      }
    });
  });

  /* AI events */

  aiOpenBtn.addEventListener('click', toggleAiDrawer);
  aiCloseBtn.addEventListener('click', closeAiDrawer);
  aiScrim.addEventListener('click', closeAiDrawer);
  aiSettingsBtn.addEventListener('click', openAiSettings);
  aiSetupCta.addEventListener('click', openAiSettings);
  aiNewChatBtn.addEventListener('click', aiResetChat);
  aiGenerateBtn.addEventListener('click', openGenModal);

  aiQuick.addEventListener('click', function (event) {
    var chip = event.target.closest('button[data-ai-action]');
    if (!chip) return;
    aiRunQuick(chip.dataset.aiAction);
  });

  aiForm.addEventListener('submit', function (event) {
    event.preventDefault();
    aiSendMessage(aiInput.value);
  });

  aiInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      aiSendMessage(aiInput.value);
    }
  });

  aiInput.addEventListener('input', aiAutoGrow);
  aiStopBtn.addEventListener('click', aiStop);

  aiKeyToggle.addEventListener('click', function () {
    var showing = aiKeyInput.type === 'text';
    aiKeyInput.type = showing ? 'password' : 'text';
    aiKeyToggle.setAttribute('aria-label', showing ? 'Show key' : 'Hide key');
    aiKeyToggle.title = showing ? 'Show key' : 'Hide key';
    var use = aiKeyToggle.querySelector('use');
    if (use) use.setAttribute('href', showing ? '#i-eye' : '#i-eye-off');
  });

  aiTempInput.addEventListener('input', function () {
    aiTempOut.textContent = Number(aiTempInput.value).toFixed(1);
  });

  aiLoadModelsBtn.addEventListener('click', aiLoadModels);
  aiTestBtn.addEventListener('click', aiTestConnection);
  aiSaveBtn.addEventListener('click', aiSaveSettings);
  aiDisconnectBtn.addEventListener('click', aiDisconnect);

  aiSettingsModal.addEventListener('click', function (event) {
    if (event.target === aiSettingsModal) closeModal('ai-settings-modal');
  });

  genModal.addEventListener('click', function (event) {
    if (event.target === genModal) closeModal('gen-modal');
  });

  document.querySelectorAll('[data-close-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      closeModal(button.dataset.closeModal);
    });
  });

  genRunBtn.addEventListener('click', aiRunGenerate);
  genCreateBtn.addEventListener('click', aiCreateGeneratedNote);

  genPrompt.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      aiRunGenerate();
    }
  });

  /* Clock & timer events */
  if (clockOpenBtn) clockOpenBtn.addEventListener('click', openClockModal);
  if (clockAddBtn) clockAddBtn.addEventListener('click', addClock);
  if (clockCityInput) clockCityInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') { event.preventDefault(); addClock(); }
  });
  if (clockQuick) {
    clockQuick.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-city]') : null;
      if (btn) addClockPreset(btn.dataset.city, btn.dataset.tz);
    });
  }
  if (timerPresets) {
    timerPresets.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-timer-preset]') : null;
      if (!btn) return;
      applyTimerPreset(Number(btn.dataset.timerPreset) || 0);
      toast('Timer set to ' + btn.textContent.trim());
    });
  }
  timerStartBtn.addEventListener('click', startTimer);
  timerPauseBtn.addEventListener('click', pauseTimer);
  timerResetBtn.addEventListener('click', resetTimer);
  [timerHInput, timerMInput, timerSInput].forEach(function (input) {
    input.addEventListener('input', function () {
      var h = Number(timerHInput.value) || 0;
      var m = Number(timerMInput.value) || 0;
      var s = Number(timerSInput.value) || 0;
      timerSeconds = h * 3600 + m * 60 + s;
      timerTotal = timerSeconds;
      setTimerPresetActive(-1);
      if (!timerRunning) {
        updateTimerDisplay();
        setTimerState('Ready');
      }
    });
  });

  /* Pointer-reactive spotlight in the editor */
  if (editorPane && editorSpotlight && !(motionQuery && motionQuery.matches)) {
    var spotRaf = 0;
    editorPane.addEventListener('pointermove', function (event) {
      if (spotRaf) return;
      spotRaf = window.requestAnimationFrame(function () {
        spotRaf = 0;
        var rect = editorPane.getBoundingClientRect();
        editorSpotlight.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width * 100) + '%');
        editorSpotlight.style.setProperty('--my', ((event.clientY - rect.top) / rect.height * 100) + '%');
        editorSpotlight.classList.add('is-live');
      });
    });
    editorPane.addEventListener('pointerleave', function () {
      editorSpotlight.classList.remove('is-live');
    });
  }

  spellBtn.addEventListener('click', toggleSpell);

  document.addEventListener('click', addRipple);

  document.addEventListener('keydown', function (event) {
    var mod = event.ctrlKey || event.metaKey;
    var key = event.key.toLowerCase();
    var target = event.target;
    var typing = target === editor || target === docTitle ||
      (target && target.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

    if (mod && key === 's') {
      event.preventDefault();
      saveNow();
      toast('Saved');
      return;
    }

    if (mod && event.shiftKey && key === 'p') {
      event.preventDefault();
      openPalette();
      return;
    }

    if (mod && key === 'k') {
      event.preventDefault();
      if (target === editor) {
        insertLink();
      } else if (!paletteModal || paletteModal.hidden) {
        openPalette();
      }
      return;
    }

    if (mod && event.shiftKey && key === 'd') {
      event.preventDefault();
      openDailyNote();
      return;
    }

    if (mod && event.shiftKey && key === 'f') {
      event.preventDefault();
      toggleFocus();
      return;
    }

    if (mod && event.shiftKey && key === 't') {
      event.preventDefault();
      openClockModal();
      return;
    }

    if (mod && key === 'j') {
      /* AI shortcuts are disabled in this build. */
      event.preventDefault();
      return;
    }

    if (mod && event.altKey && key === 'n') {
      /* AI shortcuts are disabled in this build. */
      event.preventDefault();
      return;
    }

    if (event.altKey && !mod && key === 'n') {
      event.preventDefault();
      createNote();
      return;
    }

    if (key === '/' && !mod && !event.altKey && !typing) {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    if (event.key === '?' && !mod && !event.altKey && !typing) {
      event.preventDefault();
      openModal('shortcuts-modal');
      return;
    }

    if (event.key === 'Escape') {
      if (document.body.classList.contains('focus-mode')) exitFocus();
      docMenu.open = false;
      closeSidebar();
      document.body.classList.remove('show-editor');
      if (aiDrawer.classList.contains('open')) closeAiDrawer();
      if (document.querySelector('.modal-backdrop.show')) {
        document.querySelectorAll('.modal-backdrop.show').forEach(function (modal) {
          closeModal(modal.id);
        });
      }
    }
  });

  window.addEventListener('beforeunload', function () {
    if (dirty) saveNow();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && dirty) saveNow();
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 760) document.body.classList.remove('show-editor');
  });

  /* ---------- Authentication and account ---------- */

  function setAuthError(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function setAuthBusy(busy) {
    authBusy = !!busy;
    if (loginSubmit) {
      loginSubmit.disabled = authBusy;
      loginSubmit.textContent = authBusy ? 'Signing in…' : 'Log in';
    }
    if (registerSubmit) {
      registerSubmit.disabled = authBusy;
      registerSubmit.textContent = authBusy ? 'Creating account…' : 'Create account';
    }
    if (authTabLogin) authTabLogin.disabled = authBusy;
    if (authTabRegister) authTabRegister.disabled = authBusy;
  }

  function updateAccountUI() {
    var name = currentUser ? (currentUser.username || 'Account') : 'Account';
    var email = currentUser ? (currentUser.email || '') : '';
    var initial = name.trim().charAt(0).toUpperCase() || '?';

    if (accountAvatar) accountAvatar.textContent = initial;
    if (accountName) accountName.textContent = name;
    if (accountEmail) accountEmail.textContent = email;
    if (profileAvatar) profileAvatar.textContent = initial;
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (profileSince) {
      var since = currentUser && Number(currentUser.createdAt);
      profileSince.textContent = since
        ? 'Member since ' + new Date(since).toLocaleDateString(locale(), {
          year: 'numeric', month: 'long', day: 'numeric'
        })
        : '';
    }
  }

  function showAuth(view) {
    authView = view === 'register' ? 'register' : 'login';
    if (authScreen) authScreen.hidden = false;
    if (appEl) appEl.inert = true;
    document.body.classList.add('intro-open');
    if (introEl) introEl.hidden = true;

    var loginActive = authView === 'login';
    if (authTabLogin) {
      authTabLogin.classList.toggle('is-active', loginActive);
      authTabLogin.setAttribute('aria-selected', String(loginActive));
    }
    if (authTabRegister) {
      authTabRegister.classList.toggle('is-active', !loginActive);
      authTabRegister.setAttribute('aria-selected', String(!loginActive));
    }
    if (authLoginForm) authLoginForm.hidden = !loginActive;
    if (authRegisterForm) authRegisterForm.hidden = loginActive;

    setAuthError(loginError, '');
    setAuthError(registerError, '');
    window.setTimeout(function () {
      var focusEl = loginActive ? loginEmail : registerUsername;
      if (focusEl) focusEl.focus();
    }, 60);
  }

  function hideAuth() {
    if (authScreen) authScreen.hidden = true;
    document.body.classList.remove('intro-open');
    if (appEl) appEl.inert = false;
  }

  function handleAuthSuccess(user) {
    currentUser = user || null;
    updateAccountUI();
    hideAuth();
  }

  function handleSignedOut() {
    currentUser = null;
    docs = [];
    folders = [];
    noteIndex = Object.create(null);
    folderIndex = Object.create(null);
    versionCache = [];
    versionCacheNoteId = null;
    dirty = false;

    window.clearTimeout(saveTimer);
    window.clearTimeout(syncTimer);
    syncTimer = null;
    syncRunning = false;
    syncAgain = false;
    syncPromise = null;

    state.selectedId = null;
    state.view = 'all';
    state.folderId = null;
    state.tag = null;
    state.query = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.hidden = true;

    document.querySelectorAll('.modal-backdrop.show').forEach(function (modal) {
      closeModal(modal.id);
    });

    setAuthBusy(false);
    updateAccountUI();
    renderAll();
    renderEditor();
    showAuth('login');
  }

  function handleApiError(error, fallback) {
    if (error && error.status === 401) {
      handleSignedOut();
      return;
    }
    var message = error && error.message ? error.message : fallback;
    if (message) toast(message);
  }

  function loadWorkspace() {
    if (!currentUser) return Promise.resolve();
    setStatus('Loading…');

    return Promise.all([api.listNotes(), api.listFolders()]).then(function (results) {
      var serverNotes = results[0] || [];
      var serverFolders = results[1] || [];

      docs = serverNotes.map(normalizeDoc);
      folders = serverFolders.map(function (folder) {
        return {
          id: String(folder.id),
          name: String(folder.name || ''),
          createdAt: Number(folder.createdAt) || Date.now(),
          updatedAt: Number(folder.updatedAt) || Date.now()
        };
      });

      noteIndex = Object.create(null);
      folderIndex = Object.create(null);
      docs.forEach(function (doc) { noteIndex[doc.id] = noteSnapshot(doc); });
      folders.forEach(function (folder) { folderIndex[folder.id] = { name: folder.name }; });

      state.view = 'all';
      state.folderId = null;
      state.tag = null;
      state.query = '';
      if (searchInput) searchInput.value = '';
      if (searchClear) searchClear.hidden = true;

      if (!docs.some(function (doc) { return doc.id === state.selectedId; })) {
        var first = visibleDocs()[0];
        state.selectedId = first ? first.id : null;
        persistSelected();
      }

      versionCache = [];
      versionCacheNoteId = null;

      renderAll();
      renderEditor();

      if (introMetaEl) {
        var liveCount = docs.filter(function (doc) { return !doc.trashed; }).length;
        var storageNote = api.backend === 'supabase' ? 'synced to your account' : 'encrypted on this PC';
        introMetaEl.textContent = tc('note', liveCount) + ' · ' + t('private') + ' · ' + t(storageNote);
      }
    }).catch(function (error) {
      handleApiError(error, 'Could not load your notes.');
      throw error;
    });
  }

  function readLegacy(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function removeLegacy(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function purgeLegacySecrets() {
    /* Old builds could store an OpenAI key and share preference in plain text. */
    removeLegacy('notes:ai');
    removeLegacy('notes:shareAccess');
    /* An earlier bug wrote note/folder/AI data under the literal key
       "undefined". Remove it so nothing sensitive lingers in the browser. */
    removeLegacy('undefined');
  }

  function migrateLegacyLocalData() {
    var legacyDocs = readLegacy('notes:docs');
    var legacyFolders = readLegacy('notes:folders');
    var legacyHistory = readLegacy('notes:history');

    if (!Array.isArray(legacyDocs)) legacyDocs = [];
    var history = legacyHistory && typeof legacyHistory === 'object' && !Array.isArray(legacyHistory)
      ? legacyHistory
      : {};

    var notes = legacyDocs.filter(function (doc) {
      return doc && typeof doc === 'object';
    }).slice(0, 1000);

    /* Preserve orphaned history entries as recovered notes. */
    if (!notes.length && Object.keys(history).length) {
      Object.keys(history).forEach(function (id) {
        var entries = Array.isArray(history[id]) ? history[id] : [];
        var latest = entries[0];
        if (latest && (latest.title || latest.html)) {
          notes.push({
            title: String(latest.title || 'Recovered note'),
            html: String(latest.html || ''),
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      });
    }

    if (!notes.length) {
      removeLegacy('notes:docs');
      removeLegacy('notes:folders');
      removeLegacy('notes:history');
      return Promise.resolve(null);
    }

    var payload = {
      app: 'notes',
      version: 1,
      folders: Array.isArray(legacyFolders) ? legacyFolders : [],
      notes: notes
    };

    return api.importData(payload).then(function (result) {
      var importedNotes = result && Array.isArray(result.notes) ? result.notes : [];
      var versionTasks = [];
      var versionFailed = false;

      legacyDocs.forEach(function (doc) {
        var entries = Array.isArray(history[doc && doc.id]) ? history[doc.id] : [];
        if (!entries.length) return;

        var title = String(doc.title || '');
        var html = String(doc.html || '');
        var match = importedNotes.filter(function (note) {
          return note.title === title && note.html === html;
        })[0] || importedNotes.filter(function (note) {
          return note.title === title;
        })[0];
        if (!match) return;

        entries.slice().reverse().forEach(function (entry) {
          versionTasks.push(
            api.createVersion(match.id, entry.title || '', entry.html || '', true)
              .catch(function () { versionFailed = true; })
          );
        });
      });

      return Promise.all(versionTasks).then(function () {
        removeLegacy('notes:docs');
        removeLegacy('notes:folders');
        if (!versionFailed) removeLegacy('notes:history');
        return {
          imported: Number(result && result.imported && result.imported.notes) || notes.length,
          historyFailed: versionFailed
        };
      });
    });
  }

  function afterSignIn(user) {
    handleAuthSuccess(user);
    return loadWorkspace()
      .then(function () { return migrateLegacyLocalData(); })
      .then(function (migration) {
        if (!migration) return null;
        return loadWorkspace().then(function () {
          var count = migration.imported;
          toast('Imported ' + count + ' old note' + (count === 1 ? '' : 's') + ' from this browser');
        });
      })
      .catch(function (error) {
        handleApiError(error, 'Could not load your notes.');
      });
  }

  function openProfile() {
    if (!currentUser) return;
    updateAccountUI();
    if (passwordForm) passwordForm.reset();
    setAuthError(passwordError, '');
    if (passwordOk) {
      passwordOk.textContent = '';
      passwordOk.hidden = true;
    }
    openModal('profile-modal');
  }

  function logout() {
    if (authBusy) return;
    setAuthBusy(true);
    api.logout()
      .catch(function () { /* Clear the local session even if the server is unreachable. */ })
      .then(function () {
        setAuthBusy(false);
        handleSignedOut();
        toast('Signed out');
      });
  }

  if (authTabLogin) {
    authTabLogin.addEventListener('click', function () { showAuth('login'); });
  }
  if (authTabRegister) {
    authTabRegister.addEventListener('click', function () { showAuth('register'); });
  }

  if (authLoginForm) {
    authLoginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (authBusy) return;

      var email = loginEmail ? loginEmail.value.trim() : '';
      var password = loginPassword ? loginPassword.value : '';
      if (!email || !password) {
        setAuthError(loginError, 'Enter your email and password.');
        return;
      }

      setAuthError(loginError, '');
      setAuthBusy(true);
      api.login(email, password, !!(loginRemember && loginRemember.checked))
        .then(function (data) {
          if (loginPassword) loginPassword.value = '';
          return afterSignIn(data.user);
        })
        .catch(function (error) {
          setAuthError(loginError, error && error.message ? error.message : 'Could not sign in.');
        })
        .then(function () { setAuthBusy(false); });
    });
  }

  if (authRegisterForm) {
    authRegisterForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (authBusy) return;

      var username = registerUsername ? registerUsername.value.trim() : '';
      var email = registerEmail ? registerEmail.value.trim() : '';
      var password = registerPassword ? registerPassword.value : '';
      var confirm = registerConfirm ? registerConfirm.value : '';

      if (!username || username.length < 3) {
        setAuthError(registerError, 'Choose a username with at least 3 characters.');
        return;
      }
      if (!email) {
        setAuthError(registerError, 'Enter your email address.');
        return;
      }
      if (password.length < PASSWORD_MIN) {
        setAuthError(registerError, 'Use a password with at least ' + PASSWORD_MIN + ' characters.');
        return;
      }
      if (password !== confirm) {
        setAuthError(registerError, 'Passwords do not match.');
        return;
      }

      setAuthError(registerError, '');
      setAuthBusy(true);
      api.register(username, email, password, confirm)
        .then(function (data) {
          if (registerPassword) registerPassword.value = '';
          if (registerConfirm) registerConfirm.value = '';
          if (data && data.needsConfirmation) {
            showAuth('login');
            if (loginEmail) loginEmail.value = email;
            setAuthError(loginError, 'Check your email to confirm your account, then sign in.');
            toast('Confirmation email sent');
            return null;
          }
          return afterSignIn(data.user);
        })
        .catch(function (error) {
          setAuthError(registerError, error && error.message ? error.message : 'Could not create your account.');
        })
        .then(function () { setAuthBusy(false); });
    });
  }

  if (accountChip) accountChip.addEventListener('click', openProfile);
  if (profileLogout) profileLogout.addEventListener('click', logout);
  if (profileExport) profileExport.addEventListener('click', exportAll);

  if (passwordForm) {
    passwordForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!passwordSubmit) return;

      var current = passwordCurrent ? passwordCurrent.value : '';
      var next = passwordNew ? passwordNew.value : '';
      var confirm = passwordConfirm ? passwordConfirm.value : '';

      if (!current || !next) {
        setAuthError(passwordError, 'Fill in all password fields.');
        return;
      }
      if (next.length < PASSWORD_MIN) {
        setAuthError(passwordError, 'Use a new password with at least ' + PASSWORD_MIN + ' characters.');
        return;
      }
      if (next !== confirm) {
        setAuthError(passwordError, 'New passwords do not match.');
        return;
      }

      setAuthError(passwordError, '');
      if (passwordOk) {
        passwordOk.textContent = '';
        passwordOk.hidden = true;
      }
      passwordSubmit.disabled = true;
      api.changePassword(current, next, confirm)
        .then(function () {
          passwordForm.reset();
          if (passwordOk) {
            passwordOk.textContent = 'Password updated. Other sessions were signed out.';
            passwordOk.hidden = false;
          }
          toast('Password updated');
        })
        .catch(function (error) {
          setAuthError(passwordError, error && error.message ? error.message : 'Could not update your password.');
        })
        .then(function () { passwordSubmit.disabled = false; });
    });
  }

  if (profileModal) {
    profileModal.addEventListener('click', function (event) {
      if (event.target === profileModal) closeModal('profile-modal');
    });
  }

  /* ---------- Boot ---------- */

  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  applyLanguage(LANG, true);

  loadClocks();
  populateTZSelect();
  startClockInterval();

  try {
    spellCheckEnabled = localStorage.getItem(LS.spell) === 'true';
  } catch (e) {}
  if (spellBtn) {
    spellBtn.setAttribute('aria-pressed', String(spellCheckEnabled));
    if (spellCheckEnabled) spellBtn.classList.add('tb-active');
  }

  purgeLegacySecrets();

  /* URL-based sharing is disabled: strip any legacy #share= fragment, including
     one added after the page has already loaded. */
  function stripShareHash() {
    if (location.hash.indexOf('#share=') === 0) {
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (e) {
        location.hash = '';
      }
    }
  }

  window.addEventListener('hashchange', stripShareHash);
  stripShareHash();

  if (appEl) appEl.inert = true;
  showAuth('login');

  api.setUnauthorizedHandler(handleSignedOut);
  api.me()
    .then(function (data) { return afterSignIn(data.user); })
    .catch(function (error) {
      showAuth('login');
      if (error && error.status !== 401) {
        setAuthError(loginError, error.message || 'Could not connect to your notes service.');
      }
    });
})();
