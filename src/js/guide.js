/** Quick Guide — a short in-system reference for the desktop's own features. */

const SECTIONS = [
  {
    title: 'Getting around',
    rows: [
      ['Shortcuts', 'Double-click a desktop icon to launch it. On touch screens a single tap opens the app.'],
      ['Windows', 'Drag the title bar to move a window. Use the bar buttons to minimise, maximise or close it.'],
      ['Taskbar', 'Every open window has a taskbar button. Click it to minimise or bring the window back.'],
      ['Command palette', 'Ctrl + Shift + K (or the magnifier beside Start) searches every app, game and desktop action at once.'],
      ['Snapping', 'Drag a window to the left or right edge for half the screen, or to the top to maximise. Ctrl + Alt + arrows do the same.'],
      ['Session', 'Windows reopen after a reload, unless you switch off “Restore windows” in Settings.']
    ]
  },
  {
    title: 'Make it yours',
    rows: [
      ['Accent', 'Six presets or any colour you like — it recolours windows, glow, buttons and the wallpaper tint.'],
      ['Wallpaper', 'Nebula is the original artwork. Aurora, Grid and Void follow the accent; Sakura Idol and Neon Ronin are animated character scenes.'],
      ['Effects', 'Neon glow, scanlines, motion, interface sounds and the 24-hour clock all live in Settings and persist on this device.'],
      ['Desktop menu', 'Right-click the wallpaper for a quick menu: new note, terminal, palette, wallpaper, scanlines, lock and shortcuts.']
    ]
  },
  {
    title: 'Built-in apps',
    rows: [
      ['Notes', 'A local notebook with search, pinning, autosave and text export. Terminal “note” commands land here too.'],
      ['Terminal', 'A working shell: open apps and games, change accent or wallpaper, write notes, inspect windows and more. Type “help”.'],
      ['Paint', 'Neon brush and eraser, six colours plus a custom picker, undo, clear and PNG export. B is brush, E is eraser.'],
      ['Music', 'Three original WebAudio chiptune loops with a live spectrum, track list and volume. Everything is synthesised locally.'],
      ['Clocks', 'Analog and digital clock, four world zones, a lap stopwatch and a countdown with presets and an alarm.'],
      ['Utilities', 'Calculator keeps a persistent tape; Task Manager shows real frame rate, memory and storage and can focus, minimise or close windows.']
    ]
  },
  {
    title: 'Private Browser',
    rows: [
      ['Pins', 'The star pins the current page for this session only. Closing the window wipes history and pins.'],
      ['Blocked sites', 'Pages that send X-Frame-Options cannot be embedded. Use the external-open arrow to load them in a real tab.'],
      ['Addresses', 'Full URLs, bare domains, local paths such as games/local/neon-pong.html, or a search phrase.']
    ]
  },
  {
    title: 'Arcade and shortcuts',
    rows: [
      ['Cabinet', 'Local games plus six web portals. The search field and category tabs filter the shelf.'],
      ['Wikipedia & Archive', 'These open straight inside a Private Browser window, already on the page.'],
      ['LunarX', 'Opens in a new tab: the site refuses embedding and sits behind a Cloudflare check.']
    ]
  }
];

export function mountGuide(body) {
  const sections = SECTIONS.map((section) => `
    <section class="guide__card">
      <h4>${section.title}</h4>
      <dl class="guide__rows">
        ${section.rows.map(([term, text]) => `
          <div class="guide__row">
            <dt>${term}</dt>
            <dd>${text}</dd>
          </div>
        `).join('')}
      </dl>
    </section>
  `).join('');

  body.innerHTML = `
    <div class="guide">
      <header class="guide__hero">
        <p class="eyebrow">Help</p>
        <h3 class="app__title">Quick Guide</h3>
        <p class="app__sub">Everything Raevix OS does, in one short window.</p>
      </header>

      ${sections}

      <p class="guide__foot">Raevix OS v2.0 · artwork and code by Raevik</p>
    </div>
  `;
}
