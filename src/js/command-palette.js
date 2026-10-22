/** Command palette: one search box for apps, games and desktop actions. */

import { getAppList, openApp } from './apps.js';
import { getLibrary, openGame } from './games.js';
import {
  ACCENTS,
  WALLPAPERS,
  getSettings,
  saveSettings
} from './settings.js';
import { escapeHtml, toast } from './ui.js';

let palette = null;
let input = null;
let listHost = null;
let empty = null;
let items = [];
let flat = [];
let active = 0;
let shellActions = {};
let gamesLoaded = false;

function score(text, query) {
  if (!query) return 1;
  const haystack = text.toLowerCase();
  const direct = haystack.indexOf(query);
  if (direct >= 0) return 1000 - direct;

  let cursor = 0;
  let gaps = 0;
  for (const char of query) {
    const found = haystack.indexOf(char, cursor);
    if (found < 0) return -1;
    gaps += found - cursor;
    cursor = found + 1;
  }
  return 500 - gaps;
}

function buildStaticItems() {
  const settings = getSettings();

  const actions = [
    {
      title: 'Lock desktop',
      meta: shellActions.lockHint || 'Ctrl + Shift + L',
      icon: 'assets/icons/private-browser.svg',
      group: 'Actions',
      run: () => shellActions.lock?.()
    },
    {
      title: 'Show desktop',
      meta: 'Minimise every window',
      icon: 'assets/icons/start.svg',
      group: 'Actions',
      run: () => shellActions.showDesktop?.()
    },
    {
      title: 'Keyboard shortcuts',
      meta: 'Ctrl + /',
      icon: 'assets/icons/guide.svg',
      group: 'Actions',
      run: () => shellActions.shortcuts?.()
    },
    {
      title: 'Open Settings',
      meta: 'Accent, wallpaper and effects',
      icon: 'assets/icons/settings.svg',
      group: 'Actions',
      run: () => openApp('settings')
    },
    {
      title: 'New note',
      meta: 'Notes',
      icon: 'assets/icons/notes.svg',
      group: 'Actions',
      run: () => openApp('notes')
    },
    {
      title: 'Open terminal',
      meta: 'Command line',
      icon: 'assets/icons/terminal.svg',
      group: 'Actions',
      run: () => openApp('terminal')
    },
    {
      title: `${settings.glow ? 'Disable' : 'Enable'} neon glow`,
      meta: 'Appearance',
      icon: 'assets/icons/settings.svg',
      group: 'Actions',
      run: () => {
        saveSettings({ glow: !getSettings().glow });
        toast(`Neon glow ${getSettings().glow ? 'enabled' : 'disabled'}.`);
      }
    },
    {
      title: `${settings.motion ? 'Disable' : 'Enable'} motion effects`,
      meta: 'Appearance',
      icon: 'assets/icons/settings.svg',
      group: 'Actions',
      run: () => {
        saveSettings({ motion: !getSettings().motion });
        toast(`Motion effects ${getSettings().motion ? 'enabled' : 'disabled'}.`);
      }
    },
    {
      title: `${settings.scanlines ? 'Disable' : 'Enable'} scanlines`,
      meta: 'Appearance',
      icon: 'assets/icons/settings.svg',
      group: 'Actions',
      run: () => {
        saveSettings({ scanlines: !getSettings().scanlines });
        toast(`Scanlines ${getSettings().scanlines ? 'enabled' : 'disabled'}.`);
      }
    },
    {
      title: 'Reload desktop',
      meta: 'Restart the shell',
      icon: 'assets/icons/start.svg',
      group: 'Actions',
      run: () => window.location.reload()
    }
  ];

  Object.entries(ACCENTS).forEach(([id, meta]) => {
    actions.push({
      title: `Accent: ${meta.label}`,
      meta: meta.color,
      icon: 'assets/icons/settings.svg',
      group: 'Theme',
      run: () => {
        saveSettings({ accent: id });
        toast(`Accent set to ${meta.label}.`);
      }
    });
  });

  WALLPAPERS.forEach((wallpaper) => {
    actions.push({
      title: `Wallpaper: ${wallpaper.label}`,
      meta: wallpaper.note,
      icon: 'assets/icons/settings.svg',
      group: 'Theme',
      run: () => {
        saveSettings({ wallpaper: wallpaper.id });
        toast(`Wallpaper set to ${wallpaper.label}.`);
      }
    });
  });

  const apps = getAppList().map((app) => ({
    title: app.title,
    meta: app.meta || 'Application',
    icon: app.icon,
    group: 'Apps',
    run: app.run
  }));

  items = [...apps, ...actions];
}

function loadGames() {
  if (gamesLoaded) return;
  gamesLoaded = true;

  getLibrary()
    .then((library) => {
      const gameItems = library.games.map((game) => ({
        title: game.title,
        meta: `${game.category}${game.web ? ' · live portal' : ''}`,
        icon: 'assets/icons/games-cabinet.svg',
        group: 'Games',
        run: () => openGame(game)
      }));
      items = [...items, ...gameItems];
      render();
    })
    .catch((error) => console.warn('[Raevix] palette games unavailable', error));
}

