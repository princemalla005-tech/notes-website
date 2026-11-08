# Notes

A private, Google-Docs-style notebook that runs entirely in your browser. No account, no server — everything is saved on this computer. Writing and organising work completely offline; the optional AI assistant needs an internet connection.

Open **`index.html`** in Chrome (or use the **Notes** shortcut on the Desktop).

## Features

- **Rich text editor** — headings, bold, italic, underline, strikethrough, lists, alignment, links, text and highlight colours, quotes, code blocks, tables and dividers.
- **Autosave** — changes are written to browser storage about half a second after you stop typing. `Ctrl+S` saves immediately.
- **Folders** — create, rename and delete folders; move notes with the folder dropdown or drag a note onto a folder in the sidebar.
- **Starred** — star important notes and find them in the Starred view.
- **Pinned notes** — pin a note from the ⋮ menu to keep it at the top of every list.
- **Tags** — add up to 12 tags per note from ⋮ → Edit tags. Tags appear in the sidebar and filter the note list when clicked.
- **Archive** — move notes out of the way without deleting them. Unarchive at any time from the Archive view.
- **Sorting** — sort by last edited, date created, title A–Z or title Z–A. Pinned notes always stay first.
- **Templates** — start from meeting notes, to-do lists, journals, project plans, weekly reviews, brainstorms or reading notes.
- **Daily note** — one click opens today's note, created automatically and tagged `daily`.
- **Version history** — versions are saved automatically as you edit, and you can save or restore one from ⋮ → Version history.
- **Focus mode** — hides the sidebar and list so only the page remains. Press `Esc` or the floating button to leave.
- **Command palette** — press `Ctrl+K` outside the editor (or `Ctrl+Shift+P` anywhere) to search notes and run actions.
- **Search** — searches note titles, body text and tags as you type.
- **Trash** — deleting a note moves it to Trash, where it can be restored or deleted forever. "Empty trash" clears everything at once.
- **Duplicate** — make a copy of a note from the ⋮ menu.
- **Export** — download a single note as HTML or plain text, or back up every note and folder as a JSON file.
- **Sharing** — a Google-Docs-style Share dialog: copy a read-only link, let people save their own copy, password-protect the link (AES-256), email it, or download a standalone file that opens anywhere. See [Sharing a note](#sharing-a-note).
- **Import** — restore a JSON backup. Imported HTML is sanitised, so scripts and event handlers are stripped.
- **Print** — `Ctrl+P` or ⋮ → Print prints just the document, without the app chrome.
- **Dark mode** — toggle at the bottom of the sidebar; the choice is remembered.
- **Interface language** — pick from 99 languages in a searchable list. Twelve major languages (English, Spanish, French, German, Portuguese, Italian, Dutch, Russian, Arabic, Hindi, Chinese and Japanese) are fully translated; the rest fall back to English for now. Arabic, Hebrew, Urdu and Persian switch the whole layout to right-to-left. Your notes are never translated or changed. The choice is remembered.
- **Reading time** — the editor subline shows an estimated read time alongside the word count.
- **World Clock & Timer** — a live local clock in the sidebar plus a world clock for any country, with quick-add cities and a countdown timer with presets, an animated progress ring and a finish celebration. See [World Clock & Timer](#world-clock--timer).
- **Responsive** — three-pane layout on desktop, collapsible sidebar on tablets, and a list/editor flow on phones.
- **Animations** — an animated opening screen, staggered app reveal, hover/click feedback, note-list and page transitions, modal pop with staggered rows, drawer slide, streaming caret, typing dots, ripple buttons, star pop, save flash, animated clock hands, timer ring sweep and confetti. The editor also has a pointer-following spotlight. All of it respects your system's reduced-motion setting.

## Interface language

Click **Language** at the bottom of the sidebar to open the picker. It lists every language by its native name and English name, and the search box filters by either one (or by language code).

- A filled dot marks a language with a complete interface translation. Twelve are fully translated: English, Español, Français, Deutsch, Português, Italiano, Nederlands, Русский, العربية, हिन्दी, 简体中文 and 日本語.
- Other languages can be selected too; they show an **English only for now** note and keep the English interface.
- Arabic, Hebrew, Urdu and Persian mirror the entire layout (sidebar, note list, editor toolbar, AI drawer, dialogs and toasts) and align text right-to-left.
- Only the interface changes. Note titles, bodies, folders, tags and AI replies are left exactly as written.
- The selection is saved under `notes:lang` and applied the next time you open Notes.

## Opening screen

When you launch Notes, an animated cover screen appears first:

- **Click me to open Notes** (or press `Enter`, or click anywhere on the cover) opens the notebook and asks the browser to go **full screen**, so Notes fills the display.
- **Open in a window instead** opens Notes at normal window size without requesting full screen.
- The cover shows how many notes you have and hides itself instantly for shared links, so recipients go straight to the note.
- With **reduced motion** enabled, the cover still opens the app but skips the animated background and reveal; full screen is still requested.

Browsers only allow full screen after a real click or key press, so the request happens on that interaction. If the browser declines it, Notes simply opens in the current window.

## Sharing a note

Press **Share** in the editor header to open the share dialog.

### General access

| Setting | What the recipient gets |
| --- | --- |
| **Viewer** | Opens the note read-only. No way to save it from the viewer. |
| **Can save a copy** | Read-only view plus a **Save a copy** button that adds the note to their own Notes. |
| **Password protected** | The link is encrypted with AES-256. The recipient must type the password before the note is decoded. |

The access choice is remembered the next time you open the dialog. Password mode is not remembered — set it again when you need it.

### Ways to send it

- **Copy link** — the whole note is compressed into the link itself. No server, no upload.
- **Email link** — opens your email app with the link prefilled. Nothing is sent automatically.
- **Share…** — uses the Windows share sheet (Chrome/Edge) and can attach the standalone file.
- **Download shareable file** — a single self-contained `.html` file with the note, styling and a **Save a copy to Notes** button (in *can save a copy* mode). This is the best option for other people.

### What a shared link can and cannot do

There is no cloud account behind Notes, so links are not like Google Docs links:

- A link is a `file:///…/index.html#share=…` address. It opens on **this PC**, or on any PC that has this Notes folder at the same path.
- The note content lives **inside the link**. Editing the original afterwards does not update a link you already sent — create a new link to share the latest version.
- For anyone else, send the **shareable `.html` file** instead. It needs no app and opens in any browser.
- Password-protected links are genuinely encrypted in the browser; the password is never part of the link. Send the password through a different channel.
- Shared links render through the same HTML sanitiser as imported notes, so scripts and event handlers cannot run.

When someone opens a shared link, the app shows a read-only viewer with **Save a copy** (if allowed) and **Open Notes**. Opening the link in a tab that already has Notes running works too — the viewer appears without a reload.

## AI assistant

Open it with the **AI** button in the editor header, **Create with AI** in the sidebar, or `Ctrl+J`. The AI is powered by your own OpenAI API key and streams answers into the app.

What it can do:

| Action | What happens |
| --- | --- |
| **Summarise** | 2–4 sentence summary plus key points |
| **Key points** | Tight bullet list of the important ideas |
| **Improve** | Rewrites selected text (or the whole note) to be clearer and better structured |
| **Fix grammar** | Corrects spelling, grammar and punctuation with minimal rewording |
| **Continue** | Writes the next part in the note's own style |
| **Translate** | Translates into the language chosen next to the button |
| **Ask AI** | Chat about the current note, with the note as context |
| **Create with AI** | Generates a formatted note from a prompt, with type, tone and length options |

AI answers appear as rich HTML. Every answer has **Copy**, and depending on the action also **Replace selection**, **Replace note**, **Append to note**, **Insert at cursor**, or **Regenerate**. Most inserts use the browser's undo stack, so `Ctrl+Z` usually works.

### Setting up the key

1. Click **AI** → the sliders icon (or **Connect OpenAI**).
2. Paste an OpenAI API key from <https://platform.openai.com/api-keys>.
3. Pick a model (e.g. `gpt-4o-mini` for speed/cost, `gpt-4o` for quality) or press **Load models** to list what your key can use.
4. Leave the Base URL as `https://api.openai.com/v1` unless you use an OpenAI-compatible service.
5. Press **Test connection**, then **Save**.

The key is sent directly from this page to the API — no middle server. It is stored in this browser's localStorage so you don't have to paste it every time.

> **Security:** localStorage on a local `file://` page can be read by other local HTML files opened in the same browser profile. Use a key you can revoke, set a spending limit in your OpenAI account, and never share this folder while a key is saved. To remove the key, open AI settings and press **Disconnect** (or clear this page's site data).

If you use a different OpenAI-compatible API, change the **Base URL** and model. CORS must be enabled by that provider.

## World Clock & Timer

Click the **live clock** at the bottom of the sidebar (or the clock button) to open **World Clock & Timer**.

- **Local time** — the analog and digital clocks at the top tick every second.
- **World Clock** — quick-add **New York, London, Paris, Dubai, Mumbai, Tokyo, Sydney** or **Los Angeles**, or type any city and choose any timezone. Each row shows the live time, the local date, the UTC offset and a sun/moon icon for day or night.
- **Timer** — choose a preset (**1, 5, 10 or 25 minutes**) or type hours/minutes/seconds, then **Start**. The ring shows the remaining time, **Pause** freezes it and **Reset** clears it. When it reaches zero the ring celebrates and a short confetti burst plays.
- Your cities are remembered in this browser (`notes:clocks`). Everything runs locally — no internet needed.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Bold / italic / underline |
| `Ctrl+K` | Insert a link inside the editor; outside it, open Quick actions |
| `Ctrl+Shift+P` | Open Quick actions from anywhere |
| `Ctrl+S` | Save now |
| `Ctrl+J` | Open / close the AI assistant |
| `Ctrl+Alt+N` | Create a note with AI |
| `Alt+N` | New note |
| `Ctrl+Shift+D` | Open today's note |
| `Ctrl+Shift+F` | Toggle focus mode |
| `Ctrl+Shift+T` | Open World Clock & Timer |
| `/` | Jump to search |
| `?` | Show the keyboard shortcuts sheet |
| `Ctrl+P` | Print the current note |
| `Esc` | Exit focus mode and close menus / sidebar / AI drawer / dialogs |

In Quick actions, type to search commands and notes, use `↑` / `↓` to move and `Enter` to run the selected item.

## Where your notes are stored

Notes live in this browser's **localStorage**, under these keys:

| Key | Contents |
| --- | --- |
| `notes:docs` | Array of notes: `{ id, title, html, folderId, starred, trashed, pinned, archived, tags, daily, createdAt, updatedAt }` |
| `notes:folders` | Array of folders: `{ id, name }` |
| `notes:selected` | The last opened note ID |
| `notes:theme` | `light` or `dark` |
| `notes:lang` | Interface language code (for example `en`, `es`, `ar`) |
| `notes:sort` | Last list sort: `updated`, `created`, `title` or `title-desc` |
| `notes:history` | Saved note versions, grouped by note ID (up to 12 per note) |
| `notes:shareAccess` | Last share permission (`link` or `copy`) |
| `notes:clocks` | Saved world-clock cities: `{ id, city, tz }` |
| `notes:spell` | Whether spell check was left on |
| `notes:ai` | AI settings: `{ key, baseUrl, model, temperature }` |

Because storage belongs to the browser, notes are **not** files on disk. They stay available as long as you use the same browser and don't clear its site data. To be safe:

1. Click **Export backup** in the sidebar now and then.
2. Keep the downloaded `notes-backup-YYYY-MM-DD.json` somewhere safe.
3. Use **Import backup** to restore it — on this computer or another one.

> Clearing browsing data / "cookies and site data" for this page will erase your notes and the saved API key. Export a backup first.

## Files

```
notes/
├─ index.html          app shell, AI drawer, clock/timer, palette and dialogs
├─ README.md           this file
└─ assets/
   ├─ app.js           storage, editor, folders, trash, tags, archive, templates, history, palette, import/export, AI client, clock/timer
   ├─ i18n.js          language list, 11 full interface dictionaries, plural rules and the translation helper
   ├─ styles.css       layout, themes, tags, palette, templates, focus mode, AI UI, clock/timer, language picker, RTL, animations, responsive and print styles
   └─ icon.svg         favicon and app icon
```

No build step, no dependencies. Edit the files directly and reload the page.
