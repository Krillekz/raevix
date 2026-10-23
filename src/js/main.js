/** Raevix OS entry point: boot sequence, clock, desktop and Start menu. */

import { applySettings, getSettings } from './settings.js';
import { initDesktop } from './desktop.js';
import { initStartMenu } from './start-menu.js';
import { initShell } from './shell.js';
import { getLibrary } from './games.js';
import { getAppList } from './apps.js';
import { toast } from './ui.js';

function startClock() {
  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');
  if (!timeEl || !dateEl) return;

  const tick = () => {
    const now = new Date();
    const use24 = getSettings().clock24;

    timeEl.textContent = now
      .toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: !use24
      })
      .toUpperCase();

    dateEl.textContent = now.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  tick();
  window.setInterval(tick, 1000);
}

function startBootSequence() {
  const boot = document.getElementById('boot');
  const skip = document.getElementById('bootSkip');
  if (!boot) return;

  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    boot.classList.add('is-done');
    document.removeEventListener('keydown', onKey);
    window.setTimeout(() => boot.remove(), 650);
  };

  const onKey = (event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') finish();
  };

  skip?.addEventListener('click', finish);
  boot.addEventListener('click', finish);
  document.addEventListener('keydown', onKey);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(finish, reduced ? 400 : 1600);
}

function announceReady() {
  getLibrary()
    .then((library) => {
      const count = library.games.length;
      window.setTimeout(() => {
        toast(count > 0
          ? `Raevix OS 2.2 online — ${getAppList().length} apps and ${count} arcade titles. Ctrl+Shift+K for commands.`
          : 'Raevix OS 2.2 online — Ctrl+Shift+K for commands.');
      }, 1900);
    })
    .catch(() => {
      window.setTimeout(() => toast('Raevix OS online.'), 1900);
    });
}

/** Seed the drifting petals and embers for the animated anime wallpapers. */
function seedAnimeBackdrop() {
  document.querySelectorAll('.anime-fx').forEach((host) => {
    const petals = host.dataset.fx === 'petals';
    const count = petals ? 18 : 16;

    for (let i = 0; i < count; i += 1) {
      const mote = document.createElement('i');
      mote.className = petals ? 'petal' : 'ember';
      mote.style.setProperty('--x', `${(Math.random() * 104 - 2).toFixed(1)}%`);
      mote.style.setProperty('--size', `${(petals ? 5 + Math.random() * 7 : 2 + Math.random() * 3).toFixed(1)}px`);
      mote.style.setProperty('--dur', `${(petals ? 10 + Math.random() * 10 : 12 + Math.random() * 10).toFixed(1)}s`);
      mote.style.setProperty('--delay', `${(-Math.random() * 20).toFixed(1)}s`);
      mote.style.setProperty('--drift', `${(Math.random() * 180 - 90).toFixed(0)}px`);
      host.append(mote);
    }
  });
}

applySettings();
seedAnimeBackdrop();
initDesktop();
initStartMenu();
initShell();
startClock();
startBootSequence();
announceReady();
