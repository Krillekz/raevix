# Raevix OS — Unblocked Arcade Desktop

A futuristic, fully responsive **single-page desktop environment** for the browser. Raevix boots into a neon workspace with draggable, snappable windows, a Start menu, a command palette, a session-only private browser, and a Games Cabinet that mixes six original HTML5 titles with six live web-game portals. Seven built-in apps — Notes, Calculator, Terminal, Paint, Music, Clock & Timers and Task Manager — make it a usable little operating system rather than a demo. Accent colour, wallpaper and effects are yours to change. Everything is static — no framework, no build step, no backend, no tracking.

**Live:** <https://krillekz.github.io/raevix/>

> **Credits:** Raevik

---

## Highlights

- **Raevix desktop shell** — neon wallpaper, glassy shortcut icons, scanline overlay and a brand HUD.
- **Real window manager** — title bar with app icon, minimize / maximize / close, drag anywhere via the title bar, z-index focus stacking, taskbar chips, double-click title bar to maximize.
- **Command palette** — `Ctrl + Shift + K` (or the magnifier beside Start) opens a fuzzy search over every app, arcade title, accent, wallpaper and shell action. Arrow keys navigate, Enter runs.
- **Window snapping and session restore** — drag a window to the left or right edge for half the screen, or to the top to maximise. `Ctrl + Alt + arrows` do the same from the keyboard. Open windows reopen after a reload.
- **Lock screen, context menu and shortcut sheet** — `Ctrl + Shift + L` locks the desktop behind a blurred overlay. Right-click the wallpaper for a quick menu, and `Ctrl + /` lists every shortcut.
- **Seven new apps** — Notes, Calculator, Terminal, Paint, Music, Clock & Timers and Task Manager. All offline, all keyboard friendly, all living in real windows.
- **Interface sounds** — short synthesised cues for launches, errors and timer alarms, switchable in Settings.
- **Start menu** — animated drawer with live app search (Enter opens the first result), a master grid of every app **and** every game, a profile slot and a two-step **system reset** switch.
- **Taskbar** — centered Start trigger, open-window chips on the left, and an auto-updating 12-hour clock (24-hour optional in Settings).
- **Private Browser** — an incognito-style shell with an address bar, back / forward / reload / home, session-only pins and a one-click session wipe. History and bookmarks live in memory; nothing is written to storage.
- **Games Cabinet** — searchable, filterable storefront (All / Action / Retro / Sports / Strategy / Web Arcade) with 12 titles: six original games plus six live portals wired from the desktop shortcuts. Each launches in its own sandboxed iframe window with reload + open-standalone controls.
- **Proxy Mock** — an honest, clearly labelled mock browser shell with a working address bar and quick links. It does not tunnel traffic; the panel explains how to attach a real server-side proxy.
- **Customization** — six accent presets plus a full colour picker, six wallpapers, neon glow, scanline overlay, motion, sounds, clock and session preferences. Everything is saved and re-applied on boot.
- **Working terminal** — `raevix-sh` opens apps and games, writes notes, evaluates maths, switches accent or wallpaper, inspects windows, locks the session and prints a `neofetch`. Tab completion and command history included.
- **Animated anime backdrops** — original **Sakura Idol** and **Neon Ronin** character scenes with floating figures, drifting petals or embers, and pulsing halos. No third-party artwork is bundled.
- **Settings & Trash** — a visual appearance editor with live previews, instant reset, and an empty-state recycle bin.
- **LunarX shortcut** — a dedicated desktop and Start-menu entry. LunarX refuses framing and uses a Cloudflare check, so the shortcut opens it in a real browser tab instead of a blank iframe.
- **Reference shortcuts** — Wikipedia and Internet Archive open directly inside a Private Browser window on the chosen page, and a **Quick Guide** window summarises the shell, theming, browser and arcade in one place.
- **Accessible & responsive** — keyboard-openable shortcuts, themed focus rings, Escape-to-close menus, and a full-width layout down to small phones.
- **6 built-in games** — Basket Hoop, Neon Breakout, Void Runner, Retro Snake, Neon Pong and Neon 2048. Canvas/DOM games with keyboard, mouse and touch input plus local high scores.
- **6 web portals** — Aura Unblocked, Games Unblocked Play, Web Dashers, Sakura OS, UnblockedGames by Ula and Uncle's Unblocked. All six were checked for framing headers and open inside a sandboxed window.

