/** Raevix OS application registry and the bundled system apps. */

import { openWindow } from './window-manager.js';
import {
  ACCENTS,
  WALLPAPERS,
  getAccentColor,
  getSettings,
  saveSettings,
  resetSettings
} from './settings.js';
import { mountGamesCabinet } from './games.js';
import { mountBrowser } from './browser.js';
import { mountGuide } from './guide.js';
import { mountNotes } from './notes.js';
import { mountCalculator } from './calculator.js';
import { mountTerminal } from './terminal.js';
import { mountTaskManager } from './taskmanager.js';
import { mountPaint } from './paint.js';
import { mountMusic } from './music.js';
import { mountClock } from './clock.js';
import { confirmDialog, escapeHtml, toast } from './ui.js';

export const APPS = {
  browser: {
    title: 'Private Browser',
    meta: 'Incognito',
    icon: 'assets/icons/private-browser.svg',
    width: 1000,
    height: 680,
    flush: true,
    mount: mountBrowser
  },
  wikipedia: {
    title: 'Wikipedia',
    meta: 'Reference · Private Browser',
    icon: 'assets/icons/wiki.svg',
    width: 1000,
    height: 700,
    flush: true,
    mount: (body) => mountBrowser(body, 'https://en.wikipedia.org/wiki/Main_Page')
  },
  archive: {
    title: 'Internet Archive',
    meta: 'Library · Private Browser',
    icon: 'assets/icons/archive.svg',
    width: 1000,
    height: 700,
    flush: true,
    mount: (body) => mountBrowser(body, 'https://archive.org/')
  },
  notes: {
    title: 'Notes',
    meta: 'Notebook · saved locally',
    icon: 'assets/icons/notes.svg',
    width: 920,
    height: 620,
    mount: mountNotes
  },
  calculator: {
    title: 'Calculator',
    meta: 'Utility · keyboard ready',
    icon: 'assets/icons/calculator.svg',
    width: 760,
    height: 560,
    mount: mountCalculator
  },
  terminal: {
    title: 'Terminal',
    meta: 'Shell · raevix-sh',
    icon: 'assets/icons/terminal.svg',
    width: 840,
    height: 540,
    mount: mountTerminal
  },
  paint: {
    title: 'Paint',
    meta: 'Sketch · export PNG',
    icon: 'assets/icons/paint.svg',
    width: 900,
    height: 640,
    mount: mountPaint
  },
  music: {
    title: 'Music',
    meta: 'Synth · original loops',
    icon: 'assets/icons/music.svg',
    width: 860,
    height: 600,
    mount: mountMusic
  },
  clock: {
    title: 'Clock & Timers',
    meta: 'Clock · stopwatch · timer',
    icon: 'assets/icons/clock.svg',
    width: 820,
    height: 620,
    mount: mountClock
  },
  taskmanager: {
    title: 'Task Manager',
    meta: 'System · live metrics',
    icon: 'assets/icons/task-manager.svg',
    width: 840,
    height: 620,
    mount: mountTaskManager
  },
  games: {
    title: 'Games Cabinet',
    meta: 'Arcade',
    icon: 'assets/icons/games-cabinet.svg',
    width: 900,
    height: 640,
    mount: mountGamesCabinet
  },
  lunarx: {
    title: 'LunarX',
    meta: 'Anime · new tab',
    icon: 'assets/icons/lunarx.svg',
    external: 'https://lunarx.to/'
  },
  proxy: {
    title: 'Proxy Mock',
    meta: 'Utility',
    icon: 'assets/icons/proxy-mock.svg',
    width: 900,
    height: 600,
    flush: true,
    mount: mountProxy
  },
  guide: {
    title: 'Quick Guide',
    meta: 'Help',
    icon: 'assets/icons/guide.svg',
    width: 720,
    height: 620,
    mount: mountGuide
  },
  settings: {
    title: 'Settings',
    meta: 'Personalize',
    icon: 'assets/icons/settings.svg',
    width: 780,
    height: 680,
    mount: mountSettings
  },
  trash: {
    title: 'Trash Bin',
    meta: 'System',
    icon: 'assets/icons/trash.svg',
    width: 620,
    height: 460,
    flush: true,
    mount: mountTrash
  }
};

