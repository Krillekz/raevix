/**
 * Games Cabinet: loads /games/games.json, renders the filterable storefront and
 * launches each title inside a sandboxed iframe window.
 */

import { openWindow } from './window-manager.js';
import { escapeHtml, toast } from './ui.js';

const DEFAULT_LIBRARY = {
  categories: ['Action', 'Retro', 'Sports', 'Strategy'],
  games: [
    { id: 'basket-hoop', title: 'Basket Hoop', category: 'Sports', glyph: '🏀', accent: '#ff6a3d', blurb: 'Timing · 1 player', url: 'games/local/basket-hoop.html' },
    { id: 'neon-breakout', title: 'Neon Breakout', category: 'Action', glyph: '🧱', accent: '#ff2f4d', blurb: 'Arcade · 1 player', url: 'games/local/neon-breakout.html' },
    { id: 'void-runner', title: 'Void Runner', category: 'Action', glyph: '🚀', accent: '#ff9b3d', blurb: 'Endless dodge · 1 player', url: 'games/local/void-runner.html' },
    { id: 'retro-snake', title: 'Retro Snake', category: 'Retro', glyph: '🐍', accent: '#46e58a', blurb: 'Classic · 1 player', url: 'games/local/retro-snake.html' },
    { id: 'neon-pong', title: 'Neon Pong', category: 'Retro', glyph: '🏓', accent: '#48c6ff', blurb: 'Versus CPU · first to 7', url: 'games/local/neon-pong.html' },
    { id: 'neon-2048', title: 'Neon 2048', category: 'Strategy', glyph: '🧩', accent: '#ffd34d', blurb: 'Puzzle · 1 player', url: 'games/local/neon-2048.html' }
  ]
};

const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-modals allow-popups';

let cache = null;

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const categories = (Array.isArray(source.categories) ? source.categories : DEFAULT_LIBRARY.categories)
    .map((category) => String(category))
    .filter((category) => category && category.toLowerCase() !== 'all');

  const fallbackCategories = categories.length ? categories : DEFAULT_LIBRARY.categories;

  const games = (Array.isArray(source.games) ? source.games : [])
    .filter((game) => game && typeof game === 'object' && game.id && game.title && game.url)
    .map((game) => ({
      id: String(game.id),
      title: String(game.title),
      category: fallbackCategories.includes(game.category) ? game.category : fallbackCategories[0],
      glyph: typeof game.glyph === 'string' && [...game.glyph].length <= 4 ? game.glyph : '🎮',
      accent: /^#[0-9a-f]{3,8}$/i.test(game.accent || '') ? game.accent : '#ff2f4d',
      blurb: typeof game.blurb === 'string' ? game.blurb : 'Arcade',
      controls: typeof game.controls === 'string' ? game.controls : '',
      web: game.web === true,
      provider: typeof game.provider === 'string' ? game.provider : '',
      url: String(game.url)
    }));

  return {
    categories: ['All', ...fallbackCategories],
    games
  };
}

/** Load the modular JSON library, falling back to the bundled copy on failure. */
export async function getLibrary() {
  if (cache) return cache;

  try {
    const response = await fetch('games/games.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const library = normalize(data);
    if (!library.games.length) throw new Error('library is empty');
    cache = library;
  } catch (error) {
    console.warn('[Raevix] games/games.json could not load, using the built-in library.', error);
    cache = normalize(DEFAULT_LIBRARY);
  }

  return cache;
}

function resolveUrl(url) {
  try {
    const resolved = new URL(url, window.location.href);
    return ['http:', 'https:', 'file:'].includes(resolved.protocol) ? resolved.href : null;
  } catch {
    return null;
  }
}

function withCacheBust(url) {
  const next = new URL(url);
  next.searchParams.set('reload', Date.now().toString(36));
  return next.href;
}

function createCard(game) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'game-card';
  card.style.setProperty('--accent', game.accent);
  card.title = game.controls ? `${game.title} — ${game.controls}` : game.title;

  card.innerHTML = `
    <span class="game-card__art">
      <span class="game-card__badge">${escapeHtml(game.category)}</span>
      ${game.web ? '<span class="game-card__live"><i></i>Live</span>' : ''}
      <span class="game-card__glyph" aria-hidden="true">${escapeHtml(game.glyph)}</span>
      <span class="game-card__play">${game.web ? 'Open' : 'Play'}</span>
    </span>
    <span class="game-card__meta">
      <strong>${escapeHtml(game.title)}</strong>
      <small>${escapeHtml(game.blurb)}</small>
    </span>
  `;

  card.addEventListener('click', () => openGame(game));
  return card;
}