---

## Project structure

```
Raevix/
├─ index.html                 # Desktop shell markup
├─ README.md                  # This file
├─ deploy.bat                 # Windows one-click GitHub Pages pipeline
├─ .nojekyll                  # Tells GitHub Pages to serve files verbatim
├─ src/
│  ├─ css/
│  │  ├─ theme.css            # Design tokens, boot screen, desktop, icons, toasts
│  │  ├─ windows.css          # Window chrome, taskbar, Start menu, core apps
│  │  └─ apps.css             # v2 apps, command palette, lock screen, context menu
│  └─ js/
│     ├─ main.js              # Entry point: boot, clock, app startup
│     ├─ window-manager.js    # Draggable + snappable windows, focus, cleanup hooks
│     ├─ shell.js             # Shortcuts, palette wiring, lock, context menu, session
│     ├─ command-palette.js   # Fuzzy search across apps, games and actions
│     ├─ desktop.js           # Desktop shortcuts and selection
│     ├─ start-menu.js        # Start drawer, search and reset switch
│     ├─ games.js             # Library loader, Games Cabinet, iframe launcher
│     ├─ browser.js           # Session-only Private Browser app
│     ├─ guide.js             # Quick Guide help window
│     ├─ apps.js              # App registry, Settings, Proxy Mock, Trash
│     ├─ notes.js             # Persistent notebook
│     ├─ calculator.js        # Calculator UI, tape and keyboard input
│     ├─ calc-engine.js       # Safe expression parser shared with the terminal
│     ├─ terminal.js          # raevix-sh command line
│     ├─ paint.js             # Canvas sketching and PNG export
│     ├─ music.js             # WebAudio chiptune sequencer
│     ├─ clock.js             # Clock, world zones, stopwatch, countdown
│     ├─ taskmanager.js       # Live metrics and window control
│     ├─ sound.js             # Interface sound synthesis
│     ├─ settings.js          # Persisted preferences
│     └─ ui.js                # Toast + confirm dialog helpers
├─ assets/
│  ├─ wallpaper-raevix.svg    # Neon desktop wallpaper
│  ├─ anime-idol.svg          # Original animated Sakura Idol wallpaper
│  ├─ anime-ronin.svg         # Original animated Neon Ronin wallpaper
│  ├─ avatar.svg              # Start menu profile graphic
│  └─ icons/                  # Shortcut, Start and app icons
└─ games/
   ├─ games.json              # 12-title library: 6 local games + 6 web portals
   └─ local/                  # Six self-contained HTML5 games
      ├─ shared.css
      ├─ basket-hoop.html
      ├─ neon-breakout.html
      ├─ void-runner.html
      ├─ retro-snake.html
      ├─ neon-pong.html
      └─ neon-2048.html
```

No npm install, no bundler, no server code. The whole site is plain HTML, CSS and ES modules.

---

## Run it locally

ES modules and `fetch()` for `games/games.json` need an HTTP origin, so **do not open `index.html` by double-clicking it** — most browsers block module/fetch loading from `file://`.

Use any static server:

```bat
:: Python 3 (already installed on most machines)
cd C:\Users\pknet\Desktop\Raevix
python -m http.server 5173
```

```bat
:: or Node.js
npx serve . -l 5173
```

Then open <http://localhost:5173>.

### Controls

