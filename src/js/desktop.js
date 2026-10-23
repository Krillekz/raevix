/** Desktop shortcut grid: selection, double-click launch and touch support. */

import { openApp } from './apps.js';

const SHORTCUTS = [
  { label: 'Private Browser', icon: 'assets/icons/private-browser.svg', app: 'browser' },
  { label: 'Games Cabinet', icon: 'assets/icons/games-cabinet.svg', app: 'games' },
  { label: 'Notes', icon: 'assets/icons/notes.svg', app: 'notes' },
  { label: 'Terminal', icon: 'assets/icons/terminal.svg', app: 'terminal' },
  { label: 'Paint', icon: 'assets/icons/paint.svg', app: 'paint' },
  { label: 'Music', icon: 'assets/icons/music.svg', app: 'music' },
  { label: 'Calculator', icon: 'assets/icons/calculator.svg', app: 'calculator' },
  { label: 'Clock & Timers', icon: 'assets/icons/clock.svg', app: 'clock' },
  { label: 'Task Manager', icon: 'assets/icons/task-manager.svg', app: 'taskmanager' },
  { label: 'Wikipedia', icon: 'assets/icons/wiki.svg', app: 'wikipedia' },
  { label: 'Internet Archive', icon: 'assets/icons/archive.svg', app: 'archive' },
  { label: 'HiAnime', icon: 'assets/icons/hianime.svg', app: 'hianime' },
  { label: 'Quick Guide', icon: 'assets/icons/guide.svg', app: 'guide' },
  { label: 'Proxy Mock', icon: 'assets/icons/proxy-mock.svg', app: 'proxy' },
  { label: 'Settings', icon: 'assets/icons/settings.svg', app: 'settings' },
  { label: 'Trash Bin', icon: 'assets/icons/trash.svg', app: 'trash' }
];

export function initDesktop() {
  const host = document.getElementById('desktopIcons');
  if (!host) return;

  const buttons = SHORTCUTS.map((shortcut) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shortcut';
    button.title = `Open ${shortcut.label}`;
    button.innerHTML = `
      <img src="${shortcut.icon}" alt="" draggable="false" />
      <span class="shortcut__label">${shortcut.label}</span>
    `;

    const select = () => {
      buttons.forEach((other) => other.classList.toggle('is-selected', other === button));
    };

    const launch = () => {
      select();
      openApp(shortcut.app);
    };

    button.addEventListener('click', select);
    button.addEventListener('dblclick', launch);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        launch();
      }
    });
    // Touch has no reliable double-click: a single tap launches.
    button.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch') launch();
    });

    return button;
  });

  host.replaceChildren(...buttons);

  const desktop = document.getElementById('desktop');
  desktop?.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.shortcut')) return;
    buttons.forEach((button) => button.classList.remove('is-selected'));
  });
}
