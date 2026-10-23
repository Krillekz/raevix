/**
 * Terminal: a real command line over the desktop. It can open apps and games,
 * change the theme, write notes, lock the session, inspect open windows and more.
 */

import { APPS, openApp, openWebPage } from './apps.js';
import { getLibrary, openGame } from './games.js';
import { ACCENTS, WALLPAPERS, getAccentColor, getSettings, saveSettings } from './settings.js';
import { evaluateExpression } from './calc-engine.js';
import { createNote, listNotes } from './notes.js';
import { closeWindowByKey, focusWindowByKey, getWindowsInfo } from './window-manager.js';
import { escapeHtml, toast } from './ui.js';

const START = Date.now();

const APP_IDS = [
  'browser', 'wikipedia', 'archive', 'games', 'hianime', 'anime', 'notes', 'calculator', 'terminal',
  'taskmanager', 'paint', 'music', 'clock', 'proxy', 'guide', 'settings', 'trash'
];

const COMMANDS = [
  'help', 'clear', 'apps', 'ls', 'games', 'play', 'open', 'web', 'wiki', 'search', 'note', 'notes',
  'calc', 'accent', 'wallpaper', 'set', 'theme', 'session', 'close', 'lock', 'palette', 'shortcuts',
  'time', 'date', 'uptime', 'whoami', 'neofetch', 'history', 'echo', 'reboot', 'exit'
];

const pad = (value) => String(value).padStart(2, '0');