| Action | How |
| --- | --- |
| Open a desktop app | Double-click its icon (single tap on touch) |
| Move a window | Drag its title bar |
| Focus a window | Click it — it rises to the top of the stack |
| Minimize / maximize / close | The three title-bar controls |
| Restore a minimized window | Click its taskbar chip |
| Snap a window | Drag it to the left/right edge or the top, or press `Ctrl + Alt + ←/→/↑` |
| Open the Start menu | The centered **Start** button |
| Command palette | `Ctrl + Shift + K`, or the magnifier beside Start |
| Search everything | Type in the Start menu search or the palette |
| Lock the desktop | `Ctrl + Shift + L`; press Enter or click Unlock |
| Show the desktop | `Ctrl + Alt + D` (run again to restore) |
| Cycle windows | `` Ctrl + ` `` |
| Shortcut reference | `Ctrl + /` |
| Desktop context menu | Right-click the wallpaper |
| Reset the shell | Start menu → **System reset** switch → confirm |
| Change the look | Desktop → **Settings** → Accent / Wallpaper |
| Filter the arcade | Games Cabinet → category tabs or the search field |

---

## Adding or swapping games

The cabinet is driven by [`games/games.json`](games/games.json), so you never have to touch the app code:

```json
{
  "id": "my-game",
  "title": "My Game",
  "category": "Action",
  "glyph": "🕹️",
  "accent": "#ff2f4d",
  "blurb": "Arcade · 1 player",
  "controls": "Arrows to move",
  "url": "games/local/my-game.html"
}
```

1. Drop your HTML5 build into `games/local/` (or point `url` at any `https://` embed).
2. Add an entry to the `games` array in `games.json`.
3. `category` must match one of the categories listed at the top of the file, otherwise it falls back to the first one.
4. Reload the page — the Start menu and Games Cabinet pick it up automatically.

A **web portal** is the same entry with `"web": true`. It gets a LIVE badge, an **Open** label and a longer loader grace period:

```json
{
  "id": "my-portal",
  "title": "My Portal",
  "category": "Web Arcade",
  "web": true,
  "glyph": "🌐",
  "accent": "#3ad8ff",
  "blurb": "Web portal · instant play",
  "url": "https://example.github.io/games/"
}
```

Only embed pages whose operators permit framing. GitHub Pages serves no `X-Frame-Options` by default, so the bundled portals work; a site can change that at any time.

Each game is rendered inside a sandboxed iframe:

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-modals allow-popups"
        allow="autoplay; fullscreen; gamepad" referrerpolicy="no-referrer"></iframe>
