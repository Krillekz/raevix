/** Persisted Raevix OS preferences. */

const STORAGE_KEY = 'raevix.settings.v1';

export const ACCENTS = {
  crimson: { label: 'Crimson', color: '#ff2f4d' },
  ember: { label: 'Ember', color: '#ff8a3d' },
  sakura: { label: 'Sakura', color: '#ff6fae' },
  violet: { label: 'Violet', color: '#b06bff' },
  cyan: { label: 'Cyan', color: '#3ad8ff' },
  lime: { label: 'Lime', color: '#74f06a' }
};

export const WALLPAPERS = [
  { id: 'nebula', label: 'Nebula', note: 'Signature red' },
  { id: 'aurora', label: 'Aurora', note: 'Accent glow' },
  { id: 'grid', label: 'Grid', note: 'Horizon lines' },
  { id: 'void', label: 'Void', note: 'Minimal' },
  { id: 'idol', label: 'Sakura Idol', note: 'Anime · animated' },
  { id: 'ronin', label: 'Neon Ronin', note: 'Anime · animated' }
];

const DEFAULTS = {
  glow: true,
  motion: true,
  clock24: false,
  hint: true,
  scanlines: true,
  sounds: true,
  restoreSession: true,
  accent: 'crimson',
  customAccent: '#ff2f4d',
  wallpaper: 'nebula'
};

function normalizeHex(value) {
  const raw = String(value || '').trim().replace('#', '');
  const expanded = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return /^[0-9a-f]{6}$/i.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

function channels(hex) {
  const value = normalizeHex(hex) || DEFAULTS.customAccent;
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16)
  };
}

function toHex({ r, g, b }) {
  const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(hex, target, amount) {
  const a = channels(hex);
  const b = channels(target);
  return toHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount
  });
}

function triplet(hex) {
  const { r, g, b } = channels(hex);
  return `${r}, ${g}, ${b}`;
}

function sanitize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const next = { ...DEFAULTS };

  ['glow', 'motion', 'clock24', 'hint', 'scanlines', 'sounds', 'restoreSession'].forEach((key) => {
    if (typeof source[key] === 'boolean') next[key] = source[key];
  });

  const custom = normalizeHex(source.customAccent);
  if (custom) next.customAccent = custom;

  if (source.accent === 'custom') next.accent = 'custom';
  else if (ACCENTS[source.accent]) next.accent = source.accent;

  if (WALLPAPERS.some((wallpaper) => wallpaper.id === source.wallpaper)) {
    next.wallpaper = source.wallpaper;
  }

  return next;
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('[Raevix] could not read settings', error);
    return {};
  }
}

let current = sanitize(readStored());

/** The active accent colour, resolving the custom picker when selected. */
export function getAccentColor(settings = current) {
  if (settings.accent === 'custom') {
    return normalizeHex(settings.customAccent) || DEFAULTS.customAccent;
  }
  return ACCENTS[settings.accent]?.color || ACCENTS.crimson.color;
}

export function getSettings() {
  return { ...current };
}

export function applySettings() {
  const body = document.body;
  const root = document.documentElement;
  const accent = getAccentColor(current);
  const soft = mix(accent, '#ffffff', 0.34);

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-2', soft);
  root.style.setProperty('--accent-rgb', triplet(accent));
  root.style.setProperty('--accent-2-rgb', triplet(soft));
  root.style.setProperty('--accent-tint', `color-mix(in srgb, ${accent} 42%, #ffffff)`);
  root.style.setProperty('--accent-bright', `color-mix(in srgb, ${accent} 76%, #ffffff)`);

  body.dataset.wallpaper = current.wallpaper;
  body.classList.toggle('no-glow', !current.glow);
  body.classList.toggle('no-motion', !current.motion);
  body.classList.toggle('no-scanlines', !current.scanlines);

  const hint = document.getElementById('desktopHint');
  if (hint) hint.hidden = !current.hint;
}

export function saveSettings(patch) {
  current = sanitize({ ...current, ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // Do not leave a stale restore list behind when the feature is switched off.
    if (!current.restoreSession) window.localStorage.removeItem('raevix.session.v1');
  } catch (error) {
    console.warn('[Raevix] could not persist settings', error);
  }
  applySettings();
  return getSettings();
}

export function resetSettings() {
  current = { ...DEFAULTS };
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('raevix.session.v1');
  } catch (error) {
    console.warn('[Raevix] could not clear settings', error);
  }
  applySettings();
  return getSettings();
}