function bootTime() {
  const elapsed = Math.floor((Date.now() - START) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  return [hours, minutes, seconds].filter(Boolean).length > 1
    ? `${hours ? `${hours}h ` : ''}${minutes}m ${seconds}s`
    : `${seconds}s`;
}

export function mountTerminal(body, win) {
  let history = [];
  let cursor = 0;

  body.innerHTML = `
    <div class="term" tabindex="0">
      <div class="term__screen" id="termScreen" role="log" aria-live="polite"></div>
      <form class="term__form" autocomplete="off">
        <span class="term__prompt">raevix@desktop:~$</span>
        <input class="term__input" id="termInput" type="text" spellcheck="false" aria-label="Terminal command" />
      </form>
    </div>
  `;

  const term = body.querySelector('.term');
  const screen = body.querySelector('#termScreen');
  const form = body.querySelector('.term__form');
  const input = body.querySelector('#termInput');

  const scroll = () => {
    screen.scrollTop = screen.scrollHeight;
  };

  const print = (text = '', tone = '') => {
    const line = document.createElement('div');
    line.className = `term__line${tone ? ` term__line--${tone}` : ''}`;
    line.textContent = text;
    screen.append(line);
    scroll();
  };

  const printHtml = (html, tone = '') => {
    const line = document.createElement('div');
    line.className = `term__line${tone ? ` term__line--${tone}` : ''}`;
    line.innerHTML = html;
    screen.append(line);
    scroll();
  };

  const printEcho = (command) => {
    const line = document.createElement('div');
    line.className = 'term__line term__line--echo';
    line.innerHTML = '<span class="term__prompt">raevix@desktop:~$</span> ';
    line.append(document.createTextNode(command));
    screen.append(line);
  };

  const printColumns = (rows) => {
    const width = Math.max(...rows.map(([left]) => left.length)) + 2;
    rows.forEach(([left, right]) => print(`${left.padEnd(width)}${right}`));
  };

  const helpText = () => {
    print('Raevix shell — commands run against the live desktop.', 'dim');
    print('');
    printColumns([
      ['help', 'this list'],
      ['apps / ls', 'installed applications'],
      ['games', 'arcade library'],
      ['play <id|title>', 'launch a game'],
      ['open <app>', 'focus or launch an app'],
      ['web <url>', 'open a page in a Private Browser window'],
      ['wiki <query>', 'search Wikipedia in a window'],
      ['note <text> / notes', 'capture and list notes'],
      ['calc <expression>', 'evaluate maths'],
      ['accent <name>', 'switch accent colour'],
      ['wallpaper <id>', 'switch wallpaper'],
      ['set <key> on|off', 'glow, motion, scanlines, sounds, restoreSession, clock24, hint'],
      ['session / close <n>', 'inspect and close open windows'],
      ['lock / palette / shortcuts', 'shell controls'],
      ['neofetch / uptime', 'system information'],
      ['clear / history / reboot / exit', 'shell housekeeping']
    ]);
    print('');
    print('Tip: Tab completes commands, ↑ recalls history.', 'dim');
  };

  const execute = async (raw) => {
    const command = raw.trim();
    if (!command) return;

    history.push(command);
    history = history.slice(-80);
    cursor = history.length;

    const [name, ...rest] = command.split(/\s+/);
    const args = rest.join(' ');
    const settings = getSettings();

    switch (name.toLowerCase()) {
      case 'help':
      case '?':
        helpText();
        break;

      case 'clear':
      case 'cls':
        screen.replaceChildren();
        break;

      case 'apps':
      case 'ls':
        printColumns(APP_IDS.map((id) => [id, APPS[id]?.title || id]));
        break;

      case 'games': {
        const library = await getLibrary();
        const shown = library.games.slice(0, 40);
        printColumns(shown.map((game, index) => [`${String(index + 1).padStart(2, ' ')}. ${game.id}`, `${game.title} · ${game.category}${game.provider ? ' · web' : game.web ? ' · live web' : ''}`]));
        print(`${library.games.length} titles in the cabinet — showing the first 40.`, 'dim');
        print('Launch with: play <id>, or browse everything in the Games Cabinet.', 'dim');
        break;
      }

      case 'play': {
        if (!args) {
          print('Usage: play <game id or title>', 'error');
          break;
        }
        const library = await getLibrary();
        const needle = args.toLowerCase();
        const game = library.games.find((entry) => entry.id.toLowerCase() === needle)
          || library.games.find((entry) => entry.title.toLowerCase().includes(needle));
        if (!game) {
          print(`No game matches “${args}”. Try: games`, 'error');
          break;
        }
        print(`Launching ${game.title}…`);
        openGame(game);
        break;
      }

      case 'open': {
        const key = args.toLowerCase();
        if (!APP_IDS.includes(key)) {
          print(`Unknown app “${args || ''}”. Try: apps`, 'error');
          break;
        }
        print(`Opening ${key}…`);
        openApp(key);
        break;
      }

      case 'web': {
        if (!/^https?:\/\//i.test(args)) {
          print('Usage: web https://example.com', 'error');
          break;
        }
        openWebPage(args);
        print(`Opening ${args} in a Private Browser window.`);
        break;
      }

      case 'wiki': {
        if (!args) {
          print('Usage: wiki <topic>', 'error');
          break;
        }
        const url = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(args)}`;
        openWebPage(url);
        print(`Wikipedia search for “${args}”.`);
        break;
      }

      case 'search': {
        if (!args) {
          print('Usage: search <query>', 'error');
          break;
        }
        const opened = window.open(`https://duckduckgo.com/?q=${encodeURIComponent(args)}`, '_blank', 'noopener');
        print(opened ? 'Search opened in a new tab.' : 'Pop-up blocked — search unavailable.', opened ? '' : 'error');
        break;
      }

      case 'note': {
        if (!args) {
          print('Usage: note <text>', 'error');
          break;
        }
        const note = createNote(args);
        print(`Saved note “${note.title}”.`);
        break;
      }

      case 'notes': {
        const notes = listNotes();
        if (!notes.length) {
          print('No notes yet. Try: note remember the milk', 'dim');
          break;
        }
        printColumns(notes.map((note, index) => [`${index + 1}.`, `${note.pinned ? '★ ' : ''}${note.title}`]));
        break;
      }

      case 'calc': {
        if (!args) {
          print('Usage: calc 12 * (3 + 4)', 'error');
          break;
        }
        const result = evaluateExpression(args);
        if (result.ok) print(`${args} = ${result.display}`, 'success');
        else print(result.error, 'error');
        break;
      }

      case 'accent': {
        const requested = args.toLowerCase();
        if (!requested) {
          print(`Current accent: ${settings.accent} (${getAccentColor()})`, 'dim');
          printColumns(Object.entries(ACCENTS).map(([id, meta]) => [id, meta.color]));
          break;
        }
        if (!ACCENTS[requested]) {
          print(`Unknown accent “${args}”.`, 'error');
          break;
        }
        saveSettings({ accent: requested });
        print(`Accent set to ${ACCENTS[requested].label}.`, 'success');
        break;
      }

      case 'wallpaper': {
        const requested = args.toLowerCase();
        if (!requested) {
          printColumns(WALLPAPERS.map((wallpaper) => [wallpaper.id, wallpaper.label]));
          break;
        }
        if (!WALLPAPERS.some((wallpaper) => wallpaper.id === requested)) {
          print(`Unknown wallpaper “${args}”.`, 'error');
          break;
        }
        saveSettings({ wallpaper: requested });
        print(`Wallpaper set to ${requested}.`, 'success');
        break;
      }

      case 'set': {
        const [key, value] = args.split(/\s+/);
        const allowed = ['glow', 'motion', 'scanlines', 'sounds', 'restoreSession', 'clock24', 'hint'];
        if (!allowed.includes(key) || !['on', 'off'].includes(String(value).toLowerCase())) {
          print('Usage: set <glow|motion|scanlines|sounds|restoreSession|clock24|hint> <on|off>', 'error');
          break;
        }
        saveSettings({ [key]: value.toLowerCase() === 'on' });
        print(`${key} → ${value.toLowerCase()}`, 'success');
        break;
      }

      case 'theme': {
        print(`Accent     ${settings.accent} ${getAccentColor()}`);
        print(`Wallpaper  ${settings.wallpaper}`);
        print(`Glow       ${settings.glow ? 'on' : 'off'}`);
        print(`Motion     ${settings.motion ? 'on' : 'off'}`);
        print(`Scanlines  ${settings.scanlines ? 'on' : 'off'}`);
        print(`Sounds     ${settings.sounds ? 'on' : 'off'}`);
        break;
      }

      case 'session': {
        const open = getWindowsInfo();
        if (!open.length) {
          print('No windows open — impressively tidy.', 'dim');
          break;
        }
        printColumns(open.map((entry, index) => [
          `${index + 1}.`,
          `${entry.title}${entry.minimized ? ' (minimised)' : ''}${entry.maximized ? ' (maximised)' : ''}${entry.active ? ' •' : ''}`
        ]));
        break;
      }

      case 'close': {
        if (args.toLowerCase() === 'all') {
          getWindowsInfo().forEach((entry) => closeWindowByKey(entry.key));
          print('All windows closed.', 'success');
          break;
        }
        const index = Number(args) - 1;
        const open = getWindowsInfo();
        if (!Number.isInteger(index) || !open[index]) {
          print(`Usage: close <1-${open.length}> or close all`, 'error');
          break;
        }
        closeWindowByKey(open[index].key);
        print(`Closed ${open[index].title}.`);
        break;
      }

      case 'focus': {
        const app = `app:${args.toLowerCase()}`;
        focusWindowByKey(app);
        break;
      }

      case 'lock':
        print('Locking session…');
        document.dispatchEvent(new CustomEvent('raevix:lock'));
        break;

      case 'palette':
        document.dispatchEvent(new CustomEvent('raevix:palette'));
        break;

      case 'shortcuts':
        document.dispatchEvent(new CustomEvent('raevix:shortcuts'));
        break;

      case 'time':
        print(new Date().toLocaleTimeString());
        break;

      case 'date':
        print(new Date().toLocaleString());
        break;

      case 'uptime':
        print(`up ${bootTime()} · ${getWindowsInfo().length} window(s) open`);
        break;

      case 'whoami':
        print('raevik — guest session, local profile, zero telemetry.');
        break;

      case 'neofetch':
        printHtml(`
          <pre class="term__ascii">   ▄▄▄▄▄▄▄▄▄
  █  R A E V I X  █   <span class="term__accent">raevik@desktop</span>
   ▀▀▀▀▀▀▀▀▀▀▀▀▀    <span class="term__dim">---------------</span>
                     <span class="term__dim">OS</span>      Raevix OS 2.3
                     <span class="term__dim">Shell</span>   raevix-sh
                     <span class="term__dim">Uptime</span>  ${bootTime()}
                     <span class="term__dim">Accent</span>  ${escapeHtml(settings.accent)} ${getAccentColor()}
                     <span class="term__dim">Windows</span> ${getWindowsInfo().length}
                     <span class="term__dim">Credits</span> Raevik</pre>
        `);
        break;

      case 'history':
        history.forEach((entry, index) => print(`${String(index + 1).padStart(2, ' ')}  ${entry}`));
        break;

      case 'echo':
        print(args);
        break;

      case 'reboot':
        print('Rebooting Raevix OS…', 'success');
        window.setTimeout(() => window.location.reload(), 500);
        break;

      case 'exit':
      case 'quit':
        if (win) closeWindowByKey(win.id);
        break;

      default:
        print(`raevix-sh: command not found: ${escapeHtml(name)}`, 'error');
        print('Type “help” for the command list.', 'dim');
        toast(`Unknown command: ${name}`);
        break;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = '';
    printEcho(value);
    execute(value).catch((error) => {
      console.error('[Raevix] terminal command failed', error);
      print(`Command failed: ${error.message}`, 'error');
    });
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor] || '';
      window.requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] || '';
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const match = COMMANDS.find((command) => command.startsWith(input.value.toLowerCase()));
      if (match) input.value = `${match} `;
    }
  });

  term.addEventListener('pointerdown', (event) => {
    if (event.target.closest('a')) return;
    window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  });

  print('Raevix shell 2.3 — local guest session', 'accent');
  print('Type “help” for commands, or “neofetch” for the flex.', 'dim');
  print('');
  input.focus({ preventScroll: true });
  win?.addCleanup?.(() => {
    history = [];
  });
}
