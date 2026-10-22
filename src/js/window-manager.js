/**
 * Raevix OS window manager.
 * Creates draggable desktop windows with focus stacking, minimize / maximize / close
 * toggles and taskbar chips. Windows are plain DOM, positioned inside the viewport
 * above the desktop layer and below the taskbar.
 */

const windows = new Map();
let zTop = 20;
let seq = 0;

const ICONS = {
  minimize: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg>',
  maximize: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.4" y="3.4" width="9.2" height="9.2" rx="1.6"/></svg>',
  restore: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="5.4" width="7.6" height="7.6" rx="1.4"/><path d="M5.6 5.4V4.2A1.2 1.2 0 0 1 6.8 3H12a1.2 1.2 0 0 1 1.2 1.2V9a1.2 1.2 0 0 1-1.2 1.2h-1.2"/></svg>',
  close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>'
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function workArea() {
  const bar = document.querySelector('.taskbar');
  const barHeight = bar ? bar.getBoundingClientRect().height : 64;
  return {
    width: window.innerWidth,
    height: Math.max(220, window.innerHeight - barHeight)
  };
}

const isNarrow = () => window.innerWidth <= 720;

/** Tell the shell that the window set changed (used for session restore). */
function notifyChange() {
  document.dispatchEvent(new CustomEvent('raevix:windows'));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function focusWindow(win) {
  if (!win || win.el.classList.contains('is-closing')) return;

  windows.forEach((other) => {
    if (other === win) return;
    other.el.classList.remove('is-active');
    other.chip.classList.remove('is-active');
    other.chip.setAttribute('aria-current', 'false');
  });

  if (win.minimized) {
    win.minimized = false;
    win.el.classList.remove('is-minimized');
  }

  win.el.classList.add('is-active');
  win.chip.classList.add('is-active');
  win.chip.setAttribute('aria-current', 'true');
  win.el.style.zIndex = String(++zTop);
  notifyChange();
}

function focusTopmost() {
  let best = null;
  windows.forEach((win) => {
    if (win.minimized) return;
    if (!best || Number(win.el.style.zIndex || 0) > Number(best.el.style.zIndex || 0)) best = win;
  });
  if (best) focusWindow(best);
}

function layoutMaximized(win) {
  const area = workArea();
  win.el.style.left = '8px';
  win.el.style.top = '8px';
  win.el.style.width = `${area.width - 16}px`;
  win.el.style.height = `${area.height - 16}px`;
}

function toggleMaximize(win) {
  const { el } = win;

  if (win.maximized) {
    win.maximized = false;
    el.classList.remove('is-maximized');
    if (win.prevRect) {
      el.style.left = win.prevRect.left;
      el.style.top = win.prevRect.top;
      el.style.width = win.prevRect.width;
      el.style.height = win.prevRect.height;
    }
    win.maxBtn.innerHTML = ICONS.maximize;
    win.maxBtn.title = 'Maximize';
    win.maxBtn.setAttribute('aria-label', 'Maximize window');
  } else {
    // Remember the floating size, not the snapped size, so restore feels natural.
    if (!win.snapped) {
      win.prevRect = {
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        height: el.style.height
      };
    }
    win.snapped = null;
    el.classList.remove('is-snapped');
    win.maximized = true;
    el.classList.add('is-maximized');
    layoutMaximized(win);
    win.maxBtn.innerHTML = ICONS.restore;
    win.maxBtn.title = 'Restore';
    win.maxBtn.setAttribute('aria-label', 'Restore window');
  }
  focusWindow(win);
  notifyChange();
}

function minimizeWindow(win) {
  win.minimized = true;
  win.el.classList.add('is-minimized');
  win.el.classList.remove('is-active');
  win.chip.classList.remove('is-active');
  win.chip.removeAttribute('aria-current');
  focusTopmost();
  notifyChange();
}

function closeWindow(key) {
  const win = windows.get(key);
  if (!win) return;

  windows.delete(key);
  win.chip.remove();
  notifyChange();

  const finish = () => {
    win.el.remove();
    win.cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.warn('[Raevix] window cleanup failed', error);
      }
    });
    win.cleanups.length = 0;
    if (typeof win.onClose === 'function') win.onClose();
    if (![...windows.values()].some((w) => w.el.classList.contains('is-active'))) focusTopmost();
  };

  if (document.body.classList.contains('no-motion')) {
    finish();
    return;
  }

  win.el.classList.add('is-closing');
  window.setTimeout(finish, 170);
}

function buildChip(win) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'task-chip';
  chip.title = win.title;
  chip.innerHTML = `<img src="${escapeHtml(win.icon)}" alt="" /><span>${escapeHtml(win.title)}</span>`;
  chip.addEventListener('click', () => {
    if (win.minimized) {
      focusWindow(win);
    } else if (win.el.classList.contains('is-active')) {
      minimizeWindow(win);
    } else {
      focusWindow(win);
    }
  });
  document.getElementById('taskbarApps').append(chip);
  return chip;
}

