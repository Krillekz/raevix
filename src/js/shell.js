/**
 * Shell layer: global keyboard shortcuts, command palette wiring, window snapping,
 * desktop context menu, lock screen, shortcut sheet and session restore.
 */

import { APPS, openApp } from './apps.js';
import { getLibrary, openGame } from './games.js';
import { WALLPAPERS, getSettings, saveSettings } from './settings.js';
import {
  closeWindowByKey,
  focusWindowByKey,
  getActiveWindowKey,
  getWindowsInfo,
  minimizeWindowByKey,
  snapWindowByKey,
  toggleMaximizeByKey
} from './window-manager.js';
import { closePalette, initCommandPalette, openPalette, togglePalette } from './command-palette.js';
import { escapeHtml, toast } from './ui.js';
import { sfx } from './sound.js';

const SESSION_KEY = 'raevix.session.v1';

const SHORTCUT_GROUPS = [
  {
    title: 'Desktop',
    rows: [
      ['Ctrl / ⌘ + Shift + K', 'Command palette'],
      ['Ctrl / ⌘ + /', 'This shortcut sheet'],
      ['Ctrl / ⌘ + Shift + L', 'Lock the desktop'],
      ['Ctrl + `', 'Cycle open windows'],
      ['Ctrl + Alt + D', 'Show or restore the desktop'],
      ['Escape', 'Close overlays']
    ]
  },
  {
    title: 'Windows',
    rows: [
      ['Ctrl + Alt + ← / →', 'Snap the active window'],
      ['Ctrl + Alt + ↑', 'Maximise or restore'],
      ['Ctrl + Alt + ↓', 'Minimise'],
      ['Drag title bar', 'Move a window'],
      ['Drag to a screen edge', 'Snap left, right or top'],
      ['Double-click title bar', 'Maximise or restore']
    ]
  },
  {
    title: 'Inside apps',
    rows: [
      ['Terminal: Tab / ↑', 'Complete a command / recall history'],
      ['Calculator', 'Type numbers, Enter equals, Esc clears'],
      ['Paint: B / E / Ctrl+Z', 'Brush / eraser / undo'],
      ['Palette: ↑ ↓ ↵', 'Navigate and run results']
    ]
  }
];

let lockScreen = null;
let lockTimer = 0;
let shortcutSheet = null;
let contextMenu = null;
let desktopHidden = new Set();
let sessionSaveTimer = 0;
let initialised = false;

/* Session ----------------------------------------------------------------- */

function readSessionKeys() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

function saveSession() {
  if (!getSettings().restoreSession) return;
  const keys = getWindowsInfo()
    .map((entry) => entry.key)
    .filter((key) => key.startsWith('app:') || key.startsWith('game:'));

  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(keys));
  } catch (error) {
    console.warn('[Raevix] could not save session', error);
  }
}

function scheduleSessionSave() {
  window.clearTimeout(sessionSaveTimer);
  sessionSaveTimer = window.setTimeout(saveSession, 350);
}

async function restoreSession() {
  if (!getSettings().restoreSession) return;

  const keys = readSessionKeys().slice(0, 7);
  if (!keys.length) return;

  const appKeys = keys.filter((key) => key.startsWith('app:'));
  const gameKeys = keys.filter((key) => key.startsWith('game:'));

  appKeys.forEach((key) => {
    const id = key.slice(4);
    if (APPS[id] && !APPS[id].external) openApp(id);
  });

  if (gameKeys.length) {
    try {
      const library = await getLibrary();
      gameKeys.forEach((key) => {
        const game = library.games.find((entry) => `game:${entry.id}` === key);
        if (game) openGame(game);
      });
    } catch (error) {
      console.warn('[Raevix] session games could not restore', error);
    }
  }
}

/* Lock screen ------------------------------------------------------------- */

function renderLockTime() {
  if (!lockScreen) return;
  const now = new Date();
  lockScreen.querySelector('#lockTime').textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !getSettings().clock24
  });
  lockScreen.querySelector('#lockDate').textContent = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

export function lockDesktop() {
  if (lockScreen) return;

  closePalette();
  closeContextMenu();
  closeShortcuts();

  lockScreen = document.createElement('div');
  lockScreen.className = 'lockscreen';
  lockScreen.innerHTML = `
    <div class="lockscreen__inner" role="dialog" aria-modal="true" aria-label="Locked session">
      <p class="eyebrow">Session locked</p>
      <p class="lockscreen__time" id="lockTime">--:--</p>
      <p class="lockscreen__date" id="lockDate">—</p>
      <div class="lockscreen__profile">
        <img src="assets/avatar.svg" alt="" />
        <div>
          <strong>Raevik</strong>
          <span>Guest session · local profile</span>
        </div>
      </div>
      <button class="btn btn--accent" type="button" id="lockUnlock">Unlock desktop</button>
      <p class="lockscreen__hint">Press Enter to resume. Nothing is reloaded.</p>
    </div>
  `;

  document.body.append(lockScreen);
  document.body.classList.add('is-locked');
  renderLockTime();
  lockTimer = window.setInterval(renderLockTime, 1000);

  lockScreen.querySelector('#lockUnlock').addEventListener('click', unlockDesktop);
  lockScreen.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      unlockDesktop();
    }
  });

  window.requestAnimationFrame(() => {
    lockScreen.classList.add('is-open');
    lockScreen.querySelector('#lockUnlock').focus();
  });
}

