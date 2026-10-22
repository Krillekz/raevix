/**
 * Private Browser — a session-only browsing shell for Raevix OS.
 *
 * Privacy model: history, typed addresses and bookmarks live in this module's
 * closure for the lifetime of the window. Nothing is written to localStorage,
 * cookies or any storage API, so closing the window wipes the session. The
 * host browser's own bookmarks are a separate, private profile and are neither
 * read nor imported here.
 */

import { escapeHtml, toast } from './ui.js';

const HOME = 'raevix://home';
const SANDBOX_BASE = 'allow-scripts allow-forms allow-popups allow-modals allow-presentation';

const STARTERS = [
  { title: 'Wikipedia', meta: 'Arcade history', url: 'https://en.wikipedia.org/wiki/Arcade_game', glyph: '📚' },
  { title: 'Project Gutenberg', meta: 'Public-domain books', url: 'https://www.gutenberg.org/', glyph: '📖' },
  { title: 'Internet Archive', meta: 'Library & emulation', url: 'https://archive.org/', glyph: '🏛️' },
  { title: 'itch.io', meta: 'HTML5 game shelf', url: 'https://itch.io/games/html5', glyph: '🎮' },
  { title: 'example.com', meta: 'Reference page', url: 'https://example.com/', glyph: '🧪' }
];

const SVG = {
  back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.6 3.4 5 8l4.6 4.6"/></svg>',
  forward: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.4 3.4 11 8l-4.6 4.6"/></svg>',
  reload: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.8"/><path d="M13.6 2.6v3.2h-3.2"/></svg>',
  home: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 7.4 8 3l5.2 4.4V13a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V7.4Z"/></svg>',
  shield: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 13 4v4.2c0 2.7-2.1 4.6-5 5.6-2.9-1-5-2.9-5-5.6V4l5-1.8Z"/><path d="M6.1 8.2 7.4 9.5l2.6-2.7"/></svg>',
  star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m8 2.4 1.7 3.5 3.8.6-2.7 2.7.6 3.8L8 11.2l-3.4 1.8.6-3.8L2.5 6.5l3.8-.6L8 2.4Z"/></svg>',
  external: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 2.6h4v4"/><path d="M13.4 2.6 7.4 8.6"/><path d="M12 9.6v3a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 12.6V5.4A1.4 1.4 0 0 1 3.4 4h3"/></svg>'
};

/**
 * Resolve what the user typed: home, an http(s) page, or a web search.
 * Only http(s) survives, so `javascript:` and data URLs can never reach the frame.
 */
function parseEntry(value) {
  const raw = String(value || '').trim();
  if (!raw) return { kind: 'home' };
  if (/^raevix:\/\/(home\/?)?$/i.test(raw)) return { kind: 'home' };
  // Only http(s) may load in the frame; everything else is rejected outright.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return { kind: 'invalid' };

  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    const looksLocal = /^(\.{0,2}\/)*(games|src|assets)\//i.test(candidate) || /\.html?([?#]|$)/i.test(candidate);
    candidate = looksLocal ? new URL(candidate, window.location.href).href : `https://${candidate}`;
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return { kind: 'search', query: raw };
  }

  if (!['http:', 'https:'].includes(url.protocol)) return { kind: 'search', query: raw };
  const host = url.hostname;
  const isHost = host.includes('.') || host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (!isHost) return { kind: 'search', query: raw };

  return { kind: 'page', url: url.href };
}

function sameOrigin(url) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Remote pages keep their real origin so logins and rendering behave; Raevix's
 * own pages deliberately lose it, because `allow-scripts allow-same-origin`
 * together would let them reach into the desktop shell.
 */