/** Open (or focus) a registered application window. */
export function openApp(id) {
  const app = APPS[id];
  if (!app) return null;

  // Sites that refuse framing (and Cloudflare challenges) belong in a real tab.
  if (app.external) {
    const opened = window.open(app.external, '_blank');
    if (!opened) {
      toast(`Your browser blocked the ${app.title} tab. Allow pop-ups and try again.`);
      return null;
    }
    try {
      opened.opener = null;
    } catch (error) {
      console.warn('[Raevix] could not detach opener', error);
    }
    toast(`Opening ${app.title} in a new tab — the site blocks embedding.`);
    return null;
  }

  return openWindow({
    key: `app:${id}`,
    title: app.title,
    icon: app.icon,
    width: app.width,
    height: app.height,
    flush: Boolean(app.flush),
    mount: app.mount
  });
}

/** Open a private browser window already pointed at a page (terminal, deep links). */
export function openWebPage(url) {
  const target = String(url || '').trim();
  if (!/^https?:\/\//i.test(target)) {
    toast('Only full http(s) addresses can open in Private Browser.');
    return null;
  }

  let host = 'Web page';
  try {
    host = new URL(target).hostname.replace(/^www\./, '');
  } catch {
    host = 'Web page';
  }

  return openWindow({
    key: `browser:${Date.now().toString(36)}`,
    title: `Web · ${host}`,
    icon: 'assets/icons/private-browser.svg',
    width: 1000,
    height: 680,
    flush: true,
    mount: (body) => mountBrowser(body, target)
  });
}

/** Flat list used by the Start menu. */
export function getAppList() {
  return Object.entries(APPS).map(([id, app]) => ({
    id,
    title: app.title,
    meta: app.meta,
    icon: app.icon,
    run: () => openApp(id)
  }));
}

/* ------------------------------------------------------------------------- */
/* Settings                                                                  */
/* ------------------------------------------------------------------------- */

function switchRow(id, title, description, checked) {
  return `
    <div class="setting">
      <div class="setting__text">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </div>
      <button class="switch" id="${id}" type="button" role="switch" aria-checked="${checked}" aria-label="${escapeHtml(title)}"><i></i></button>
    </div>
  `;
}

function accentSwatches(settings) {
  const swatches = Object.entries(ACCENTS).map(([id, meta]) => `
    <button class="accent-swatch${settings.accent === id ? ' is-active' : ''}" type="button" data-accent="${id}" aria-pressed="${settings.accent === id}" style="--swatch: ${meta.color}">
      <span class="accent-swatch__dot"></span>
      <span class="accent-swatch__label">${escapeHtml(meta.label)}</span>
    </button>
  `);

  swatches.push(`
    <label class="accent-swatch accent-swatch--custom${settings.accent === 'custom' ? ' is-active' : ''}" style="--swatch: ${settings.customAccent}" title="Pick any accent colour">
      <span class="accent-swatch__dot"></span>
      <span class="accent-swatch__label">Custom</span>
      <input type="color" id="accentCustom" value="${settings.customAccent}" aria-label="Choose a custom accent colour" />
    </label>
  `);

  return swatches.join('');
}

function wallpaperChoices(settings) {
  return WALLPAPERS.map((wallpaper) => `
    <button class="wallpaper-choice${settings.wallpaper === wallpaper.id ? ' is-active' : ''}" type="button" data-wallpaper="${wallpaper.id}" aria-pressed="${settings.wallpaper === wallpaper.id}">
      <span class="wallpaper-choice__art wallpaper-choice__art--${wallpaper.id}" aria-hidden="true"></span>
      <span class="wallpaper-choice__meta">
        <strong>${escapeHtml(wallpaper.label)}</strong>
        <small>${escapeHtml(wallpaper.note)}</small>
      </span>
      <span class="wallpaper-choice__check" aria-hidden="true">✓</span>
    </button>
  `).join('');
}