```

**Why original games plus portals, instead of individual titles from big portals?** Popular portals such as CrazyGames and Poki serve their game pages with `X-Frame-Options: SAMEORIGIN`, so those pages cannot be framed from another domain. The Web Arcade entries here are GitHub Pages portals that do permit framing; each opens as a live page inside its own window. If you find a specific embeddable game page, add its URL to `games.json` the same way. Only embed content you have the right to distribute.

### Adding an app

Apps live in the registry at the top of [`src/js/apps.js`](src/js/apps.js). Add an entry with `title`, `meta`, `icon`, `width`, `height` and a `mount(body)` function, then add a shortcut object to `SHORTCUTS` in [`src/js/desktop.js`](src/js/desktop.js). The Start menu is generated from the registry, so it updates automatically. An entry with `external: 'https://…'` opens in a new tab instead of a window, and a browser-backed shortcut can mount `(body) => mountBrowser(body, 'https://example.com/')`.

---

## Customizing Raevix

Open **Settings** from the desktop or Start menu. Changes apply immediately and survive reloads.

| Control | What it does |
| --- | --- |
| **Accent** | Six presets (Crimson, Ember, Sakura, Violet, Cyan, Lime) plus a custom colour picker. Recolours highlights, window lines, taskbar, glow, wallpaper accents and app chrome. |
| **Wallpaper** | Nebula (the signature red artwork), Aurora (accent-lit gradients), Grid (synthwave horizon), Void (minimal dark), Sakura Idol or Neon Ronin. The last two are animated character scenes. |
| **Neon glow** | Light bloom on branding and icons. |
| **Motion effects** | Window and menu animations. |
| **Scanline overlay** | The CRT texture across the desktop. |
| **24-hour clock** | Switches the taskbar clock format. |
| **Desktop hint** | The launch hint above the taskbar. |
| **Interface sounds** | Synthesised launch, error, lock and timer cues. |
| **Restore windows** | Reopens the apps and games that were open when you reload. |

Preferences live under the `raevix.settings.v1` localStorage key. **Reset all preferences** restores the defaults without touching game high scores; Start menu → **System reset** also clears them and reboots the shell. Settings also has buttons for the shortcut sheet and this guide.

---

## Built-in apps

| App | What it does |
| --- | --- |
| **Notes** | Local notebook with a searchable list, pinning, autosave, word count and `.txt` export. Notes survive reloads and are also reachable with the terminal's `note` command. |
| **Calculator** | Expression calculator with a persistent tape, live preview, keyboard input, brackets, powers, roots, π and functions. The parser is shared with the terminal. |
| **Terminal** | A real command line over the desktop: `help`, `apps`, `games`, `play`, `open`, `web`, `wiki`, `note`, `calc`, `accent`, `wallpaper`, `set`, `session`, `close`, `lock`, `palette`, `shortcuts`, `neofetch`, `uptime`, `reboot` and more. Tab completes, ↑ recalls history. |
| **Paint** | Neon canvas sketching with brush/eraser, size slider, palette plus custom colour, 12-step local undo, clear and PNG export. `B`, `E` and `Ctrl+Z` work while the window is focused. |
| **Music** | Three original WebAudio chiptune loops (Neon Skyline, Sakura Circuit, Midnight Ronin) with play/pause, next/previous, volume and a live spectrum. Nothing is streamed or sampled. |
| **Clock & Timers** | Analog and digital local clock, four world zones, a stopwatch with laps, and a countdown timer with presets and a synthesised alarm. |
| **Task Manager** | Measures real frame rate, JS heap (where exposed), localStorage usage, uptime and DOM size, and can focus, minimise, maximise or close every open window. |

Local keys used by the new apps: `raevix.notes.v1`, `raevix.calc.history.v1`, `raevix.music.volume` and `raevix.session.v1` (the restore list). All are device-local and can be cleared with **Reset all preferences** or the Start-menu reset.

### Animated anime backdrops

**Sakura Idol** and **Neon Ronin** are drawn in-house as SVG illustrations, then animated with CSS: a slow float, breathing halo, tail or scarf sway inside the artwork, and drifting petals or rising embers. They use no external assets, so they work offline and do not depend on anyone else's copyright. The **Motion effects** switch and the OS reduced-motion setting freeze all of it.

### LunarX shortcut

The desktop **LunarX** icon (and its Start-menu entry) points at <https://lunarx.to/>. It opens in a new tab by design: the site sends `X-Frame-Options: SAMEORIGIN` and a Cloudflare challenge, so it can never render inside an iframe. If your browser blocks the tab, allow pop-ups for Raevix and launch it again.

### Reference shortcuts

**Wikipedia** and **Internet Archive** are desktop and Start-menu shortcuts that skip the start page: each opens its own Private Browser window already on the page. Both were checked for framing headers (`X-Frame-Options` and CSP `frame-ancestors`), so they render inside the sandboxed viewport. They still share nothing — history, pins and the wipe button stay per window.

`mountBrowser(body, initialUrl)` accepts an optional starting address, which is all the shortcut needs:

## Private Browser

The **Private Browser** app (desktop shortcut or Start menu) is a session-only browsing shell:

- **Address bar** accepts full `https://` URLs, bare domains (`wikipedia.org`), relative project paths (`games/local/neon-pong.html`) or a search phrase. Anything that is not http(s) — `javascript:`, `data:`, `file:` — is rejected.
- **Back / forward / reload / home** work over an in-memory history stack.
- **Star** pins the current page for the session. Pins appear in a strip under the toolbar and disappear when the window closes.
- **Clear session** on the start page wipes history and pins immediately.
- Pages render in a **sandboxed iframe**. Raevix's own pages never receive `allow-same-origin`, so they cannot reach into the desktop shell.
- **Remote pages still load from your own connection.** This is not a proxy or tunnel; it is browser UI plus memory-only state, so your network provider sees exactly what it would see in a normal tab.

### Your host browser's bookmarks

Raevix cannot read, import or display the bookmarks saved in Chrome, Edge, Firefox or Safari. A static web page has no API for another browser profile's bookmarks, and the app never touches files outside its own folder. Pins in Private Browser are a separate, session-only list you create yourself; nothing is read or imported automatically.

### Sites that refuse to be embedded

Many popular sites send `X-Frame-Options: DENY/SAMEORIGIN` or CSP `frame-ancestors`, so the panel stays blank. Raevix warns about this in the toolbar and offers an external-open button. The start-page tiles were checked against those headers: Wikipedia, Project Gutenberg, the Internet Archive, itch.io and example.com allow framing; sites such as MDN and OpenStreetMap do not.

---

## Deploy to GitHub Pages

This repository is published from the `main` branch at <https://krillekz.github.io/raevix/>. Every push to `main` rebuilds the site.

### Fast route — `deploy.bat`