/** Render the Games Cabinet into a window body. */
export function mountGamesCabinet(body) {
  body.innerHTML = `
    <div class="cabinet">
      <div class="cabinet__top">
        <div>
          <p class="eyebrow">Raevix Arcade</p>
          <h3 class="cabinet__title">Games Cabinet</h3>
          <p class="cabinet__sub" id="cabinetSub">Loading the library…</p>
        </div>
        <div class="cabinet__stat">
          <span id="cabinetCount">—</span>
          <small>titles</small>
        </div>
      </div>
      <div class="cabinet__tabs" id="cabinetTabs" role="tablist" aria-label="Game categories"></div>
      <div class="cabinet__tools">
        <label class="cabinet__search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2"/><path d="M15.2 15.2 20 20"/></svg>
          <input id="cabinetSearch" type="search" placeholder="Search the arcade" autocomplete="off" spellcheck="false" aria-label="Search games" />
        </label>
        <p class="cabinet__result" id="cabinetResult"></p>
      </div>
      <div class="cabinet__grid" id="cabinetGrid"></div>
      <p class="cabinet__empty" id="cabinetEmpty" hidden>No titles match that filter.</p>
      <div class="cabinet__more" id="cabinetMore" hidden>
        <button class="btn" id="cabinetMoreBtn" type="button">Show more games</button>
        <span class="cabinet__morehint" id="cabinetMoreHint"></span>
      </div>
    </div>
  `;

  const tabsEl = body.querySelector('#cabinetTabs');
  const gridEl = body.querySelector('#cabinetGrid');
  const countEl = body.querySelector('#cabinetCount');
  const subEl = body.querySelector('#cabinetSub');
  const searchEl = body.querySelector('#cabinetSearch');
  const resultEl = body.querySelector('#cabinetResult');
  const emptyEl = body.querySelector('#cabinetEmpty');
  const moreEl = body.querySelector('#cabinetMore');
  const moreBtn = body.querySelector('#cabinetMoreBtn');
  const moreHint = body.querySelector('#cabinetMoreHint');

  const PAGE_SIZE = 60;
  let library = null;
  let activeCategory = 'All';
  let shown = PAGE_SIZE;

  const render = ({ reset = false } = {}) => {
    if (!library) return;
    if (reset) shown = PAGE_SIZE;

    const query = searchEl.value.trim().toLowerCase();
    const visible = library.games.filter((game) => {
      const inCategory = activeCategory === 'All' || game.category === activeCategory;
      const matches = !query || `${game.title} ${game.blurb} ${game.category}`.toLowerCase().includes(query);
      return inCategory && matches;
    });

    gridEl.replaceChildren(...visible.slice(0, shown).map(createCard));
    gridEl.hidden = visible.length === 0;
    emptyEl.hidden = visible.length > 0;
    countEl.textContent = String(visible.length);
    resultEl.textContent = query
      ? `${visible.length} of ${library.games.length} titles`
      : `${visible.length} showing`;

    // A 500-title shelf is rendered a page at a time so opening stays instant.
    const remaining = visible.length - shown;
    if (moreEl) {
      moreEl.hidden = remaining <= 0;
      if (remaining > 0) {
        moreBtn.textContent = `Show ${Math.min(PAGE_SIZE, remaining)} more`;
        moreHint.textContent = `${shown} of ${visible.length} on screen`;
      }
    }

    const local = library.games.filter((game) => !game.web).length;
    const hosted = library.games.filter((game) => game.provider).length;
    const portals = library.games.filter((game) => game.web && !game.provider).length;
    subEl.textContent = `${local} built-in · ${hosted} GameMonetize · ${portals} portals · sandboxed iframe runtime`;
  };

  getLibrary()
    .then((data) => {
      library = data;

      const tabs = data.categories.map((category) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `tab${category === activeCategory ? ' is-active' : ''}`;
        tab.textContent = category;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(category === activeCategory));
        tab.addEventListener('click', () => {
          activeCategory = category;
          tabsEl.querySelectorAll('.tab').forEach((button) => {
            const selected = button === tab;
            button.classList.toggle('is-active', selected);
            button.setAttribute('aria-selected', String(selected));
          });
          render({ reset: true });
        });
        return tab;
      });

      tabsEl.replaceChildren(...tabs);
      searchEl.addEventListener('input', () => render({ reset: true }));
      moreBtn?.addEventListener('click', () => {
        shown += PAGE_SIZE;
        render();
      });
      render();
    })
    .catch((error) => {
      console.error('[Raevix] cabinet failed to load', error);
      subEl.textContent = 'The cabinet could not load its library.';
      gridEl.textContent = 'No games available right now.';
    });
}

