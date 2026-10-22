/** Tiny synthesised interface sounds. Honours the “Interface sounds” setting. */

import { getSettings } from './settings.js';

let context = null;

function ensureContext() {
  if (context) return context;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    context = new AudioCtx();
  } catch (error) {
    console.warn('[Raevix] audio unavailable', error);
    return null;
  }
  return context;
}

function tone(frequency, duration, { type = 'sine', gain = 0.05, delay = 0, slide = 0 } = {}) {
  const ctx = ensureContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), start + duration);

  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** @param {'open'|'close'|'click'|'success'|'error'|'alarm'} name */
export function sfx(name) {
  if (!getSettings().sounds) return;

  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  switch (name) {
    case 'open':
      tone(520, 0.1, { type: 'triangle', gain: 0.035 });
      tone(780, 0.14, { type: 'triangle', gain: 0.03, delay: 0.05 });
      break;
    case 'close':
      tone(620, 0.1, { type: 'triangle', gain: 0.03 });
      tone(410, 0.12, { type: 'triangle', gain: 0.025, delay: 0.05 });
      break;
    case 'click':
      tone(320, 0.05, { type: 'square', gain: 0.018 });
      break;
    case 'success':
      tone(523, 0.1, { type: 'sine', gain: 0.035 });
      tone(659, 0.1, { type: 'sine', gain: 0.035, delay: 0.09 });
      tone(784, 0.18, { type: 'sine', gain: 0.04, delay: 0.18 });
      break;
    case 'error':
      tone(190, 0.16, { type: 'sawtooth', gain: 0.03, slide: -60 });
      break;
    case 'alarm':
      [0, 0.42, 0.84].forEach((delay) => {
        tone(880, 0.22, { type: 'square', gain: 0.05, delay });
        tone(1180, 0.18, { type: 'sine', gain: 0.03, delay: delay + 0.08 });
      });
      break;
    default:
      break;
  }
}

/** Long triple beep used when a countdown reaches zero. */
export function playAlarm() {
  sfx('alarm');
}