export function unlockDesktop() {
  if (!lockScreen) return;
  window.clearInterval(lockTimer);
  const node = lockScreen;
  lockScreen = null;
  document.body.classList.remove('is-locked');
  node.classList.remove('is-open');
  window.setTimeout(() => node.remove(), 260);
}

/* Shortcut sheet ---------------------------------------------------------- */

function buildShortcuts() {
  shortcutSheet = document.createElement('div');
  shortcutSheet.className = 'keysheet';
  shortcutSheet.hidden = true;
  shortcutSheet.innerHTML = `
    <div class="keysheet__panel" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <header class="keysheet__head">
        <div>
          <p class="eyebrow">Reference</p>
          <h3>Keyboard shortcuts</h3>
          <p>Everything Raevix listens for, in one place.</p>
        </div>
        <button class="icon-btn" type="button" data-close aria-label="Close shortcuts">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        </button>
      </header>
      <div class="keysheet__grid">
        ${SHORTCUT_GROUPS.map((group) => `
          <section class="keysheet__group">
            <h4>${escapeHtml(group.title)}</h4>
            <dl>
              ${group.rows.map(([keys, label]) => `
                <div class="keysheet__row">
                  <dt>${keys.split(' + ').map((part) => `<kbd>${escapeHtml(part)}</kbd>`).join('<i>+</i>')}</dt>
                  <dd>${escapeHtml(label)}</dd>
                </div>
              `).join('')}
            </dl>
          </section>
        `).join('')}
      </div>
      <footer class="keysheet__foot">
        <button class="btn btn--accent" type="button" data-close>Got it</button>
      </footer>
    </div>
  `;

  shortcutSheet.addEventListener('click', (event) => {
    if (event.target === shortcutSheet || event.target.closest('[data-close]')) closeShortcuts();
  });

  document.body.append(shortcutSheet);
}

export function openShortcuts() {
  if (!shortcutSheet) buildShortcuts();
  closePalette();
  closeContextMenu();
  shortcutSheet.hidden = false;
  window.requestAnimationFrame(() => shortcutSheet.classList.add('is-open'));
  shortcutSheet.querySelector('[data-close]').focus();
}

export function closeShortcuts() {
  if (!shortcutSheet || shortcutSheet.hidden) return;
  shortcutSheet.classList.remove('is-open');
  shortcutSheet.hidden = true;
}

/* Context menu ------------------------------------------------------------ */

function closeContextMenu() {
  if (!contextMenu) return;
  contextMenu.remove();
  contextMenu = null;
}

function openContextMenu(x, y) {
  closeContextMenu();
  const settings = getSettings();

  contextMenu = document.createElement('div');
  contextMenu.className = 'ctxmenu';
  contextMenu.setAttribute('role', 'menu');

  const entries = [
    { label: 'New note', hint: 'Notes', icon: 'assets/icons/notes.svg', run: () => openApp('notes') },
    { label: 'Open terminal', hint: 'Shell', icon: 'assets/icons/terminal.svg', run: () => openApp('terminal') },
    { label: 'Command palette', hint: 'Ctrl K', icon: 'assets/icons/search.svg', run: openPalette },
    { separator: true },
    {
      label: 'Next wallpaper',
      hint: WALLPAPERS[(WALLPAPERS.findIndex((entry) => entry.id === settings.wallpaper) + 1) % WALLPAPERS.length].label,
      icon: 'assets/icons/settings.svg',
      run: () => {
        const index = WALLPAPERS.findIndex((entry) => entry.id === getSettings().wallpaper);
        const next = WALLPAPERS[(index + 1) % WALLPAPERS.length];
        saveSettings({ wallpaper: next.id });
        toast(`Wallpaper: ${next.label}.`);
      }
    },
    {
      label: settings.scanlines ? 'Disable scanlines' : 'Enable scanlines',
      hint: 'Appearance',
      icon: 'assets/icons/settings.svg',
      run: () => {
        saveSettings({ scanlines: !getSettings().scanlines });
        toast(`Scanlines ${getSettings().scanlines ? 'enabled' : 'disabled'}.`);
      }
    },
    { separator: true },
    { label: 'Show desktop', hint: 'Ctrl Alt D', icon: 'assets/icons/start.svg', run: showDesktop },
    { label: 'Lock desktop', hint: 'Ctrl Shift L', icon: 'assets/icons/private-browser.svg', run: lockDesktop },
    { label: 'Keyboard shortcuts', hint: 'Ctrl /', icon: 'assets/icons/guide.svg', run: openShortcuts },
    { separator: true },
    { label: 'Settings', hint: 'Personalise', icon: 'assets/icons/settings.svg', run: () => openApp('settings') },
    { label: 'Reload desktop', hint: 'Restart', icon: 'assets/icons/start.svg', run: () => window.location.reload() }
  ];

  entries.forEach((entry) => {
    if (entry.separator) {
      const rule = document.createElement('hr');
      contextMenu.append(rule);
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ctxmenu__item';
    button.setAttribute('role', 'menuitem');
    button.innerHTML = `
      <img src="${escapeHtml(entry.icon)}" alt="" />
      <span>${escapeHtml(entry.label)}</span>
      <small>${escapeHtml(entry.hint || '')}</small>
    `;
    button.addEventListener('click', () => {
      closeContextMenu();
      entry.run();
    });
    contextMenu.append(button);
  });

  document.body.append(contextMenu);

  const rect = contextMenu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - rect.width - 10);
  const top = Math.min(y, window.innerHeight - rect.height - 10);
  contextMenu.style.left = `${Math.max(8, left)}px`;
  contextMenu.style.top = `${Math.max(8, top)}px`;
  contextMenu.querySelector('button')?.focus({ preventScroll: true });
}

