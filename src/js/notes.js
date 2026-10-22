/** Notes: persistent local notebook with search, pinning and export. */

import { confirmDialog, escapeHtml, toast } from './ui.js';

const STORAGE_KEY = 'raevix.notes.v1';

const WELCOME = [
  {
    title: 'Welcome to Raevix Notes',
    body: 'Everything here is saved on this device only.\n\n- Type in the editor and it saves itself.\n- Pin important notes so they stay on top.\n- Search covers titles and note bodies.\n- Export writes a .txt file through your browser.\n\nUse the terminal command “note your text” to capture a thought without opening this window.',
    pinned: true
  },
  {
    title: 'Keyboard shortcuts everywhere',
    body: 'Ctrl + Shift + K   command palette\nCtrl + /   this shortcut sheet\nCtrl + Shift + L   lock the desktop\nCtrl + Alt + ← / →   snap the active window\nCtrl + Alt + ↑   maximize\nCtrl + Alt + ↓   minimize\nCtrl + `   cycle windows',
    pinned: false
  }
];

let cache = null;

const uid = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function sanitizeNotes(raw) {
  if (!Array.isArray(raw)) return null;
  const notes = raw
    .filter((note) => note && typeof note === 'object')
    .map((note) => ({
      id: typeof note.id === 'string' && note.id ? note.id : uid(),
      title: typeof note.title === 'string' ? note.title.slice(0, 120) : '',
      body: typeof note.body === 'string' ? note.body.slice(0, 20000) : '',
      pinned: note.pinned === true,
      updated: Number.isFinite(note.updated) ? note.updated : Date.now()
    }));
  return notes.length ? notes : null;
}

function seed() {
  return WELCOME.map((note) => ({
    id: uid(),
    title: note.title,
    body: note.body,
    pinned: note.pinned,
    updated: Date.now()
  }));
}

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { notes: seed(), selected: null };
    const parsed = JSON.parse(raw);
    const notes = sanitizeNotes(parsed?.notes) || seed();
    const selected = notes.some((note) => note.id === parsed?.selected) ? parsed.selected : notes[0].id;
    return { notes, selected };
  } catch (error) {
    console.warn('[Raevix] could not read notes', error);
    return { notes: seed(), selected: null };
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[Raevix] could not save notes', error);
  }
}

function store() {
  if (!cache) {
    cache = read();
    if (!cache.selected && cache.notes.length) cache.selected = cache.notes[0].id;
  }
  return cache;
}

/** Notes public API — also used by the terminal. */
export function listNotes() {
  const { notes } = store();
  return notes
    .slice()
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
    .map((note) => ({ id: note.id, title: note.title || 'Untitled note', pinned: note.pinned, updated: note.updated }));
}

export function createNote(text = '', title = '') {
  const { notes } = store();
  const body = String(text || '');
  const note = {
    id: uid(),
    title: String(title || (body.split('\n')[0] || '').slice(0, 60) || 'Untitled note'),
    body,
    pinned: false,
    updated: Date.now()
  };
  notes.unshift(note);
  cache.selected = note.id;
  persist();
  return note;
}

function removeNote(id) {
  cache.notes = cache.notes.filter((note) => note.id !== id);
  if (cache.selected === id) cache.selected = cache.notes[0]?.id || null;
  persist();
}

const formatDate = (value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });

