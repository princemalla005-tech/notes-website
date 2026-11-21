# Notes — Supabase migration status

Last updated: 2026-11-14

## Goal

Move account login and note storage from the local Express + SQLite server to
Supabase, and prepare the app for a production static deployment. Keep the local
backend as an optional development fallback and preserve the existing UI,
folders, tags, history, import/export and security behaviour.

## Status

Implementation is complete and tested locally. Real-project verification and
deployment are waiting for the Supabase **Project URL** and **anon/public key**.
Nothing is committed or pushed.

## Modes

| Mode | How it is selected | Backend |
| --- | --- | --- |
| Supabase | `assets/config.js` has a URL + anon key | Supabase Auth + Postgres (RLS) |
| Local fallback | Both config values are empty | Express + SQLite (`npm.cmd start`) |

## Completed

### Database

- `supabase/schema.sql`:
  - `public.folders`, `public.notes`, `public.note_versions`.
  - `user_id uuid not null default auth.uid()` on every table.
  - Composite foreign keys:
    - note → folder must have the same `user_id`;
    - version → note must have the same `user_id`.
  - `ON DELETE SET NULL (folder_id)` for folder deletion; version cascade.
  - Epoch-millisecond `created_at` / `updated_at` to match the frontend.
  - `updated_at` triggers for folders and notes.
  - Indexes for user/updated, user/folder, user/trashed and version history.
  - RLS enabled with owner-only select/insert/update/delete policies.
  - `anon` privileges revoked; `authenticated` gets scoped CRUD.
  - Safe to re-run.

### Frontend adapter

- `assets/config.js` — public URL + anon key, with a comment explaining why the
  anon key is safe and why `service_role` must never be used.
- `assets/api-supabase.js` — replaces `window.NotesApi` only when configured:
  - Refuses to start if the key's JWT role is not `anon`.
  - `me`, `login`, `register`, `logout`, `changePassword`.
  - Email-confirmation detection via `needsConfirmation`.
  - Remember-me: Supabase session in `localStorage` only when checked, otherwise
    `sessionStorage`.
  - Notes/folders CRUD, trash, version history with 12-version limit and
    90-second deduplication, restore with snapshot, import/export.
  - Import remaps folder IDs, preserves timestamps, batches large payloads.
  - Friendly error messages for invalid credentials, unconfirmed email,
    duplicate email, expired JWT and network failures.
  - Calls the app's unauthorized handler on 401/JWT failures.
  - Cleans Supabase auth tokens from the URL hash after sign-in/confirmation.
  - Raw HTTP helpers (`get`/`post`/…) reject with a clear message in Supabase
    mode.

### App shell

- `index.html`:
  - Loads `assets/api.js` → `assets/vendor/supabase.js` → `assets/config.js` →
    `assets/api-supabase.js` → `assets/app.js`.
  - Adds a CSP meta tag allowing `https://*.supabase.co` and
    `wss://*.supabase.co`.
  - Password minimum raised to 6 in labels and `minlength`.
  - Copy no longer claims “nothing leaves this laptop”.
- `assets/app.js`:
  - Register handler shows “Check your email to confirm your account” when
    `needsConfirmation` is returned.
  - Intro meta label says “synced to your account” in Supabase mode and
    “encrypted on this PC” in local mode.
  - Boot error is now “Could not connect to your notes service.”
  - `PASSWORD_MIN` raised to 6.
- `server/app.js`:
  - Local server CSP now allows Supabase origins, so the local server can also
    serve the app while it talks to Supabase.

### Windows auto-start

- `scripts/start-notes.cmd` — starts the local server in its own visible console
  window, waits for `/assets/app.js` to answer, then opens the browser.
- `scripts/start-notes-server.cmd` — server only (no browser), used at login.
- `scripts/stop-notes.cmd` — stops only the Node.js process listening on the
  Notes port; other programs are untouched.
- `scripts/wait-and-open.ps1` — polls the port, then opens the default browser.
- `scripts/install-shortcuts.ps1` — creates/refreshes the Desktop `Notes.lnk` and
  Startup `Notes Server.lnk`; `-Remove` deletes both.
- Launchers detect an already-running server and just open the app instead of
  starting a second copy.

### Production build

- `scripts/build-static.js`:
  - Copies only `index.html` + `assets/**` into `dist/`.
  - Refuses to build without Supabase config unless `--allow-unconfigured`.
  - Rejects non-HTTPS or malformed project URLs.
  - Rejects `service_role` keys.
  - Fails if any `*.key`, `*.db`, `.env` or similar file would be published.
  - Generates `dist/_headers` with CSP/cache headers and `dist/robots.txt`.
- `scripts/serve-static.js` — zero-dependency preview server on port 4174 with
  path-traversal protection.
- `netlify.toml`, `vercel.json` — build commands, output directory and security
  headers.
- `package.json` — `build:static` and `preview` scripts.
- `.gitignore` — ignores `dist/`, `.vercel/`, `.netlify/`.

### Documentation

- `SUPABASE-SETUP.md` — project creation, schema, Auth settings, config,
  local testing, Netlify/Vercel deployment, migration, security model,
  troubleshooting and production checklist.
- `README.md` — rewritten for the two modes, new storage keys, 58 tests and
  deployment.

## Verification

- `node --check` passes for all new/changed JavaScript files.
- `npm.cmd test` — **58/58 passing**:
  - 20 backend security tests;
  - 10 frontend auth/storage/disabled-feature tests;
  - 28 Supabase adapter tests with an in-memory mock client.
- `npm.cmd run build:static` with empty config — correctly fails with setup
  instructions.
- `npm.cmd run build:static -- --allow-unconfigured` — builds 13 files (~805 KB).
- A configured test build (fake anon JWT) — succeeds and writes the exact
  Supabase origin into the CSP.
- `npm.cmd run preview` — `GET /` 200, JS served as `text/javascript`, missing
  files 404, path traversal blocked.
- Local backend tests still pass after the CSP and password-minimum changes.

Not yet run: a real Supabase project end-to-end test (needs the user's URL/key).

## Waiting on the user

1. **Supabase Project URL** (`https://<ref>.supabase.co`).
2. **Supabase anon/public key**.
3. Whether **Confirm email** should be on or off in production.

Do **not** send the `service_role` key. It is not needed and must never be in the
browser.

Once provided:

1. Put both values in `assets/config.js`.
2. Run `supabase/schema.sql` in the project.
3. Set Site URL + redirect URLs in Supabase Auth.
4. Build and preview; register two accounts and verify isolation.
5. Deploy `dist/` to the chosen host.
6. Optionally re-run the real-browser E2E against Supabase.

## Backups

- Pre-change full backup:
  `C:\Users\this pc\Desktop\notes-backup-20261111-091948`
  (2,742 files, 15,070,400 bytes, byte-for-byte verified).
- Earlier backups:
  - `C:\Users\this pc\Desktop\notes-backup-20261110-041107`
  - `C:\Users\this pc\Desktop\notes-backup-20261108-014434`

Existing app files and user data were not deleted. `data/notes.db` and
`data/master.key` were not modified.

## Security notes

- The anon key is public by design; RLS is the actual access control.
- `service_role` must never be shipped. The adapter and build both refuse it.
- Supabase mode is **not** end-to-end encrypted. Supabase administrators can
  read note text. The local backend remains the zero-knowledge option.
- Browser storage contains only UI preferences and the Supabase auth session.
- Do not commit or push without approval.