/* Window actions ---------------------------------------------------------- */

export function showDesktop() {
  const open = getWindowsInfo();

  if (desktopHidden.size) {
    desktopHidden.forEach((key) => focusWindowByKey(key));
    desktopHidden = new Set();
    toast('Windows restored.');
    return;
  }

  const visible = open.filter((entry) => !entry.minimized);
  if (!visible.length) {
    toast('The desktop is already clear.');
    return;
  }

  visible.forEach((entry) => minimizeWindowByKey(entry.key));
  desktopHidden = new Set(visible.map((entry) => entry.key));
  toast('Desktop shown — run it again to bring windows back.');
}

function cycleWindows() {
  const open = getWindowsInfo().sort((a, b) => b.z - a.z);
  if (!open.length) {
    toast('No windows are open.');
    return;
  }

  const active = open.find((entry) => entry.active);
  const index = active ? open.indexOf(active) : -1;
  const next = open[(index + 1) % open.length];
  focusWindowByKey(next.key);
}

/* Global wiring ----------------------------------------------------------- */

function isTypingTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function bindKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (lockScreen) return;

    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (mod && key === 'k') {
      event.preventDefault();
      closeContextMenu();
      closeShortcuts();
      togglePalette();
      sfx('open');
      return;
    }

    if (mod && event.key === '/') {
      event.preventDefault();
      openShortcuts();
      return;
    }

    if (mod && event.shiftKey && key === 'l') {
      event.preventDefault();
      lockDesktop();
      sfx('close');
      return;
    }

    if (mod && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const activeKey = getActiveWindowKey();
      if (activeKey) snapWindowByKey(activeKey, event.key === 'ArrowLeft' ? 'left' : 'right');
      return;
    }

    if (mod && event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      const activeKey = getActiveWindowKey();
      if (activeKey) toggleMaximizeByKey(activeKey);
      return;
    }

    if (mod && event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();
      const activeKey = getActiveWindowKey();
      if (activeKey) minimizeWindowByKey(activeKey);
      return;
    }

    if (mod && event.altKey && key === 'd') {
      event.preventDefault();
      showDesktop();
      return;
    }

    if (mod && event.key === '`') {
      event.preventDefault();
      cycleWindows();
      return;
    }

    if (event.key === 'Escape') {
      if (contextMenu) {
        event.preventDefault();
        closeContextMenu();
      } else if (shortcutSheet && !shortcutSheet.hidden) {
        event.preventDefault();
        closeShortcuts();
      }
      return;
    }

    if (event.key === '?' && !isTypingTarget(event.target) && !mod) {
      event.preventDefault();
      openShortcuts();
    }
  });
}

function bindContextMenu() {
  const desktop = document.getElementById('desktop');
  desktop?.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.window')) return;
    event.preventDefault();
    openContextMenu(event.clientX, event.clientY);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!contextMenu) return;
    if (!contextMenu.contains(event.target)) closeContextMenu();
  });

  window.addEventListener('resize', closeContextMenu);
  window.addEventListener('blur', closeContextMenu);
}

export function initShell() {
  if (initialised) return;
  initialised = true;

  initCommandPalette({ lock: lockDesktop, showDesktop, shortcuts: openShortcuts });

  document.addEventListener('raevix:lock', lockDesktop);
  document.addEventListener('raevix:palette', togglePalette);
  document.addEventListener('raevix:shortcuts', openShortcuts);

  bindKeyboard();
  bindContextMenu();

  document.addEventListener('raevix:windows', scheduleSessionSave);
  window.addEventListener('beforeunload', saveSession);

  document.getElementById('paletteBtn')?.addEventListener('click', () => {
    closeShortcuts();
    togglePalette();
  });

  document.getElementById('clock')?.addEventListener('click', () => openApp('clock'));

  restoreSession().catch((error) => console.warn('[Raevix] session restore failed', error));

  // A first visit still gets a useful window when restore is enabled but empty.
  if (!getSettings().restoreSession) {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

export { closeWindowByKey };
