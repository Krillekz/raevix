/**
 * Music: a tiny WebAudio sequencer playing original chiptune loops.
 * No samples, no network — every note is synthesised in the browser.
 */

import { escapeHtml, toast } from './ui.js';

const VOLUME_KEY = 'raevix.music.volume';

// MIDI note numbers, 0 = rest. Sixteen 16th-note steps per pattern.
const TRACKS = [
  {
    id: 'neon-skyline',
    title: 'Neon Skyline',
    mood: 'Synthwave · 118 BPM',
    bpm: 118,
    hue: '#ff5aa5',
    bass: [45, 45, 0, 45, 48, 0, 45, 0, 41, 41, 0, 41, 43, 0, 48, 0],
    lead: [69, 72, 76, 72, 69, 76, 72, 0, 65, 69, 72, 69, 67, 72, 74, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1]
  },
  {
    id: 'sakura-circuit',
    title: 'Sakura Circuit',
    mood: 'Kawaii future · 96 BPM',
    bpm: 96,
    hue: '#ff8ae0',
    bass: [45, 0, 45, 0, 41, 0, 43, 0, 45, 0, 45, 0, 48, 0, 43, 0],
    lead: [81, 76, 72, 76, 69, 72, 76, 79, 81, 84, 81, 76, 72, 69, 67, 0],
    hat: [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1]
  },
  {
    id: 'midnight-ronin',
    title: 'Midnight Ronin',
    mood: 'Dark ambient · 82 BPM',
    bpm: 82,
    hue: '#3ad8ff',
    bass: [33, 0, 0, 0, 36, 0, 0, 0, 31, 0, 0, 0, 38, 0, 0, 0],
    lead: [57, 0, 60, 0, 63, 0, 60, 0, 55, 0, 58, 0, 60, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]
  }
];

const freq = (note) => 440 * 2 ** ((note - 69) / 12);

function readVolume() {
  const stored = Number(window.localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.55;
}

function writeVolume(value) {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    /* storage may be unavailable */
  }
}