function sandboxFor(url) {
  return sameOrigin(url) ? SANDBOX_BASE : `${SANDBOX_BASE} allow-same-origin`;
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Render the Private Browser into a window body. */
export function mountBrowser(body, initialUrl) {
  const state = {
    history: [],
    index: -1,
    bookmarks: [],
    current: null,
    home: true
  };

  body.innerHTML = `
    <div class="browser">
      <div class="browser__nav">
        <button class="nav-btn" type="button" data-nav="back" title="Back" aria-label="Back" disabled>${SVG.back}</button>
        <button class="nav-btn" type="button" data-nav="forward" title="Forward" aria-label="Forward" disabled>${SVG.forward}</button>
        <button class="nav-btn" type="button" data-nav="reload" title="Reload" aria-label="Reload page" disabled>${SVG.reload}</button>
        <button class="nav-btn" type="button" data-nav="home" title="Start page" aria-label="Start page">${SVG.home}</button>
        <form class="browser__form" novalidate>
          <span class="browser__shield" title="Private session">${SVG.shield}</span>
          <input
            id="browserAddress"
            type="text"
            value="raevix://home"
            aria-label="Address bar"
            placeholder="Search or enter an address"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button class="browser__go" type="submit">Go</button>
        </form>
        <button class="nav-btn browser__star" type="button" data-act="bookmark" title="Pin this page for the session" aria-label="Pin this page for the session" aria-pressed="false">${SVG.star}</button>
        <button class="nav-btn" type="button" data-act="external" title="Open this page in a new browser tab" aria-label="Open this page in a new browser tab" disabled>${SVG.external}</button>
      </div>

      <p class="browser__strip">
        <span class="browser__badge">Private session</span>
        <span>History, typed addresses and pins live in memory only — closing this window wipes them.</span>
        <span class="browser__hint">Blank panel? That site blocks embedding — use the external-open button.</span>
      </p>

      <div class="browser__pins" id="browserPins" hidden></div>

      <div class="browser__viewport">
        <div class="browser__home" id="browserHome">
          <div class="browser__hero">
            <p class="eyebrow">Incognito shell</p>
            <h3>Private Browser</h3>
            <p>
              Pages render inside a sandboxed frame. This is not a network tunnel: requests still leave
              your connection directly, and sites that send <code>X-Frame-Options</code> refuse to be
              embedded at all.
            </p>
          </div>

          <div class="browser__tiles" id="browserTiles"></div>

          <div class="browser__session">
            <div>
              <p class="eyebrow">Session bookmarks</p>
              <p id="browserSessionNote">Nothing pinned yet. Pin a page with the star and it stays until this window closes.</p>
            </div>
            <button class="btn" type="button" data-act="wipe">Clear session</button>
          </div>
        </div>

        <div class="browser__loader" id="browserLoader" hidden>
          <span class="spinner"></span>
          <span>Fetching page</span>
        </div>

        <iframe
          id="browserFrame"
          title="Private browsing viewport"
          src="about:blank"
          sandbox="${SANDBOX_BASE} allow-same-origin"
          allow="fullscreen; autoplay; gamepad"
          referrerpolicy="no-referrer"
          loading="eager"
          hidden
        ></iframe>
      </div>
    </div>
  `;

  const address = body.querySelector('#browserAddress');
  const form = body.querySelector('.browser__form');
  const frame = body.querySelector('#browserFrame');
  const loader = body.querySelector('#browserLoader');
  const homeView = body.querySelector('#browserHome');
  const tilesHost = body.querySelector('#browserTiles');
  const pinsHost = body.querySelector('#browserPins');
  const sessionNote = body.querySelector('#browserSessionNote');
  const backBtn = body.querySelector('[data-nav="back"]');
  const forwardBtn = body.querySelector('[data-nav="forward"]');
  const reloadBtn = body.querySelector('[data-nav="reload"]');
  const starBtn = body.querySelector('[data-act="bookmark"]');
  const externalBtn = body.querySelector('[data-act="external"]');

  let loadTimer = 0;

  const syncChrome = () => {
    backBtn.disabled = state.index <= 0;
    forwardBtn.disabled = state.index >= state.history.length - 1;
    reloadBtn.disabled = state.home;
    externalBtn.disabled = state.home || !state.current;

    const pinned = Boolean(state.current) && state.bookmarks.some((mark) => mark.url === state.current);
    starBtn.setAttribute('aria-pressed', String(pinned));
    starBtn.title = pinned ? 'Remove this session pin' : 'Pin this page for the session';
    starBtn.setAttribute('aria-label', starBtn.title);
  };

  const renderPins = () => {
    pinsHost.hidden = state.bookmarks.length === 0;
    pinsHost.replaceChildren(...state.bookmarks.map((mark) => {
      const pin = document.createElement('span');
      pin.className = 'browser__pin';
      pin.innerHTML = `
        <button class="browser__pin-open" type="button" title="${escapeHtml(mark.url)}">${escapeHtml(mark.title)}</button>
        <button class="browser__pin-x" type="button" aria-label="Remove ${escapeHtml(mark.title)} pin" title="Remove pin">×</button>
      `;
      pin.querySelector('.browser__pin-open').addEventListener('click', () => go(mark.url));
      pin.querySelector('.browser__pin-x').addEventListener('click', () => {
        state.bookmarks = state.bookmarks.filter((entry) => entry.url !== mark.url);
        renderPins();
        syncChrome();
        updateSessionNote();
      });
      return pin;
    }));

    updateSessionNote();
  };

  const updateSessionNote = () => {
    sessionNote.textContent = state.bookmarks.length
      ? `${state.bookmarks.length} page${state.bookmarks.length === 1 ? '' : 's'} pinned for this session. They disappear when the window closes.`
      : 'Nothing pinned yet. Pin a page with the star and it stays until this window closes.';
  };

  const startLoading = () => {
    window.clearTimeout(loadTimer);
    loader.hidden = false;
    // A site that refuses framing never finishes loudly, so stop the spinner.
    loadTimer = window.setTimeout(() => {
      loader.hidden = true;
    }, 12000);
  };

  const stopLoading = () => {
    window.clearTimeout(loadTimer);
    loader.hidden = true;
  };

  const showHome = () => {
    state.home = true;
    state.current = null;
    frame.hidden = true;
    frame.src = 'about:blank';
    homeView.hidden = false;
    address.value = HOME;
    stopLoading();
    syncChrome();
  };

  const showPage = (url, { push = true } = {}) => {
    state.home = false;
    state.current = url;
    homeView.hidden = true;
    frame.hidden = false;
    frame.setAttribute('sandbox', sandboxFor(url));
    address.value = url;

    if (push) {
      state.history = state.history.slice(0, state.index + 1);
      state.history.push(url);
      state.index = state.history.length - 1;
    }

    startLoading();
    if (frame.src === url) {
      frame.src = 'about:blank';
      window.setTimeout(() => {
        if (state.current === url) frame.src = url;
      }, 40);
    } else {
      frame.src = url;
    }

    syncChrome();
  };

  const search = (query) => {
    const opened = window.open(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
    if (opened) {
      toast('Search opened in a new tab — search engines block embedding.');
    } else {
      toast('Pop-up blocked. Allow pop-ups, or type a full address.');
    }
    address.value = state.current || HOME;
  };

  const go = (value) => {
    const entry = parseEntry(value);

    if (entry.kind === 'home') {
      showHome();
      return;
    }
    if (entry.kind === 'search') {
      search(entry.query);
      return;
    }
    if (entry.kind === 'invalid') {
      toast('Only http and https addresses open in Private Browser.');
      address.value = state.current || HOME;
      return;
    }
    showPage(entry.url);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    go(address.value);
  });

  body.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      switch (button.dataset.nav) {
        case 'back':
          if (state.index > 0) {
            state.index -= 1;
            showPage(state.history[state.index], { push: false });
          }
          break;
        case 'forward':
          if (state.index < state.history.length - 1) {
            state.index += 1;
            showPage(state.history[state.index], { push: false });
          }
          break;
        case 'reload':
          if (state.current) showPage(state.current, { push: false });
          break;
        case 'home':
          showHome();
          break;
        default:
          break;
      }
    });
  });

  starBtn.addEventListener('click', () => {
    if (!state.current) {
      toast('Open a page before pinning it.');
      return;
    }

    const existing = state.bookmarks.findIndex((mark) => mark.url === state.current);
    if (existing >= 0) {
      state.bookmarks.splice(existing, 1);
      toast('Pin removed from this session.');
    } else {
      state.bookmarks.push({ url: state.current, title: hostLabel(state.current) });
      toast('Pinned for this session only.');
    }

    renderPins();
    syncChrome();
  });

  externalBtn.addEventListener('click', () => {
    if (!state.current) return;
    const opened = window.open(state.current, '_blank', 'noopener,noreferrer');
    if (!opened) toast('Pop-up blocked. Allow pop-ups to open pages externally.');
  });

  body.querySelector('[data-act="wipe"]').addEventListener('click', () => {
    state.history = [];
    state.index = -1;
    state.bookmarks = [];
    state.current = null;
    renderPins();
    showHome();
    toast('Session wiped. Nothing was stored on this device.');
  });

  tilesHost.replaceChildren(...STARTERS.map((entry) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'browser__tile';
    tile.dataset.url = entry.url;
    tile.title = entry.url;
    tile.innerHTML = `
      <span class="browser__tile-glyph" aria-hidden="true">${entry.glyph}</span>
      <span class="browser__tile-meta">
        <strong>${escapeHtml(entry.title)}</strong>
        <small>${escapeHtml(entry.meta)}</small>
      </span>
    `;
    tile.addEventListener('click', () => go(entry.url));
    return tile;
  }));

  frame.addEventListener('load', () => {
    if (frame.src === 'about:blank') return;
    window.setTimeout(stopLoading, 160);
  });

  renderPins();
  showHome();

  // Desktop shortcuts can open a specific page; otherwise focus the address bar.
  // The window manager passes the window object as a second argument, so only a string counts.
  if (typeof initialUrl === 'string' && initialUrl) {
    go(initialUrl);
  } else {
    window.setTimeout(() => address.focus({ preventScroll: true }), 120);
  }
}
