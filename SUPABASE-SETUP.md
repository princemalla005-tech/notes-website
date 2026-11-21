# Supabase setup and production deployment

This guide turns the local Notes app into a hosted app whose accounts and notes
live in Supabase. The local Express + SQLite server remains available as a
development fallback when Supabase is not configured.

> **Never put the Supabase `service_role` key in this project.** The browser only
> needs the **Project URL** and the **anon / public** key. The anon key is safe to
> publish because every table uses Row Level Security (RLS).

---

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard>.
2. **New project** → choose an organisation, name, database password and region.
3. Wait for the database to finish provisioning.
4. Open **Project Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefghijklmnop.supabase.co`)
   - **Project API keys → anon / public**

Do not copy the `service_role` key. It bypasses RLS and must stay server-side.

## 2. Create the database schema

1. Open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**.

This creates:

| Table | Purpose |
| --- | --- |
| `public.folders` | Folder names and timestamps |
| `public.notes` | Note title, HTML, flags, tags, folder and timestamps |
| `public.note_versions` | Up to 12 snapshots per note |

It also enables RLS on all three tables and adds owner-only policies using
`auth.uid()`. Re-running the file is safe.

## 3. Configure Supabase Auth

Open **Authentication → Providers → Email**:

- Keep **Enable Email provider** on.
- **Confirm email**:
  - **On** (recommended): users must click the link before signing in. The app
    shows “Check your email to confirm your account”.
  - **Off**: users are signed in immediately after registration.
- Set **Minimum password length** to at least **6** (the frontend requires 6).
- Leave **Secure email change** on.

Open **Authentication → URL Configuration**:

- **Site URL**: your production URL, for example `https://notes.example.com`.
- **Redirect URLs** (add every environment you use):
  - `https://notes.example.com`
  - `http://127.0.0.1:4174` (local preview)
  - `http://localhost:4174`
  - `http://127.0.0.1:4173` (local Express fallback, if you test Supabase there)

If these URLs are missing, confirmation and password-recovery links will
redirect to the wrong place.

Optional but recommended:

- **Authentication → Rate Limits**: keep the defaults or tighten them.
- **Authentication → Sessions**: set a sensible JWT expiry (for example 1 hour).
- **Authentication → Email Templates**: customise the confirmation email.

## 4. Configure the frontend

Edit [`assets/config.js`](assets/config.js):

```js
window.NotesConfig = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY',
  emailConfirmation: true
};
```

- `emailConfirmation` only changes documentation/UI expectations; the adapter
  detects the real state from Supabase's response.
- The file is committed on purpose. It contains no secret.
- If you leave both values empty, the app keeps using the local API
  (`npm.cmd start`).

## 5. Test locally

Build the exact production bundle:

```powershell
npm.cmd run build:static
npm.cmd run preview
```

Open <http://127.0.0.1:4174>.

The build:

- copies only `index.html` and `assets/**` into `dist/`;
- refuses to build if the Supabase URL/key is empty;
- refuses to build if the key is a `service_role` key;
- refuses to publish `*.key`, `*.db`, `.env` or similar files;
- writes security headers (including CSP) to `dist/_headers`;
- adds `robots.txt` with `Disallow: /`.

Useful commands:

```powershell
npm.cmd run build:static -- --allow-unconfigured   # preview the local fallback
npm.cmd test                                      # full test suite
```

You can also run the local Express server with a configured Supabase project:

```powershell
npm.cmd start
```

The frontend will use Supabase; the local server only serves the static files.
Its CSP now allows `https://*.supabase.co` and `wss://*.supabase.co`.

## 6. Deploy

### Netlify

1. Push the repository to GitHub/GitLab/Bitbucket (with approval).
2. In Netlify: **Add new site → Import an existing project**.
3. Build command: `npm run build:static`
4. Publish directory: `dist`
5. Deploy. `netlify.toml` already contains these settings and security headers.

The generated `dist/_headers` adds a CSP containing the exact Supabase origin.

### Vercel

1. Import the repository in Vercel.
2. Framework preset: **Other**.
3. Build command: `npm run build:static`
4. Output directory: `dist`
5. Deploy. `vercel.json` contains the build settings and headers.

### Any static host

Upload the **contents of `dist/`** (not the project root). The host must serve
`index.html` and `assets/**` over HTTPS. If the host supports custom headers,
add the CSP from `dist/_headers`; otherwise the meta CSP in `index.html` covers
standard `*.supabase.co` projects.

### Custom Supabase domain

If you use a custom domain instead of `*.supabase.co`, update:

