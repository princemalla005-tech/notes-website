# Notes

A private, multi-user notebook with a rich-text editor, folders, tags, version
history, import/export and 99 interface languages.

Notes can run in two modes:

| Mode | Accounts and storage | Use it for |
| --- | --- | --- |
| **Supabase** (production) | Supabase Auth + Postgres with Row Level Security | Hosted, multi-device use |
| **Local server** (fallback) | Express + SQLite, AES-GCM encrypted at rest | Offline/private use on one PC |

The browser is only a client. Note bodies, folders and history are never written
to browser Local Storage.

---

## Production quick start (Supabase)

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql)
   in the SQL editor.
2. Put your **Project URL** and **anon/public key** in
   [`assets/config.js`](assets/config.js).
3. Configure the Site URL and redirect URLs in Supabase Auth.
4. Build and deploy:

```powershell
npm.cmd run build:static
npm.cmd run preview     # http://127.0.0.1:4174
```

Deploy the **contents of `dist/`**. See
[`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) for the full walkthrough, Netlify and
Vercel settings, security model, migration and troubleshooting.

> The anon key is public by design. **Never** put the `service_role` key in this
> project. The build refuses to publish a `service_role` key.

## Local quick start (fallback)

```powershell
npm.cmd install
npm.cmd start
```

Open <http://127.0.0.1:4173> and create an account.

- The server binds to `127.0.0.1` only.
- The database is `data/notes.db`; the encryption key is `data/master.key`.
- **Keep `data/master.key` safe.** The database cannot be decrypted without it.
- Stop the server with `Ctrl+C`.
- Leave `assets/config.js` empty so the frontend keeps using the local API.

> On this PC use `npm.cmd` rather than `npm`.

### Automatic start on Windows

You do not have to run `npm.cmd start` by hand. The `scripts/` folder contains
small Windows helpers:

| File | What it does |
| --- | --- |
| `scripts/start-notes.cmd` | Starts the server in its own console window, waits until it answers, then opens the app in your default browser. |
| `scripts/start-notes-server.cmd` | Starts the server only, without opening a browser (used at login). |
| `scripts/stop-notes.cmd` | Stops the Node.js process listening on `127.0.0.1:4173`; other programs are never touched. |
| `scripts/install-shortcuts.ps1` | Creates or refreshes the two shortcuts below (`-Remove` deletes them). |

Two shortcuts are installed:

- **Notes** on the Desktop — one-click start plus browser.
- **Notes Server** in the Windows **Startup** folder — starts the visible server
  console when you sign in, so the app is already available at
  <http://127.0.0.1:4173>.

Both helpers reuse an already-running server instead of starting a second one.
To stop a server you did not start from the console, run `scripts\stop-notes.cmd`.
To turn login auto-start off, delete `Notes Server.lnk` from
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`, or run
`powershell -ExecutionPolicy Bypass -File scripts\install-shortcuts.ps1 -Remove`.

If you move the project folder, run `install-shortcuts.ps1` again so the
shortcuts point at the new path.

## Accounts and security

### Supabase mode

- Sign-up, login, logout and password changes use Supabase Auth.
- Passwords are handled by Supabase and never reach this app.
- Every note, folder and version row has `user_id = auth.uid()` and RLS policies
  for select/insert/update/delete.
- Composite foreign keys stop a note from being attached to another user's
  folder, or a version to another user's note.
- Email confirmation is supported. If enabled, the app asks the user to confirm
  before signing in.
- “Keep me signed in” stores the Supabase session in `localStorage`; otherwise it
  uses `sessionStorage` for the current tab.
- Supabase encrypts data at rest, but note text is **not** end-to-end encrypted.
  Project administrators can read it. Use the local encrypted backend if you
  need zero-knowledge storage.

### Local server mode

- Passwords are stored as salted hashes, never in plain text.
- Sessions use an **HttpOnly, SameSite=Strict** cookie. JavaScript cannot read it.
- The CSRF token is kept **in memory only** and sent as `x-csrf-token` on
  mutations.
- Every note, folder and version query is scoped to the signed-in user. Another
  account receives `404` even if it knows the ID.
- Login, registration and password changes are rate-limited.
- Changing your password signs out your other sessions.
- Notes, folders and versions are AES-GCM encrypted at rest.

### What stays in browser storage

Local Storage is used only for interface preferences and (in Supabase mode) an
optional auth session:

| Key | Contents |
| --- | --- |
| `notes:lang` | Interface language code |
| `notes:selected` | Last opened note ID (an identifier, not note content) |
| `notes:theme` | `light` or `dark` |
| `notes:sort` | Last list sort order |
| `notes:clocks` | Saved world-clock cities |
| `notes:spell` | Spell-check preference |
| `notes:remember` | Supabase only: `1` when “Keep me signed in” is on |
| `notes:supabase-auth` | Supabase only: auth session token |

These keys are **never** written: `notes:docs`, `notes:folders`, `notes:history`,
`notes:ai`, `notes:shareAccess`. The app blocks attempts to write them and purges
legacy `notes:ai` / `notes:shareAccess` values at startup.

### Migrating notes

- **From the local server to Supabase:** export a JSON backup in the local app,
  then import it after signing in to Supabase. Folder IDs are remapped and note
  timestamps are preserved.
- **From old Local Storage:** if an older copy of Notes left notes in Local
  Storage, sign in and the app imports them once. Local Storage is cleared only
  after the import succeeds.

## Features

- **Rich text editor** — headings, bold, italic, underline, strikethrough, lists,
  alignment, links, colours, quotes, code blocks, tables and dividers.
- **Autosave** — changes sync shortly after you stop typing. `Ctrl+S` saves
  immediately.
- **Folders** — create, rename and delete folders; move notes with the folder
  dropdown or by dragging a note onto a folder.
- **Starred, pinned, tags, archive and trash** — organise notes without deleting
  them.
- **Sorting** — last edited, date created, title A–Z or Z–A.
- **Templates and daily notes**.
- **Version history** — the newest 12 snapshots per note; restore an earlier
  draft from ⋮ → Version history.
- **Focus mode, search and Quick actions**.
- **Export / import** — download all notes and folders as JSON, or restore a
  backup. Imported HTML is sanitised.
- **Print** — prints just the document.
- **Dark mode, 99 interface languages, RTL support, reading time**.
- **World Clock & Timer**.
- **Responsive layout and reduced-motion support**.

### Disabled in this build

- **AI is completely disabled.** There is no AI drawer, no AI settings, no
  API-key storage, no AI network calls, and `Ctrl+J` / `Ctrl+Alt+N` do nothing.
- **Sharing is completely disabled.** The share dialog, shared viewer, share
  links and `#share=` URL handling are blocked. A legacy `#share=` fragment is
  stripped on load and on hash change.

The related markup and functions remain in the source as disabled dead code so
older references do not break, but every entry point returns immediately and the
UI is hidden with CSS.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Bold / italic / underline |
| `Ctrl+K` | Insert a link inside the editor; outside it, open Quick actions |
| `Ctrl+Shift+P` | Open Quick actions from anywhere |
| `Ctrl+S` | Save now |
| `Alt+N` | New note |
| `Ctrl+Shift+D` | Open today's note |
| `Ctrl+Shift+F` | Toggle focus mode |
| `Ctrl+Shift+T` | Open World Clock & Timer |
| `/` | Jump to search |
| `?` | Show the keyboard shortcuts sheet |
| `Ctrl+P` | Print the current note |
| `Esc` | Exit focus mode and close menus / dialogs |

`Ctrl+J` and `Ctrl+Alt+N` are intentionally inert.

## Backups and recovery

- **Supabase mode** — use **Export backup** in the account menu. The JSON file
  contains notes, folders and flags. Store it privately. Supabase's own database
  backups depend on your plan; check the Supabase dashboard.
- **Local mode** — `npm.cmd run backup` copies the encrypted database and key.
  You can also use **Export backup**. Because the database is encrypted, a copy
  of `notes.db` without `master.key` is useless. Store both together.

## Tests

```powershell
npm.cmd test
```

The suite contains **58 passing tests**:

- **20 backend tests** — account creation, password rules, per-user isolation,
  cross-account denial for notes/folders/versions, unauthenticated access, CSRF,
  ownership tampering, ciphertext-at-rest checks, XSS sanitisation, SQL
  injection, cross-origin/non-JSON rejection, secure cookies and logout
  revocation, export/import isolation, security headers, login rate limiting,
  idle session expiry and password changes.
- **10 frontend authentication tests** — API client CSRF behaviour (memory only,
  no browser storage), login/register/logout flows, 401 handling, auth wiring,
  absence of sensitive Local Storage writes, early-return guards for AI/sharing,
  and static checks that the AI/share UI is hidden.
- **28 Supabase adapter tests** — configuration safety (empty config, refusal of
  `service_role` keys), auth mapping, email-confirmation detection, remember-me
  storage selection, friendly errors, note/folder CRUD mapping, version
  deduplication and pruning, restore snapshots, import folder remapping,
  export shape and unauthorized handling. These use an in-memory mock Supabase
  client, so they run without network access.

The local backend was also verified with a real-browser Chrome DevTools Protocol
smoke test (**33/33 checks**) before the Supabase adapter was added, covering
register → create note → reload → logout, second-account isolation, Local Storage
contents, hidden AI/share UI, inert `Ctrl+J` and `#share=` stripping.

Real Supabase verification requires your project URL and anon key. Follow the
production checklist in [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md).

## Files

```
notes/
├─ index.html                app shell, auth screen, editor, dialogs
├─ README.md                 this file
├─ SUPABASE-SETUP.md         production setup and deployment guide
├─ CONTINUE-HERE.md          implementation notes and status
├─ netlify.toml              Netlify build + headers
├─ vercel.json               Vercel build + headers
├─ package.json              start / dev / test / backup / build / preview
├─ assets/
│  ├─ api.js                 local same-origin API client (in-memory CSRF)
│  ├─ api-supabase.js        Supabase Auth + Postgres adapter
│  ├─ config.js              public Supabase URL + anon key
│  ├─ app.js                 editor, sync, folders, history, auth, import/export
│  ├─ i18n.js                language list and translations
│  ├─ styles.css             layout, themes, auth, editor and responsive styles
│  ├─ theme.js               theme bootstrap
│  ├─ icon.svg               favicon and app icon
│  └─ vendor/supabase.js     Supabase JS SDK (UMD, vendored)
├─ supabase/
│  └─ schema.sql             tables, indexes, triggers, RLS policies
├─ scripts/
│  ├─ build-static.js        safe dist/ build (frontend only)
│  └─ serve-static.js        zero-dependency dist/ preview server
├─ server/                   local Express + SQLite fallback
├─ test/
│  ├─ security.test.js       backend security tests
│  ├─ frontend-auth.test.js  frontend auth/storage/disabled-feature tests
│  └─ supabase-adapter.test.js Supabase adapter tests (mock client)
└─ data/                     notes.db + master.key (gitignored, local mode only)
```

## Limitations

- **Supabase mode is not end-to-end encrypted.** Supabase administrators can
  read note text. Use the local encrypted backend for zero-knowledge storage.
- **No self-service password-reset screen yet.** Supabase can send recovery
  emails from the dashboard, but the app does not expose a “Forgot password?”
  flow. Add one before relying on self-service recovery.
- **Import is not transactional.** A very large failed import can leave the rows
  that were already inserted. Export before importing.
- The local server is intended for one computer (`127.0.0.1`). It is not a
  hosted service.
- AI and sharing are intentionally unavailable in this build.
- If you use a custom Supabase domain, update the CSP `connect-src` lists in
  `index.html`, `vercel.json` and `scripts/build-static.js`.