Double-click [`deploy.bat`](deploy.bat) (or run it from a terminal in this folder). The script:

1. Checks that Git is installed and initializes a repository on `main` if one does not exist.
2. Runs `git add .` and commits `feat: initial release of Raevix OS portal` when there is something new.
3. Uses the **GitHub CLI** (`gh`) when it is installed and signed in to create the public repo `raevix`, link `origin` and push.
4. Falls back to the manual flow if `gh` is missing — it opens <https://github.com/new>, asks for your username and pushes to the repo you create.
5. Tries to enable Pages from the CLI, then opens your repository's **Settings → Pages** page.
6. Prints the live URL.

Want the CLI route? Install it once:

```bat
winget install --id GitHub.cli
gh auth login
```

### Manual route

```bat
cd C:\Users\pknet\Desktop\Raevix
git init -b main
git add .
git commit -m "feat: initial release of Raevix OS portal"
```

Create a **public** repository named `raevix` (no README/gitignore) at <https://github.com/new>, then:

```bat
git remote add origin https://github.com/<YOUR-USERNAME>/raevix.git
git push -u origin main
```

### Turn on Pages — the exact clicks

1. Open your repository on GitHub.
2. Go to **Settings** (top tab bar).
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Under **Branch**, select **`main`** and keep the folder as **`/ (root)`**.
6. Click **Save**.
7. Wait 1–2 minutes for the first build. The green banner and the URL appear at the top of the Pages section.

Your site is live at:

```
https://<YOUR-USERNAME>.github.io/raevix/
```

Because every path in this project is relative, Raevix works from a `github.io/<repo>/` sub-path with no configuration. The included `.nojekyll` file stops GitHub from running Jekyll and lets files be served exactly as written.

### Updating the live site

```bat
git add .
git commit -m "content: update the games cabinet"
git push
```

GitHub Pages rebuilds automatically on every push to `main`.

### Custom domain (optional)

1. Buy/own a domain and add this DNS record at your registrar:
   `CNAME  www  →  <YOUR-USERNAME>.github.io`
2. In **Settings → Pages → Custom domain**, enter your domain and save.
3. Tick **Enforce HTTPS** once GitHub issues the certificate.

---

## Notes & troubleshooting

| Symptom | Fix |
| --- | --- |
| Blank page opened via `file://` | Serve over HTTP (`python -m http.server 5173`). ES modules and `fetch` are blocked on `file://`. |
| A game window stays black | Check the browser console. External embeds can be blocked by `X-Frame-Options` / CSP — use an embeddable source or a local file. |
| Private Browser panel is blank | That site forbids framing (`X-Frame-Options` / CSP). Use the external-open button; no code change can override the site's header. |
| Bookmarks are missing from Private Browser | Working as designed: it cannot read another browser profile's bookmarks. Pin pages yourself, for the session only. |
| Fonts look plain | Google Fonts (`Inter`, `Orbitron`) fail offline; the system font fallback keeps the UI usable. |
| Pages returns 404 | Confirm the branch is `main`, the folder is `/ (root)`, and `index.html` is at the repository root. |
| Preferences seem stuck | Start menu → **System reset**, or clear `raevix.*` keys in localStorage. |
| Palette shortcut does nothing | Chrome reserves `Ctrl+K` for the address bar. Use `Ctrl+Shift+K` or the magnifier beside Start. |
| Music is silent | Browsers only start audio after a click; press play inside the Music window. |
| Unwanted windows reopen | Turn off **Restore windows** in Settings → Session. |
| A web portal is blank | The portal can change its framing policy or go offline. Use the window's **Open** button, or remove its entry from `games.json`. |
| LunarX did not open | It opens in a new tab and needs pop-ups allowed for Raevix. It cannot be embedded because of `X-Frame-Options` and Cloudflare. |
| Game high scores | Stored per game in `localStorage` under `raevix.<game>.best`. |

Raevix stores UI preferences, the window-restore list, notes, the calculator tape, music volume and game high scores locally in the browser. Private Browser history and pins stay in memory and are never written to storage. No analytics, no network requests other than Google Fonts and any page you open in the browser.

---

## Credits

Designed and built as the **Raevix** portal — v2.0.

**Credits to Raevik.**

Built for GitHub Pages. Runs in any modern browser, no install required.