/** Launch a single game inside a fresh sandboxed window. */
export function openGame(game) {
  const source = resolveUrl(game.url);
  if (!source) {
    toast('That game has an invalid URL.');
    return;
  }

  openWindow({
    key: `game:${game.id}`,
    title: game.title,
    icon: 'assets/icons/games-cabinet.svg',
    width: 1000,
    height: 690,
    flush: true,
    mount: (body) => {
      body.innerHTML = `
        <div class="game-shell">
          <div class="game-shell__bar">
            <span class="game-shell__tag">${escapeHtml(game.category)}</span>
            <span class="game-shell__title">${escapeHtml(game.title)}</span>
            <span class="game-shell__actions">
              <button class="icon-btn" type="button" data-act="reload" title="Reload game" aria-label="Reload game">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.8"/><path d="M13.6 2.6v3.2h-3.2"/></svg>
                <span>Reload</span>
              </button>
              <a class="icon-btn" data-act="external" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer" title="Open in a new tab">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 2.6h4v4"/><path d="M13.4 2.6 7.4 8.6"/><path d="M12 9.6v3a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 12.6V5.4A1.4 1.4 0 0 1 3.4 4h3"/></svg>
                <span>Open</span>
              </a>
            </span>
          </div>
          <div class="game-shell__frame">
            <div class="game-shell__loader"><span class="spinner"></span>Loading game</div>
            <iframe
              title="${escapeHtml(game.title)}"
              src="about:blank"
              sandbox="${SANDBOX}"
              allow="autoplay; fullscreen; gamepad"
              referrerpolicy="no-referrer"
              loading="eager"
            ></iframe>
          </div>
        </div>
      `;

      const frame = body.querySelector('iframe');
      const loader = body.querySelector('.game-shell__loader');
      const reload = body.querySelector('[data-act="reload"]');

      let loaderTimer = 0;
      const hideLoader = () => {
        window.clearTimeout(loaderTimer);
        loader.classList.add('is-hidden');
      };
      const showLoader = () => {
        loader.classList.remove('is-hidden');
        window.clearTimeout(loaderTimer);
        // Web portals can stall on analytics or blocked subresources; never keep
        // the spinner over a page that may already be interactive.
        loaderTimer = window.setTimeout(hideLoader, game.web ? 9000 : 15000);
      };

      frame.addEventListener('load', () => {
        if (frame.src !== 'about:blank') {
          window.setTimeout(hideLoader, 180);
        }
      });

      showLoader();
      frame.src = source;

      reload.addEventListener('click', () => {
        showLoader();
        frame.src = withCacheBust(source);
      });

      if (game.controls) {
        body.querySelector('.game-shell__title').title = game.controls;
      }
    }
  });
}
