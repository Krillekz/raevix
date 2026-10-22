/** Start menu: animated drawer, search, app/game grid and the system reset switch. */

import { getAppList } from './apps.js';
import { getLibrary, openGame } from './games.js';
import { resetSettings } from './settings.js';
import { confirmDialog, escapeHtml, toast } from './ui.js';

export function initStartMenu() {
  const menu = document.getElementById('startMenu');
  const startBtn = document.getElementById('startBtn');
  const search = document.getElementById('startSearch');
  const grid = document.getElementById('startGrid');
  const empty = document.getElementById('startEmpty');
  const resetSwitch = document.getElementById('resetSwitch');

  if (!menu || !startBtn || !grid || !search) return;

  let items = getAppList();
  let isOpen = false;
  let hideTimer = 0;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = query
      ? items.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query))
      : items;

    grid.replaceChildren(...matches.map((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'start-item';
      button.innerHTML = `
        <img src="${item.icon}" alt="" draggable="false" />
        <span class="start-item__meta">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.meta)}</small>
        </span>
      `;
      button.addEventListener('click', () => {
        closeMenu();
        item.run();
      });
      return button;
    }));

    if (empty) empty.hidden = matches.length > 0;
  };

  const openMenu = () => {
    window.clearTimeout(hideTimer);
    menu.hidden = false;
    isOpen = true;
    startBtn.setAttribute('aria-expanded', 'true');
    render();
    window.requestAnimationFrame(() => menu.classList.add('is-open'));
    window.setTimeout(() => search.focus({ preventScroll: true }), 80);
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove('is-open');
    startBtn.setAttribute('aria-expanded', 'false');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (!isOpen) menu.hidden = true;
    }, 280);
    search.value = '';
    if (restoreFocus) startBtn.focus({ preventScroll: true });
  };

  startBtn.addEventListener('click', () => {
    if (isOpen) closeMenu({ restoreFocus: true });
    else openMenu();
  });

  search.addEventListener('input', render);

  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const first = grid.querySelector('.start-item');
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!isOpen) return;
    if (menu.contains(event.target) || startBtn.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });

  // Load the arcade titles once and merge them into the master grid.
  getLibrary()
    .then((library) => {
      const gameItems = library.games.map((game) => ({
        id: `game:${game.id}`,
        title: game.title,
        meta: `Game · ${game.category}`,
        icon: 'assets/icons/games-cabinet.svg',
        run: () => openGame(game)
      }));
      items = [...getAppList(), ...gameItems];
      if (isOpen) render();
    })
    .catch((error) => console.warn('[Raevix] start menu games unavailable', error));

  resetSwitch?.addEventListener('click', async () => {
    resetSwitch.setAttribute('aria-checked', 'true');

    const confirmed = await confirmDialog({
      title: 'Reset Raevix OS?',
      message: 'This clears every saved Raevix preference on this device and reloads the desktop. Game high scores kept by individual games are not touched.',
      confirmLabel: 'Reset system',
      danger: true
    });

    if (!confirmed) {
      resetSwitch.setAttribute('aria-checked', 'false');
      return;
    }

    resetSettings();
    closeMenu();
    toast('System reset — rebooting the desktop…');
    window.setTimeout(() => window.location.reload(), 700);
  });
}