export function mountNotes(body) {
  const state = store();
  let query = '';
  let saveTimer = 0;

  body.innerHTML = `
    <div class="notes">
      <aside class="notes__side">
        <div class="notes__actions">
          <button class="btn btn--accent" type="button" data-act="new">+ New note</button>
          <span class="notes__count" id="notesCount"></span>
        </div>
        <label class="notes__search">
          <img src="assets/icons/search.svg" alt="" />
          <input type="search" placeholder="Search notes" aria-label="Search notes" autocomplete="off" />
        </label>
        <div class="notes__list" id="notesList" role="list"></div>
      </aside>

      <section class="notes__main">
        <div class="notes__editor" id="notesEditor">
          <div class="notes__toolbar">
            <input class="notes__title" id="noteTitle" type="text" placeholder="Untitled note" aria-label="Note title" maxlength="120" />
            <div class="notes__tools">
              <button class="icon-btn" type="button" data-act="pin" title="Pin note" aria-label="Pin note">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h4l-.6 3.2 2.1 2.1-.9.9H9.8l-.6 4.2L8 14l-1.2-1.6-.6-4.2H4.4l-.9-.9 2.1-2.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
              </button>
              <button class="icon-btn" type="button" data-act="export" title="Download as text" aria-label="Download note as text">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8m0 0 3-3m-3 3L5 7M3 12.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="icon-btn icon-btn--danger" type="button" data-act="delete" title="Delete note" aria-label="Delete note">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
          <textarea class="notes__body" id="noteBody" placeholder="Start writing…" spellcheck="true"></textarea>
          <footer class="notes__foot">
            <span id="noteStats">0 words · 0 characters</span>
            <span class="notes__saved" id="noteSaved">Saved locally</span>
          </footer>
        </div>
        <div class="notes__empty" id="notesEmpty" hidden>
          <h3>No note selected</h3>
          <p>Create a note to start writing. Everything stays in this browser.</p>
          <button class="btn btn--accent" type="button" data-act="new">New note</button>
        </div>
      </section>
    </div>
  `;

  const listHost = body.querySelector('#notesList');
  const countEl = body.querySelector('#notesCount');
  const search = body.querySelector('.notes__search input');
  const titleInput = body.querySelector('#noteTitle');
  const editorBody = body.querySelector('#noteBody');
  const stats = body.querySelector('#noteStats');
  const savedLabel = body.querySelector('#noteSaved');
  const empty = body.querySelector('#notesEmpty');
  const editor = body.querySelector('#notesEditor');

  const current = () => state.notes.find((note) => note.id === state.selected) || null;

  const updateStats = () => {
    const value = editorBody.value;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    stats.textContent = `${words} word${words === 1 ? '' : 's'} · ${value.length} character${value.length === 1 ? '' : 's'}`;
  };

  const renderList = () => {
    const term = query.trim().toLowerCase();
    const notes = state.notes
      .slice()
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
      .filter((note) => !term || `${note.title} ${note.body}`.toLowerCase().includes(term));

    countEl.textContent = `${state.notes.length} note${state.notes.length === 1 ? '' : 's'}`;

    if (!notes.length) {
      listHost.innerHTML = `<p class="notes__none">${term ? 'No notes match that search.' : 'No notes yet.'}</p>`;
      return;
    }

    listHost.replaceChildren(...notes.map((note) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `notes__item${note.id === state.selected ? ' is-active' : ''}`;
      button.setAttribute('role', 'listitem');
      const preview = note.body.replace(/\s+/g, ' ').trim().slice(0, 64) || 'Empty note';
      button.innerHTML = `
        <span class="notes__item-top">
          <strong>${escapeHtml(note.title || 'Untitled note')}</strong>
          ${note.pinned ? '<span class="notes__pin" aria-label="Pinned">★</span>' : ''}
        </span>
        <span class="notes__preview">${escapeHtml(preview)}</span>
        <span class="notes__date">${formatDate(note.updated)}</span>
      `;
      button.addEventListener('click', () => {
        state.selected = note.id;
        persist();
        renderList();
        showSelected();
      });
      return button;
    }));
  };

  const showSelected = () => {
    const note = current();
    editor.hidden = !note;
    empty.hidden = Boolean(note);

    if (!note) {
      titleInput.value = '';
      editorBody.value = '';
      return;
    }

    titleInput.value = note.title;
    editorBody.value = note.body;
    const pinButton = body.querySelector('[data-act="pin"]');
    pinButton.classList.toggle('is-active', note.pinned);
    pinButton.title = note.pinned ? 'Unpin note' : 'Pin note';
    savedLabel.textContent = `Edited ${formatDate(note.updated)}`;
    updateStats();
  };

  const scheduleSave = () => {
    const note = current();
    if (!note) return;

    note.title = titleInput.value;
    note.body = editorBody.value;
    note.updated = Date.now();
    updateStats();
    savedLabel.textContent = 'Saving…';

    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      persist();
      savedLabel.textContent = 'Saved locally';
      renderList();
    }, 260);
  };

  titleInput.addEventListener('input', () => {
    const note = current();
    if (note) {
      note.title = titleInput.value;
      note.updated = Date.now();
    }
    scheduleSave();
  });

  editorBody.addEventListener('input', scheduleSave);

  search.addEventListener('input', () => {
    query = search.value;
    renderList();
  });

  body.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-act]');
    if (!trigger) return;

    switch (trigger.dataset.act) {
      case 'new': {
        const note = createNote('');
        state.notes = store().notes;
        state.selected = note.id;
        renderList();
        showSelected();
        titleInput.focus();
        break;
      }
      case 'pin': {
        const note = current();
        if (!note) return;
        note.pinned = !note.pinned;
        note.updated = Date.now();
        persist();
        body.querySelector('[data-act="pin"]').classList.toggle('is-active', note.pinned);
        renderList();
        toast(note.pinned ? 'Note pinned to the top.' : 'Note unpinned.');
        break;
      }
      case 'delete': {
        const note = current();
        if (!note) return;
        const confirmed = await confirmDialog({
          title: 'Delete this note?',
          message: `“${note.title || 'Untitled note'}” will be removed from this device.`,
          confirmLabel: 'Delete note',
          danger: true
        });
        if (!confirmed) return;
        removeNote(note.id);
        renderList();
        showSelected();
        toast('Note deleted.');
        break;
      }
      case 'export': {
        const note = current();
        if (!note) return;
        const blob = new Blob([`${note.title || 'Untitled note'}\n\n${note.body}`], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${(note.title || 'raevix-note').replace(/[^\w\- ]+/g, '').trim() || 'raevix-note'}.txt`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1500);
        toast('Note downloaded as a text file.');
        break;
      }
      default:
        break;
    }
  });

  editorBody.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = editorBody.selectionStart;
      const end = editorBody.selectionEnd;
      editorBody.value = `${editorBody.value.slice(0, start)}  ${editorBody.value.slice(end)}`;
      editorBody.selectionStart = editorBody.selectionEnd = start + 2;
      scheduleSave();
    }
  });

  renderList();
  showSelected();
}
