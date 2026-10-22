/** Task Manager: live system metrics plus focus, minimise and close for every window. */

import {
  closeWindowByKey,
  focusWindowByKey,
  getWindowsInfo,
  minimizeWindowByKey,
  toggleMaximizeByKey
} from './window-manager.js';
import { confirmDialog, escapeHtml, toast } from './ui.js';

const started = performance.now();

function readStorageBytes() {
  let bytes = 0;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) || '';
      bytes += (key.length + (window.localStorage.getItem(key) || '').length) * 2;
    }
  } catch {
    return 0;
  }
  return bytes;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUptime(ms) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function mountTaskManager(body, win) {
  body.innerHTML = `
    <div class="tasks">
      <header class="tasks__head">
        <div>
          <p class="eyebrow">System</p>
          <h3 class="app__title">Task Manager</h3>
          <p class="app__sub">Everything below is measured live in this tab.</p>
        </div>
        <div class="tasks__actions">
          <button class="btn btn--small" type="button" data-act="refresh">Refresh</button>
          <button class="btn btn--small btn--danger" type="button" data-act="endAll">End all</button>
        </div>
      </header>

      <div class="tasks__stats">
        <article class="stat">
          <span class="stat__label">Frame rate</span>
          <strong id="statFps">—</strong>
          <div class="stat__bar"><i id="statFpsBar"></i></div>
        </article>
        <article class="stat">
          <span class="stat__label">JS heap</span>
          <strong id="statMemory">Unavailable</strong>
          <small id="statMemoryNote">Chrome exposes this metric</small>
        </article>
        <article class="stat">
          <span class="stat__label">Local storage</span>
          <strong id="statStorage">0 B</strong>
          <small>Raevix keys only</small>
        </article>
        <article class="stat">
          <span class="stat__label">Uptime</span>
          <strong id="statUptime">0s</strong>
          <small id="statNetwork">Online</small>
        </article>
      </div>

      <div class="tasks__table">
        <div class="tasks__row tasks__row--head">
          <span>Window</span>
          <span>State</span>
          <span>Z</span>
          <span>Actions</span>
        </div>
        <div id="tasksRows"></div>
        <p class="tasks__empty" id="tasksEmpty" hidden>No windows are open. Launch something from the Start menu.</p>
      </div>

      <footer class="tasks__foot">
        <span>DOM nodes: <strong id="statNodes">0</strong></span>
        <span>Windows: <strong id="statWindows">0</strong></span>
        <span>Storage engine: <strong>localStorage</strong></span>
      </footer>
    </div>
  `;

  const rowsHost = body.querySelector('#tasksRows');
  const empty = body.querySelector('#tasksEmpty');
  const fpsEl = body.querySelector('#statFps');
  const fpsBar = body.querySelector('#statFpsBar');
  const memoryEl = body.querySelector('#statMemory');
  const memoryNote = body.querySelector('#statMemoryNote');
  const storageEl = body.querySelector('#statStorage');
  const uptimeEl = body.querySelector('#statUptime');
  const networkEl = body.querySelector('#statNetwork');
  const nodesEl = body.querySelector('#statNodes');
  const windowsEl = body.querySelector('#statWindows');

  let frames = 0;
  let fps = 0;
  let rafId = 0;
  let lastSample = performance.now();
  let disposed = false;

  const tickFrames = () => {
    if (disposed) return;
    frames += 1;
    const now = performance.now();
    if (now - lastSample >= 1000) {
      fps = Math.round((frames * 1000) / (now - lastSample));
      frames = 0;
      lastSample = now;
    }
    rafId = window.requestAnimationFrame(tickFrames);
  };

  const renderRows = () => {
    const open = getWindowsInfo().sort((a, b) => b.z - a.z);
    windowsEl.textContent = String(open.length);
    empty.hidden = open.length > 0;

    rowsHost.replaceChildren(...open.map((entry) => {
      const row = document.createElement('div');
      row.className = `tasks__row${entry.active ? ' is-active' : ''}`;
      row.innerHTML = `
        <span class="tasks__name">
          <img src="${escapeHtml(entry.icon)}" alt="" />
          <strong>${escapeHtml(entry.title)}</strong>
        </span>
        <span class="tasks__state">${entry.minimized ? 'Minimised' : entry.maximized ? 'Maximised' : 'Running'}</span>
        <span class="tasks__z">${entry.z}</span>
        <span class="tasks__buttons">
          <button class="icon-btn" type="button" data-focus="${escapeHtml(entry.key)}" title="Focus" aria-label="Focus ${escapeHtml(entry.title)}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>
          </button>
          <button class="icon-btn" type="button" data-min="${escapeHtml(entry.key)}" title="Minimise" aria-label="Minimise ${escapeHtml(entry.title)}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
          <button class="icon-btn" type="button" data-max="${escapeHtml(entry.key)}" title="Maximise or restore" aria-label="Maximise or restore ${escapeHtml(entry.title)}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.6" y="3.6" width="8.8" height="8.8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
          <button class="icon-btn icon-btn--danger" type="button" data-close="${escapeHtml(entry.key)}" title="End task" aria-label="Close ${escapeHtml(entry.title)}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.4 4.4 7.2 7.2M11.6 4.4l-7.2 7.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </span>
      `;
      return row;
    }));
  };

  const renderStats = () => {
    fpsEl.textContent = fps ? `${fps} fps` : '—';
    fpsBar.style.width = `${Math.min(100, (fps / 120) * 100)}%`;
    fpsBar.dataset.state = fps >= 50 ? 'good' : fps >= 25 ? 'ok' : 'low';

    const memory = performance.memory;
    if (memory && Number.isFinite(memory.usedJSHeapSize)) {
      memoryEl.textContent = formatBytes(memory.usedJSHeapSize);
      memoryNote.textContent = `Limit ${formatBytes(memory.jsHeapSizeLimit)}`;
    } else {
      memoryEl.textContent = 'Unavailable';
      memoryNote.textContent = 'Not exposed by this browser';
    }

    storageEl.textContent = formatBytes(readStorageBytes());
    uptimeEl.textContent = formatUptime(performance.now() - started);
    nodesEl.textContent = String(document.getElementsByTagName('*').length);
    networkEl.textContent = navigator.onLine ? 'Network online' : 'Offline';
    networkEl.dataset.state = navigator.onLine ? 'online' : 'offline';
  };

  const refresh = () => {
    renderRows();
    renderStats();
  };

  body.addEventListener('click', async (event) => {
    const control = event.target.closest('button');
    if (!control) return;

    if (control.dataset.act === 'refresh') {
      refresh();
      toast('Metrics refreshed.');
      return;
    }

    if (control.dataset.act === 'endAll') {
      const count = getWindowsInfo().length;
      if (!count) {
        toast('No windows to close.');
        return;
      }
      const confirmed = await confirmDialog({
        title: 'End every task?',
        message: `This closes all ${count} open windows, including this one. Unsaved work in other apps may be lost.`,
        confirmLabel: 'End all',
        danger: true
      });
      if (!confirmed) return;
      getWindowsInfo().forEach((entry) => closeWindowByKey(entry.key));
      toast('All windows closed.');
      return;
    }

    if (control.dataset.focus) {
      focusWindowByKey(control.dataset.focus);
      renderRows();
    } else if (control.dataset.min) {
      minimizeWindowByKey(control.dataset.min);
      renderRows();
    } else if (control.dataset.max) {
      toggleMaximizeByKey(control.dataset.max);
      renderRows();
    } else if (control.dataset.close) {
      closeWindowByKey(control.dataset.close);
      renderRows();
    }
  });

  document.addEventListener('raevix:windows', refresh);
  window.addEventListener('online', renderStats);
  window.addEventListener('offline', renderStats);

  const interval = window.setInterval(refresh, 1200);

  win?.addCleanup?.(() => {
    disposed = true;
    window.clearInterval(interval);
    window.cancelAnimationFrame(rafId);
    document.removeEventListener('raevix:windows', refresh);
    window.removeEventListener('online', renderStats);
    window.removeEventListener('offline', renderStats);
  });

  rafId = window.requestAnimationFrame(tickFrames);
  refresh();
}