function createPalette() {
  palette = document.createElement('div');
  palette.className = 'spalette';
  palette.hidden = true;
  palette.innerHTML = `
    <div class="spalette__panel" role="dialog" aria-modal="true" aria-label="Command palette">
      <label class="spalette__search">
        <img src="assets/icons/search.svg" alt="" />
        <input id="paletteInput" type="text" placeholder="Search apps, games, actions…" autocomplete="off" spellcheck="false" aria-label="Command palette search" />
        <kbd>ESC</kbd>
      </label>
      <div class="spalette__results" id="paletteResults" role="listbox" aria-label="Results"></div>
      <p class="spalette__empty" id="paletteEmpty" hidden>Nothing matches that search.</p>
      <footer class="spalette__foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> run</span>
        <span><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>K</kbd> toggle</span>
      </footer>
    </div>
  `;

  document.body.append(palette);
  input = palette.querySelector('#paletteInput');
  listHost = palette.querySelector('#paletteResults');
  empty = palette.querySelector('#paletteEmpty');

  palette.addEventListener('pointerdown', (event) => {
    if (event.target === palette) closePalette();
  });

  input.addEventListener('input', () => {
    active = 0;
    render();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      flat[active]?.run();
      closePalette();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });

  listHost.addEventListener('pointermove', (event) => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    const next = Number(button.dataset.index);
    if (next !== active) {
      active = next;
      highlight();
    }
  });

  listHost.addEventListener('click', (event) => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    const entry = flat[Number(button.dataset.index)];
    if (!entry) return;
    closePalette();
    entry.run();
  });
}

function move(direction) {
  if (!flat.length) return;
  active = (active + direction + flat.length) % flat.length;
  highlight();
}

function highlight() {
  const buttons = [...listHost.querySelectorAll('[data-index]')];
  buttons.forEach((button) => {
    const isActive = Number(button.dataset.index) === active;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  buttons[active]?.scrollIntoView({ block: 'nearest' });
}

function render() {
  if (!palette) return;
  const query = input.value.trim().toLowerCase();

  let scored = items
    .map((item) => {
      const haystack = `${item.title} ${item.meta} ${item.group}`;
      return {
        item,
        direct: Boolean(query) && haystack.toLowerCase().includes(query),
        weight: score(haystack, query)
      };
    })
    .filter((entry) => entry.weight >= 0);

  // When a literal substring match exists, drop loose subsequence matches.
  if (query && scored.some((entry) => entry.direct)) {
    scored = scored.filter((entry) => entry.direct);
  }

  const order = { Apps: 0, Games: 1, Actions: 2, Theme: 3 };
  scored.sort((a, b) => {
    const groupDelta = (order[a.item.group] ?? 9) - (order[b.item.group] ?? 9);
    if (groupDelta) return groupDelta;
    if (query && b.weight !== a.weight) return b.weight - a.weight;
    return a.item.title.localeCompare(b.item.title);
  });

  flat = scored.map((entry) => entry.item).slice(0, 40);
  active = Math.min(active, Math.max(0, flat.length - 1));

  if (!flat.length) {
    listHost.replaceChildren();
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  let lastGroup = '';

  listHost.replaceChildren(...flat.flatMap((item, index) => {
    const nodes = [];

    if (item.group !== lastGroup) {
      lastGroup = item.group;
      const heading = document.createElement('p');
      heading.className = 'spalette__group';
      heading.setAttribute('role', 'presentation');
      heading.textContent = item.group;
      nodes.push(heading);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spalette__item';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === active));
    button.innerHTML = `
      <img src="${escapeHtml(item.icon)}" alt="" />
      <span class="spalette__meta">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.meta)}</small>
      </span>
      <span class="spalette__enter" aria-hidden="true">↵</span>
    `;
    nodes.push(button);
    return nodes;
  }));

  highlight();
}

export function openPalette() {
  if (!palette) createPalette();
  palette.hidden = false;
  document.body.classList.add('is-palette-open');
  input.value = '';
  active = 0;
  render();
  loadGames();
  window.requestAnimationFrame(() => {
    palette.classList.add('is-open');
    input.focus({ preventScroll: true });
  });
}

export function closePalette() {
  if (!palette || palette.hidden) return;
  palette.classList.remove('is-open');
  palette.hidden = true;
  document.body.classList.remove('is-palette-open');
}

export function togglePalette() {
  if (!palette || palette.hidden) openPalette();
  else closePalette();
}

export function isPaletteOpen() {
  return Boolean(palette && !palette.hidden);
}

export function initCommandPalette(actions = {}) {
  shellActions = actions;
  buildStaticItems();
}