function mountSettings(body) {
  const settings = getSettings();

  body.innerHTML = `
    <div class="settings">
      <header class="settings__hero">
        <div>
          <p class="eyebrow">System</p>
          <h3 class="app__title">Make Raevix yours</h3>
          <p class="app__sub">Accent, wallpaper and interface effects. Preferences stay on this device.</p>
        </div>
        <span class="settings__pill" title="Current accent"><i></i><span id="settingsAccentHex">${escapeHtml(getAccentColor(settings))}</span></span>
      </header>

      <section class="settings__section">
        <div class="settings__sectionhead">
          <h4>Accent</h4>
          <p>Recolours highlights, glow, controls and the taskbar.</p>
        </div>
        <div class="accent-grid">${accentSwatches(settings)}</div>
      </section>

      <section class="settings__section">
        <div class="settings__sectionhead">
          <h4>Wallpaper</h4>
          <p>The nebula keeps the signature look; the others follow your accent.</p>
        </div>
        <div class="wallpaper-grid">${wallpaperChoices(settings)}</div>
      </section>

      <section class="settings__section">
        <div class="settings__sectionhead">
          <h4>Interface</h4>
          <p>Light, motion and clock behaviour.</p>
        </div>
        <div class="settings__group">
          ${switchRow('settingGlow', 'Neon glow', 'Light bloom on branding and shortcut icons.', settings.glow)}
          ${switchRow('settingMotion', 'Motion effects', 'Window and menu animations.', settings.motion)}
          ${switchRow('settingScanlines', 'Scanline overlay', 'Subtle CRT texture across the desktop.', settings.scanlines)}
          ${switchRow('settingClock', '24-hour clock', 'Switch the taskbar clock away from 12-hour time.', settings.clock24)}
          ${switchRow('settingHint', 'Desktop hint', 'Show the shortcut hint above the taskbar.', settings.hint)}
          ${switchRow('settingSounds', 'Interface sounds', 'Synthesised clicks, lock cues and timer alarms.', settings.sounds)}
        </div>
      </section>

      <section class="settings__section">
        <div class="settings__sectionhead">
          <h4>Session</h4>
          <p>What survives a reload, and how to drive the desktop from the keyboard.</p>
        </div>
        <div class="settings__group">
          ${switchRow('settingRestore', 'Restore windows', 'Reopen apps and games that were open when you reload.', settings.restoreSession)}
        </div>
        <div class="settings__links">
          <button class="btn" id="settingsShortcuts" type="button">Keyboard shortcuts</button>
          <button class="btn" id="settingsGuide" type="button">Open Quick Guide</button>
        </div>
      </section>

      <div class="settings__foot">
        <button class="btn btn--danger" id="settingsReset" type="button">Reset all preferences</button>
        <span class="settings__credit">Raevix OS v2.0 · credited to Raevik</span>
      </div>
    </div>
  `;

  const accentButtons = [...body.querySelectorAll('[data-accent]')];
  const customInput = body.querySelector('#accentCustom');
  const accentHex = body.querySelector('#settingsAccentHex');

  const updatePill = (color) => {
    if (accentHex) accentHex.textContent = color;
  };

  const markAccent = (accent) => {
    accentButtons.forEach((button) => {
      const active = button.dataset.accent === accent;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const customWrap = customInput?.closest('.accent-swatch');
    customWrap?.classList.toggle('is-active', accent === 'custom');
    customWrap?.setAttribute('aria-pressed', String(accent === 'custom'));
  };

  accentButtons.forEach((button) => {
    button.addEventListener('click', () => {
      saveSettings({ accent: button.dataset.accent });
      markAccent(button.dataset.accent);
      updatePill(getAccentColor());
    });
  });

  customInput?.addEventListener('input', () => {
    const value = customInput.value;
    saveSettings({ accent: 'custom', customAccent: value });
    customInput.closest('.accent-swatch')?.style.setProperty('--swatch', value);
    markAccent('custom');
    updatePill(value);
  });

  const wallpaperButtons = [...body.querySelectorAll('[data-wallpaper]')];
  wallpaperButtons.forEach((button) => {
    button.addEventListener('click', () => {
      saveSettings({ wallpaper: button.dataset.wallpaper });
      wallpaperButtons.forEach((other) => {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
    });
  });

  const bindings = [
    ['settingGlow', 'glow'],
    ['settingMotion', 'motion'],
    ['settingScanlines', 'scanlines'],
    ['settingClock', 'clock24'],
    ['settingHint', 'hint'],
    ['settingSounds', 'sounds'],
    ['settingRestore', 'restoreSession']
  ];

  bindings.forEach(([elementId, key]) => {
    const control = body.querySelector(`#${elementId}`);
    if (!control) return;
    control.addEventListener('click', () => {
      const next = control.getAttribute('aria-checked') !== 'true';
      control.setAttribute('aria-checked', String(next));
      saveSettings({ [key]: next });
    });
  });

  body.querySelector('#settingsShortcuts').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('raevix:shortcuts'));
  });

  body.querySelector('#settingsGuide').addEventListener('click', () => openApp('guide'));

  body.querySelector('#settingsReset').addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Reset all preferences?',
      message: 'Accent, wallpaper, glow, motion, scanlines, clock format, sounds, session restore and desktop hint return to their defaults. Windows stay open.',
      confirmLabel: 'Reset preferences',
      danger: true
    });

    if (!confirmed) return;

    resetSettings();
    mountSettings(body);
    toast('Preferences restored to defaults.');
  });
}