function applyInitialRect(win, width, height) {
  const area = workArea();
  win.preferredWidth = width;
  win.preferredHeight = height;

  // On phones every window becomes a full-bleed sheet; dragging is disabled.
  if (isNarrow()) {
    win.el.style.left = '6px';
    win.el.style.top = '6px';
    win.el.style.width = `${Math.max(260, area.width - 12)}px`;
    win.el.style.height = `${Math.max(200, area.height - 12)}px`;
    return;
  }

  const margin = 24;
  const w = clamp(width, 260, Math.max(260, area.width - margin * 2));
  const h = clamp(height, 170, Math.max(170, area.height - margin * 2));
  const offset = (windows.size % 5) * 26;

  let left = Math.round((area.width - w) / 2 + offset - 30);
  let top = Math.round((area.height - h) / 2 + offset - 34);
  left = clamp(left, margin, Math.max(margin, area.width - w - margin));
  top = clamp(top, margin, Math.max(margin, area.height - h - margin));

  win.el.style.left = `${left}px`;
  win.el.style.top = `${top}px`;
  win.el.style.width = `${w}px`;
  win.el.style.height = `${h}px`;
}

function clampIntoView(win) {
  if (win.maximized) return;
  const area = workArea();
  const rect = win.el.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;

  if (rect.width <= area.width) {
    left = clamp(left, 0, area.width - rect.width);
  } else {
    left = clamp(left, area.width - rect.width, 0);
  }

  const maxTop = Math.max(0, area.height - 48);
  top = clamp(top, 0, maxTop);

  win.el.style.left = `${Math.round(left)}px`;
  win.el.style.top = `${Math.round(top)}px`;
}

function bindDrag(win) {
  const bar = win.el.querySelector('.window__bar');

  bar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('.window__controls')) return;
    if (win.maximized || isNarrow()) return;

    const el = win.el;

    // Dragging a snapped window lifts it back into a floating window.
    if (win.snapped) {
      const restore = win.prevRect;
      win.snapped = null;
      el.classList.remove('is-snapped');
      if (restore) {
        el.style.left = restore.left;
        el.style.top = restore.top;
        el.style.width = restore.width;
        el.style.height = restore.height;
      }
    }

    focusWindow(win);
    const rect = el.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const area = workArea();

    el.classList.add('is-dragging');

    const onMove = (moveEvent) => {
      const left = clamp(rect.left + (moveEvent.clientX - startX), -rect.width + 140, area.width - 140);
      const top = clamp(rect.top + (moveEvent.clientY - startY), 0, Math.max(0, area.height - 46));
      el.style.left = `${Math.round(left)}px`;
      el.style.top = `${Math.round(top)}px`;
    };

    const onUp = (upEvent) => {
      el.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);

      // Edge snapping: top maximises, sides take half the work area.
      if (!upEvent || typeof upEvent.clientX !== 'number') return;
      if (upEvent.clientY <= 14) {
        if (!win.maximized) toggleMaximize(win);
      } else if (upEvent.clientX <= 16) {
        snapWindowByKey(win.id, 'left');
      } else if (upEvent.clientX >= window.innerWidth - 16) {
        snapWindowByKey(win.id, 'right');
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });

  bar.addEventListener('dblclick', (event) => {
    if (event.target.closest('.window__controls')) return;
    toggleMaximize(win);
  });
}

function bindControls(win) {
  win.el.querySelector('.window__controls').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    event.stopPropagation();

    switch (button.dataset.action) {
      case 'minimize':
        minimizeWindow(win);
        break;
      case 'maximize':
        toggleMaximize(win);
        break;
      case 'close':
        closeWindow(win.id);
        break;
      default:
        break;
    }
  });
}

/**
 * Open (or focus) a managed window.
 * @param {Object} options
 * @param {string} [options.key] stable id, reopening focuses the existing window
 * @param {string} options.title
 * @param {string} [options.icon]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {boolean} [options.flush] remove body padding and scrolling (iframes)
 * @param {(body: HTMLElement) => void} [options.mount]
 * @param {() => void} [options.onClose]
 */