export function mountMusic(body, win) {
  let trackIndex = 0;
  let audio = null;
  let playing = false;
  let step = 0;
  let nextTime = 0;
  let timer = 0;
  let rafId = 0;
  let volume = readVolume();
  const pattern = () => TRACKS[trackIndex];

  body.innerHTML = `
    <div class="music">
      <section class="music__stage">
        <div class="music__disc" id="musicDisc" style="--hue:${pattern().hue}">
          <span class="music__ring"></span>
          <span class="music__ring music__ring--two"></span>
          <span class="music__core">♪</span>
        </div>
        <canvas class="music__viz" id="musicViz" aria-hidden="true"></canvas>
        <p class="music__now">
          <span class="eyebrow">Now playing</span>
          <strong id="musicTitle">${escapeHtml(pattern().title)}</strong>
          <small id="musicMood">${escapeHtml(pattern().mood)}</small>
        </p>
      </section>

      <section class="music__panel">
        <div class="music__controls">
          <button class="icon-btn" type="button" data-act="prev" title="Previous track" aria-label="Previous track">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3 5.6 8 13 13Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </button>
          <button class="music__play" type="button" data-act="play" aria-label="Play" id="musicPlay">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.2 15.4 10 6 15.8Z" fill="currentColor"/></svg>
          </button>
          <button class="icon-btn" type="button" data-act="next" title="Next track" aria-label="Next track">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7.4 5L3 13Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </button>
          <label class="music__vol">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6h2.4L9 3.4v9.2L5.4 10H3Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.4 6a2.6 2.6 0 0 1 0 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            <input type="range" id="musicVolume" min="0" max="100" value="${Math.round(volume * 100)}" aria-label="Volume" />
          </label>
        </div>

        <ol class="music__list" id="musicList"></ol>

        <p class="music__note">
          Three original loops synthesised with oscillators and noise — no audio files, nothing streamed.
          Press play once to let the browser start audio.
        </p>
      </section>
    </div>
  `;

  const titleEl = body.querySelector('#musicTitle');
  const moodEl = body.querySelector('#musicMood');
  const playBtn = body.querySelector('#musicPlay');
  const disc = body.querySelector('#musicDisc');
  const list = body.querySelector('#musicList');
  const volumeInput = body.querySelector('#musicVolume');
  const root = body.querySelector('.music');
  const canvas = body.querySelector('#musicViz');
  const ctx2d = canvas.getContext('2d');

  const renderList = () => {
    list.replaceChildren(...TRACKS.map((entry, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `music__track${index === trackIndex ? ' is-active' : ''}`;
      button.style.setProperty('--hue', entry.hue);
      button.innerHTML = `
        <span class="music__track-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="music__track-meta">
          <strong>${escapeHtml(entry.title)}</strong>
          <small>${escapeHtml(entry.mood)}</small>
        </span>
        <span class="music__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      `;
      button.addEventListener('click', () => {
        trackIndex = index;
        step = 0;
        renderList();
        updateNowPlaying();
        if (playing) restartLoop();
        else start();
      });
      item.append(button);
      return item;
    }));
  };

  const updateNowPlaying = () => {
    titleEl.textContent = pattern().title;
    moodEl.textContent = pattern().mood;
    root.style.setProperty('--hue', pattern().hue);
    disc.style.animationPlayState = playing ? 'running' : 'paused';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playBtn.innerHTML = playing
      ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.2 15.4 10 6 15.8Z" fill="currentColor"/></svg>';
    root.classList.toggle('is-playing', playing);
  };

  const ensureAudio = () => {
    if (audio) return audio;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      toast('This browser does not support Web Audio.');
      return null;
    }

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = volume;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.27;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.24;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    master.connect(analyser);
    analyser.connect(ctx.destination);

    audio = { ctx, master, analyser, delay, noise: null };
    return audio;
  };

  const noiseBuffer = () => {
    if (audio.noise) return audio.noise;
    const { ctx } = audio;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    audio.noise = buffer;
    return buffer;
  };

  const note = (midi, time, duration, type, gain, destination) => {
    if (!midi) return;
    const { ctx, master } = audio;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq(midi), time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(env);
    env.connect(destination || master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  };

  const hat = (time) => {
    const { ctx, master } = audio;
    const source = ctx.createBufferSource();
    const env = ctx.createGain();
    source.buffer = noiseBuffer();
    env.gain.setValueAtTime(0.055, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    source.connect(env);
    env.connect(master);
    source.start(time);
    source.stop(time + 0.08);
  };

  const scheduleStep = (index, time, seconds) => {
    const track = pattern();
    note(track.bass[index], time, seconds * 1.9, 'triangle', 0.19);
    note(track.lead[index], time, seconds * 1.25, 'square', 0.075, audio.delay);
    note(track.lead[index] ? track.lead[index] + 12 : 0, time, seconds * 0.8, 'sine', 0.03);
    if (track.hat[index]) hat(time);
  };

  const tick = () => {
    if (!audio || !playing) return;
    const seconds = 60 / pattern().bpm / 4;

    while (nextTime < audio.ctx.currentTime + 0.14) {
      scheduleStep(step, nextTime, seconds);
      step = (step + 1) % 16;
      nextTime += seconds;
    }
  };

  const startLoop = () => {
    if (!audio) return;
    nextTime = audio.ctx.currentTime + 0.08;
    window.clearInterval(timer);
    timer = window.setInterval(tick, 25);
    tick();
  };

  const restartLoop = () => {
    window.clearInterval(timer);
    step = 0;
    startLoop();
  };

  const drawViz = () => {
    if (!canvas.isConnected) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx2d.clearRect(0, 0, width, height);

    const bars = 28;
    const gap = 4 * ratio;
    const barWidth = Math.max(2, (width - gap * (bars - 1)) / bars);
    const data = audio ? new Uint8Array(audio.analyser.frequencyBinCount) : null;
    if (audio) audio.analyser.getByteFrequencyData(data);

    for (let index = 0; index < bars; index += 1) {
      const sample = data ? data[Math.floor((index / bars) * data.length)] / 255 : 0.12;
      const level = playing ? Math.max(0.06, sample) : 0.05;
      const barHeight = level * height * 0.9;
      const x = index * (barWidth + gap);
      const y = height - barHeight;
      const gradient = ctx2d.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, `${pattern().hue}22`);
      gradient.addColorStop(0.6, pattern().hue);
      gradient.addColorStop(1, '#ffffff');
      ctx2d.fillStyle = gradient;
      ctx2d.globalAlpha = playing ? 0.9 : 0.22;
      ctx2d.beginPath();
      ctx2d.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;

    rafId = window.requestAnimationFrame(drawViz);
  };

  const start = async () => {
    const engine = ensureAudio();
    if (!engine) return;

    try {
      await engine.ctx.resume();
    } catch (error) {
      console.warn('[Raevix] audio could not start', error);
    }

    playing = true;
    startLoop();
    updateNowPlaying();
  };

  const pause = async () => {
    playing = false;
    window.clearInterval(timer);
    updateNowPlaying();
    try {
      await audio?.ctx.suspend();
    } catch {
      /* context may already be suspended */
    }
  };

  body.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    if (!control) return;

    switch (control.dataset.act) {
      case 'play':
        if (playing) pause();
        else start();
        break;
      case 'next':
        trackIndex = (trackIndex + 1) % TRACKS.length;
        step = 0;
        renderList();
        updateNowPlaying();
        if (playing) restartLoop();
        break;
      case 'prev':
        trackIndex = (trackIndex - 1 + TRACKS.length) % TRACKS.length;
        step = 0;
        renderList();
        updateNowPlaying();
        if (playing) restartLoop();
        break;
      default:
        break;
    }
  });

  volumeInput.addEventListener('input', () => {
    volume = Number(volumeInput.value) / 100;
    if (audio) audio.master.gain.value = volume;
    writeVolume(volume);
  });

  renderList();
  updateNowPlaying();
  drawViz();

  win?.addCleanup?.(() => {
    window.clearInterval(timer);
    window.cancelAnimationFrame(rafId);
    if (audio) audio.ctx.close().catch(() => {});
    audio = null;
    playing = false;
  });
}