/* ------------------------------------------------------------------------- */
/* Proxy Mock                                                                */
/* ------------------------------------------------------------------------- */

function mountProxy(body) {
  body.innerHTML = `
    <div class="proxy">
      <div class="proxy__bar">
        <span class="proxy__dots" aria-hidden="true"><span></span><span></span><span></span></span>
        <form class="proxy__form" novalidate>
          <svg class="proxy__lock" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <input id="proxyUrl" aria-label="Mock address bar" value="https://search.raevix.local" spellcheck="false" autocomplete="off" />
          <button type="submit">Go</button>
        </form>
      </div>

      <div class="proxy__page">
        <p class="eyebrow">Proxy Mock</p>
        <h3>Sandboxed browsing shell</h3>
        <p>
          This window mocks the layout of a proxy browser. Tunnelling is intentionally not included:
          the build is fully static, so every request would still be made by your browser and your
          network provider would still see it.
        </p>

        <div class="proxy__links">
          <a class="proxy__link" href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia <span>Open</span></a>
          <a class="proxy__link" href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer">MDN Docs <span>Open</span></a>
          <a class="proxy__link" href="https://itch.io/games/html5" target="_blank" rel="noopener noreferrer">HTML5 Games <span>Open</span></a>
          <a class="proxy__link" href="https://pages.github.com" target="_blank" rel="noopener noreferrer">GitHub Pages <span>Open</span></a>
        </div>

        <p class="proxy__note">
          Want a real proxy? Point this form at your own server-side fetch worker — for example a
          Cloudflare Worker that relays a URL and strips framing headers. Static hosting alone cannot
          bypass network filters.
        </p>
      </div>
    </div>
  `;

  const form = body.querySelector('.proxy__form');
  const input = body.querySelector('#proxyUrl');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();

    if (!value) {
      toast('Type an address first.');
      return;
    }

    if (!/^https?:\/\//i.test(value)) {
      toast('Proxy Mock only previews full http(s) addresses.');
      return;
    }

    const opened = window.open(value, '_blank', 'noopener');
    if (opened) {
      toast('Opened in a new tab — tunnelling is not part of this static build.');
    } else {
      toast('Your browser blocked the new tab. Allow pop-ups and try again.');
    }
  });
}

/* ------------------------------------------------------------------------- */
/* Trash Bin                                                                 */
/* ------------------------------------------------------------------------- */

function mountTrash(body) {
  body.innerHTML = `
    <div class="trash">
      <img src="assets/icons/trash.svg" alt="" />
      <div>
        <p class="eyebrow">Recycle bin</p>
        <h3>Trash is empty</h3>
      </div>
      <p>
        Raevix OS keeps every file in the site bundle, so there is nothing to restore here.
        Deleting a shortcut or save file never leaves the browser.
      </p>
      <button class="btn" id="trashRefresh" type="button">Refresh bin</button>
    </div>
  `;

  body.querySelector('#trashRefresh').addEventListener('click', () => {
    toast('Trash is still empty — nothing to restore.');
  });
}