export function openWindow(options) {
  const {
    key,
    title = 'Untitled window',
    icon = 'assets/icons/start.svg',
    width = 840,
    height = 560,
    flush = false,
    mount,
    onClose
  } = options;

  const id = key || `window:${++seq}`;
  const existing = windows.get(id);
  if (existing) {
    focusWindow(existing);
    return existing;
  }

  const el = document.createElement('article');
  el.className = 'window';
  el.dataset.key = id;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.tabIndex = -1;

  el.innerHTML = `
    <header class="window__bar">
      <div class="window__identity">
        <img class="window__icon" src="${escapeHtml(icon)}" alt="" draggable="false" />
        <h2 class="window__title">${escapeHtml(title)}</h2>
      </div>
      <div class="window__controls">
        <button class="win-btn win-btn--min" type="button" data-action="minimize" title="Minimize" aria-label="Minimize window">${ICONS.minimize}</button>
        <button class="win-btn win-btn--max" type="button" data-action="maximize" title="Maximize" aria-label="Maximize window">${ICONS.maximize}</button>
        <button class="win-btn win-btn--close" type="button" data-action="close" title="Close" aria-label="Close window">${ICONS.close}</button>
      </div>
    </header>
    <div class="window__body${flush ? ' is-flush' : ''}"></div>
  `;

  const body = el.querySelector('.window__body');
  const win = {
    id,
    el,
    body,
    title,
    icon,
    chip: null,
    maxBtn: el.querySelector('.win-btn--max'),
    minimized: false,
    maximized: false,
    snapped: null,
    prevRect: null,
    preferredWidth: width,
    preferredHeight: height,
    wasNarrow: isNarrow(),
    cleanups: [],
    onClose
  };

  /** Register teardown work (timers, observers, audio contexts). */
  win.addCleanup = (cleanup) => {
    if (typeof cleanup === 'function') win.cleanups.push(cleanup);
  };

  el.style.zIndex = String(++zTop);
  applyInitialRect(win, width, height);
  document.getElementById('windowsLayer').append(el);

  // Guarantees the chrome reaches its visible resting state even if the entry
  // animation is paused by the compositor (background tab, reduced motion, etc).
  window.setTimeout(() => el.classList.add('is-settled'), 340);

  win.chip = buildChip(win);

  el.addEventListener('pointerdown', () => {
    if (!el.classList.contains('is-active')) focusWindow(win);
  }, true);

  bindControls(win);
  bindDrag(win);

  windows.set(id, win);
  focusWindow(win);

  if (typeof mount === 'function') {
    try {
      mount(body, win);
    } catch (error) {
      console.error('[Raevix] window mount failed', error);
      body.textContent = 'This application could not start.';
    }
  }

  notifyChange();
  el.focus({ preventScroll: true });
  return win;
}

/** Metadata for every open window, ordered by stacking order. */
export function getWindowsInfo() {
  return [...windows.entries()]
    .map(([key, win]) => ({
      key,
      title: win.title,
      icon: win.icon,
      minimized: win.minimized,
      maximized: win.maximized,
      active: win.el.classList.contains('is-active'),
      z: Number(win.el.style.zIndex || 0)
    }))
    .sort((a, b) => a.z - b.z);
}

export function getActiveWindowKey() {
  let best = null;
  windows.forEach((win) => {
    if (!win.el.classList.contains('is-active')) return;
    if (!best || Number(win.el.style.zIndex) > Number(best.el.style.zIndex)) best = win;
  });
  return best ? best.id : null;
}

export function focusWindowByKey(key) {
  const win = windows.get(key);
  if (win) focusWindow(win);
}

export function minimizeWindowByKey(key) {
  const win = windows.get(key);
  if (win) minimizeWindow(win);
}

export function toggleMaximizeByKey(key) {
  const win = windows.get(key);
  if (win) toggleMaximize(win);
}

/** Snap a window to half of the work area or back to a centred full size. */
export function snapWindowByKey(key, side) {
  const win = windows.get(key);
  if (!win || isNarrow()) return;
  if (!['left', 'right', 'center'].includes(side)) return;

  const area = workArea();
  const gap = 8;

  if (!win.maximized && !win.snapped) {
    win.prevRect = {
      left: win.el.style.left,
      top: win.el.style.top,
      width: win.el.style.width,
      height: win.el.style.height
    };
  }

  win.maximized = false;
  win.snapped = side;
  win.el.classList.remove('is-maximized');
  win.el.classList.add('is-snapped');
  win.maxBtn.innerHTML = ICONS.maximize;
  win.maxBtn.title = 'Maximize';
  win.maxBtn.setAttribute('aria-label', 'Maximize window');

  const width = area.width - gap * 3;
  const height = area.height - gap * 2;

  if (side === 'left' || side === 'right') {
    const half = Math.round(width / 2);
    win.el.style.top = `${gap}px`;
    win.el.style.height = `${height}px`;
    win.el.style.width = `${half}px`;
    win.el.style.left = side === 'left' ? `${gap}px` : `${gap * 2 + half}px`;
  } else {
    win.el.style.left = `${gap}px`;
    win.el.style.top = `${gap}px`;
    win.el.style.width = `${width}px`;
    win.el.style.height = `${height}px`;
  }

  focusWindow(win);
  notifyChange();
}

export function closeWindowByKey(key) {
  closeWindow(key);
}

export function isWindowOpen(key) {
  return windows.has(key);
}

export function getOpenWindows() {
  return [...windows.keys()];
}

function keepWindowsInBounds() {
  if (!windows.size) return;
  const narrow = isNarrow();

  windows.forEach((win) => {
    if (win.maximized) {
      layoutMaximized(win);
    } else if (win.snapped && !narrow) {
      snapWindowByKey(win.id, win.snapped);
    } else if (narrow || win.wasNarrow) {
      // Crossing the phone/desktop breakpoint re-fits the window for the new space.
      applyInitialRect(win, win.preferredWidth, win.preferredHeight);
    } else {
      clampIntoView(win);
    }
    win.wasNarrow = narrow;
  });
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(keepWindowsInBounds, 90);
});