- the meta CSP in `index.html`;
- `vercel.json` (if deploying to Vercel);
- the `connect-src` list in `scripts/build-static.js` (it adds the exact origin
  automatically, but the meta tag still needs the domain).

## 7. Migrate existing local notes

The local server and Supabase are separate stores. To move notes:

1. Start the old local version and sign in.
2. Open the account menu → **Export backup**.
3. Configure Supabase, deploy or preview the new version.
4. Create/log in to the Supabase account.
5. Use **Import backup** and select the JSON file.

The importer remaps folder IDs, preserves note timestamps, sanitises HTML and
keeps the first 12 versions only. It is not transactional: if a very large
backup fails halfway, already-inserted rows remain. Export first.

Legacy notes stored in browser Local Storage are still migrated automatically on
first sign-in, as before.

## 8. Security model

- **Accounts/passwords**: Supabase Auth. The app never sees or stores password
  hashes.
- **Authorisation**: RLS on `folders`, `notes` and `note_versions`. Every policy
  compares `user_id` to `auth.uid()`.
- **Cross-account IDs**: composite foreign keys prevent attaching a note to
  another user's folder or a version to another user's note.
- **Anon key**: public by design; it only grants what RLS allows.
- **Service role key**: never shipped to the browser. The adapter refuses to
  start if it detects a non-anon JWT role.
- **Browser storage**:
  - UI preferences: `notes:theme`, `notes:lang`, `notes:selected`, `notes:sort`,
    `notes:clocks`, `notes:spell`.
  - Auth session: `notes:supabase-auth` in `sessionStorage` by default, or in
    `localStorage` when **Keep me signed in** is checked.
  - `notes:remember` records that choice.
  - Note text, folders, history, passwords and API keys are never written to
    Local Storage.
- **Transport**: all Supabase traffic is HTTPS/WSS. Deploy the frontend over
  HTTPS.
- **At rest**: Supabase encrypts database storage, but note text is **not**
  end-to-end encrypted. Supabase project administrators can read it. This is a
  deliberate trade-off for hosted accounts and multi-device sync. If you need
  zero-knowledge notes, keep using the local encrypted backend or add
  client-side encryption before storing HTML.

## 9. Behaviour and limits

- Version history keeps the newest **12** versions per note and skips snapshots
  taken less than **90 seconds** apart unless forced.
- Import limits: **5,000 notes**, **500 folders** per backup.
- Note HTML is capped at **1,000,000 characters**; titles at 200.
- Deleted notes go to Trash until permanently deleted; empty trash is supported
  by the adapter but the current UI deletes trashed notes one by one through the
  normal sync loop.
- **Password reset UI is not included yet.** Supabase can send a recovery email
  from the dashboard, but the app has no “Forgot password?” screen. Add one
  before relying on self-service recovery, or keep a tested admin recovery
  process.
- AI and sharing remain disabled in this build.

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Supabase is not configured” during build | Fill in `assets/config.js`. |
| “Email not confirmed” on login | Confirm the email, or turn off **Confirm email** in Supabase Auth. |
| Confirmation link goes to `localhost` | Set **Site URL** and **Redirect URLs** in Supabase Auth. |
| “new row violates row-level security policy” | Run `supabase/schema.sql`; make sure you are signed in. |
| Notes load for one account but not another | Check RLS is enabled and policies exist. |
| CSP blocks Supabase | Add your project origin to `connect-src` in `index.html`, `vercel.json` and `scripts/build-static.js`. |
| “Keep me signed in” does not persist | Check the browser is not blocking storage, and that `notes:remember` is `1`. |
| Build publishes the wrong files | Only deploy `dist/`; never upload `server/`, `data/`, `test/` or `.env`. |
| Accidental `service_role` key | Remove it from `assets/config.js` immediately, rotate the key in Supabase, and redeploy. |

## 11. Production checklist

- [ ] `supabase/schema.sql` has been run.
- [ ] RLS is enabled on all three tables.
- [ ] Email confirmation decision made and email templates tested.
- [ ] Site URL and redirect URLs include the production domain.
- [ ] `assets/config.js` contains the project URL and **anon** key only.
- [ ] `npm.cmd test` passes.
- [ ] `npm.cmd run build:static` succeeds.
- [ ] `dist/` contains no `data/`, `server/`, `.env`, `*.db` or `master.key`.
- [ ] HTTPS is enforced by the host.
- [ ] Security headers/CSP are present in the deployed response.
- [ ] A real account can register, confirm, log in, create a note, reload,
      export and import.
- [ ] A second account cannot see or edit the first account's notes.
- [ ] Backups/export process is documented for users.
