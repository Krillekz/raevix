/** Clock & Timers: analog clock, world zones, stopwatch with laps and a countdown. */

import { escapeHtml, toast } from './ui.js';
import { playAlarm } from './sound.js';

const ZONES = [
  { city: 'Tokyo', zone: 'Asia/Tokyo' },
  { city: 'London', zone: 'Europe/London' },
  { city: 'New York', zone: 'America/New_York' },
  { city: 'Los Angeles', zone: 'America/Los_Angeles' }
];

const pad = (value, length = 2) => String(Math.floor(value)).padStart(length, '0');

function clockParts(date = new Date()) {
  return {
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  };
}

function formatStopwatch(ms) {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const hundredths = Math.floor((total % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}

export function mountClock(body, win) {
  body.innerHTML = `
    <div class="clockapp">
      <nav class="clockapp__tabs" role="tablist" aria-label="Clock modes">
        <button class="clockapp__tab is-active" type="button" data-panel="clock" role="tab" aria-selected="true">Clock</button>
        <button class="clockapp__tab" type="button" data-panel="stopwatch" role="tab" aria-selected="false">Stopwatch</button>
        <button class="clockapp__tab" type="button" data-panel="timer" role="tab" aria-selected="false">Timer</button>
      </nav>

      <section class="clockapp__panel" data-panel="clock">
        <div class="clockapp__hero">
          <div class="clockapp__analog" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="92" class="clockapp__face" />
              <circle cx="100" cy="100" r="80" class="clockapp__inner" />
              <g class="clockapp__ticks">
                ${Array.from({ length: 12 }, (_, index) => {
                  const angle = index * 30;
                  return `<line x1="100" y1="18" x2="100" y2="${index % 3 === 0 ? 30 : 25}" transform="rotate(${angle} 100 100)" />`;
                }).join('')}
              </g>
              <line id="clockHourHand" x1="100" y1="100" x2="100" y2="54" class="clockapp__hand clockapp__hand--hour" />
              <line id="clockMinuteHand" x1="100" y1="100" x2="100" y2="36" class="clockapp__hand clockapp__hand--minute" />
              <line id="clockSecondHand" x1="100" y1="112" x2="100" y2="30" class="clockapp__hand clockapp__hand--second" />
              <circle cx="100" cy="100" r="4" class="clockapp__pin" />
            </svg>
          </div>

          <div class="clockapp__digital">
            <p class="eyebrow">Local time</p>
            <p class="clockapp__time" id="clockDigital">--:--:--</p>
            <p class="clockapp__date" id="clockDate">—</p>
            <p class="clockapp__meta" id="clockMeta">—</p>
          </div>
        </div>

        <div class="clockapp__zones">
          ${ZONES.map((entry) => `
            <article class="zone">
              <span>${escapeHtml(entry.city)}</span>
              <strong data-zone="${entry.zone}">—</strong>
              <small data-zone-date="${entry.zone}">—</small>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="clockapp__panel" data-panel="stopwatch" hidden>
        <div class="stopwatch">
          <p class="stopwatch__time" id="stopwatchTime">00:00.00</p>
          <div class="stopwatch__controls">
            <button class="btn btn--accent" type="button" data-act="swToggle" id="swToggle">Start</button>
            <button class="btn" type="button" data-act="swLap" id="swLap" disabled>Lap</button>
            <button class="btn" type="button" data-act="swReset" id="swReset">Reset</button>
          </div>
          <ol class="stopwatch__laps" id="stopwatchLaps">
            <li class="stopwatch__empty">Laps appear here while the stopwatch runs.</li>
          </ol>
        </div>
      </section>

      <section class="clockapp__panel" data-panel="timer" hidden>
        <div class="timer">
          <p class="timer__time" id="timerTime">05:00</p>
          <p class="timer__hint" id="timerHint">Set a duration and press start.</p>

          <div class="timer__presets">
            ${[1, 5, 10, 25].map((minutes) => `<button class="btn btn--small" type="button" data-preset="${minutes}">${minutes} min</button>`).join('')}
          </div>

          <div class="timer__inputs">
            <label>Minutes <input type="number" id="timerMinutes" min="0" max="99" value="5" /></label>
            <label>Seconds <input type="number" id="timerSeconds" min="0" max="59" value="0" /></label>
          </div>

          <div class="timer__controls">
            <button class="btn btn--accent" type="button" data-act="timerToggle" id="timerToggle">Start</button>
            <button class="btn" type="button" data-act="timerReset" id="timerReset">Reset</button>
          </div>
        </div>
      </section>
    </div>
  `;

  const digital = body.querySelector('#clockDigital');
  const dateEl = body.querySelector('#clockDate');
  const metaEl = body.querySelector('#clockMeta');
  const hourHand = body.querySelector('#clockHourHand');
  const minuteHand = body.querySelector('#clockMinuteHand');
  const secondHand = body.querySelector('#clockSecondHand');

  const zoneEls = [...body.querySelectorAll('[data-zone]')];
  const zoneDateEls = [...body.querySelectorAll('[data-zone-date]')];

  let clockTimer = 0;

  const renderClock = () => {
    const now = new Date();
    const parts = clockParts(now);

    digital.textContent = parts.label;
    dateEl.textContent = parts.date;
    metaEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;

    hourHand.setAttribute('transform', `rotate(${(parts.hours % 12) * 30 + parts.minutes * 0.5} 100 100)`);
    minuteHand.setAttribute('transform', `rotate(${parts.minutes * 6 + parts.seconds * 0.1} 100 100)`);
    secondHand.setAttribute('transform', `rotate(${parts.seconds * 6} 100 100)`);

    zoneEls.forEach((el) => {
      el.textContent = now.toLocaleTimeString([], { timeZone: el.dataset.zone, hour: '2-digit', minute: '2-digit' });
    });

    zoneDateEls.forEach((el) => {
      el.textContent = now.toLocaleDateString([], { timeZone: el.dataset.zoneDate, weekday: 'short', month: 'short', day: 'numeric' });
    });
  };

  /* Stopwatch ------------------------------------------------------------- */
  const swTime = body.querySelector('#stopwatchTime');
  const swToggle = body.querySelector('#swToggle');
  const swLap = body.querySelector('#swLap');
  const swReset = body.querySelector('#swReset');
  const swLaps = body.querySelector('#stopwatchLaps');

  let swElapsed = 0;
  let swStartedAt = 0;
  let swRunning = false;
  let swTimer = 0;
  let laps = [];

  const renderStopwatch = () => {
    const value = swElapsed + (swRunning ? performance.now() - swStartedAt : 0);
    swTime.textContent = formatStopwatch(value);
  };

  const startStopwatch = () => {
    swRunning = true;
    swStartedAt = performance.now();
    swToggle.textContent = 'Stop';
    swLap.disabled = false;
    window.clearInterval(swTimer);
    swTimer = window.setInterval(renderStopwatch, 27);
    renderStopwatch();
  };

  const stopStopwatch = () => {
    swElapsed += performance.now() - swStartedAt;
    swRunning = false;
    window.clearInterval(swTimer);
    swToggle.textContent = 'Start';
    swLap.disabled = true;
    swTime.textContent = formatStopwatch(swElapsed);
  };

  const renderLaps = () => {
    if (!laps.length) {
      swLaps.innerHTML = '<li class="stopwatch__empty">Laps appear here while the stopwatch runs.</li>';
      return;
    }

    swLaps.replaceChildren(...laps.map((lap) => {
      const item = document.createElement('li');
      item.className = 'stopwatch__lap';
      item.innerHTML = `<span>Lap ${lap.index}</span><strong>${formatStopwatch(lap.value)}</strong><small>${formatStopwatch(lap.total)}</small>`;
      return item;
    }));
  };

  /* Timer ----------------------------------------------------------------- */
  const timerTime = body.querySelector('#timerTime');
  const timerHint = body.querySelector('#timerHint');
  const timerToggle = body.querySelector('#timerToggle');
  const timerReset = body.querySelector('#timerReset');
  const minutesInput = body.querySelector('#timerMinutes');
  const secondsInput = body.querySelector('#timerSeconds');

  let timerRemaining = 300000;
  let timerEndsAt = 0;
  let timerRunning = false;
  let timerInterval = 0;
  let timerFinished = false;

  const selectedDuration = () => {
    const minutes = Math.max(0, Math.min(99, Number(minutesInput.value) || 0));
    const seconds = Math.max(0, Math.min(59, Number(secondsInput.value) || 0));
    return (minutes * 60 + seconds) * 1000;
  };

  const renderTimer = () => {
    const remaining = timerRunning ? Math.max(0, timerEndsAt - performance.now()) : timerRemaining;
    const total = Math.ceil(remaining / 1000);
    timerTime.textContent = `${pad(total / 60)}:${pad(total % 60)}`;
    timerTime.dataset.state = timerFinished ? 'done' : timerRunning ? 'running' : 'idle';
  };

  const finishTimer = () => {
    timerRunning = false;
    timerFinished = true;
    timerRemaining = 0;
    window.clearInterval(timerInterval);
    timerToggle.textContent = 'Start';
    timerHint.textContent = 'Time is up!';
    renderTimer();
    playAlarm();
    toast('Timer finished — time is up.', { timeout: 6000 });
  };

  const tickTimer = () => {
    if (!timerRunning) return;
    if (performance.now() >= timerEndsAt) {
      finishTimer();
      return;
    }
    renderTimer();
  };

  const startTimer = () => {
    if (timerRunning) {
      timerRemaining = Math.max(0, timerEndsAt - performance.now());
      timerRunning = false;
      window.clearInterval(timerInterval);
      timerToggle.textContent = 'Resume';
      timerHint.textContent = 'Paused.';
      renderTimer();
      return;
    }

    if (timerRemaining <= 0) timerRemaining = selectedDuration();
    if (timerRemaining <= 0) {
      toast('Set a duration first.');
      return;
    }

    timerFinished = false;
    timerRunning = true;
    timerEndsAt = performance.now() + timerRemaining;
    timerToggle.textContent = 'Pause';
    timerHint.textContent = 'Counting down…';
    window.clearInterval(timerInterval);
    timerInterval = window.setInterval(tickTimer, 200);
    renderTimer();
  };

  const resetTimer = () => {
    timerRunning = false;
    timerFinished = false;
    window.clearInterval(timerInterval);
    timerRemaining = selectedDuration();
    timerToggle.textContent = 'Start';
    timerHint.textContent = 'Set a duration and press start.';
    renderTimer();
  };

  /* Wiring ---------------------------------------------------------------- */
  body.addEventListener('click', (event) => {
    const tab = event.target.closest('.clockapp__tab');
    if (tab) {
      body.querySelectorAll('.clockapp__tab').forEach((button) => {
        const active = button === tab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });
      body.querySelectorAll('.clockapp__panel').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab.dataset.panel;
      });
      return;
    }

    const control = event.target.closest('[data-act], [data-preset]');
    if (!control) return;

    if (control.dataset.preset) {
      const minutes = Number(control.dataset.preset);
      minutesInput.value = String(minutes);
      secondsInput.value = '0';
      timerRunning = false;
      timerFinished = false;
      window.clearInterval(timerInterval);
      timerRemaining = minutes * 60000;
      timerToggle.textContent = 'Start';
      timerHint.textContent = `${minutes} minute${minutes === 1 ? '' : 's'} ready.`;
      renderTimer();
      return;
    }

    switch (control.dataset.act) {
      case 'swToggle':
        if (swRunning) stopStopwatch();
        else startStopwatch();
        break;
      case 'swLap': {
        const total = swElapsed + (swRunning ? performance.now() - swStartedAt : 0);
        laps.unshift({ index: laps.length + 1, value: total, total });
        laps = laps.slice(0, 20);
        renderLaps();
        break;
      }
      case 'swReset':
        stopStopwatch();
        swElapsed = 0;
        laps = [];
        swTime.textContent = '00:00.00';
        renderLaps();
        break;
      case 'timerToggle':
        startTimer();
        break;
      case 'timerReset':
        resetTimer();
        break;
      default:
        break;
    }
  });

  [minutesInput, secondsInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (timerRunning) return;
      timerRemaining = selectedDuration();
      timerFinished = false;
      renderTimer();
    });
  });

  renderClock();
  clockTimer = window.setInterval(renderClock, 1000);
  renderStopwatch();
  renderTimer();

  win?.addCleanup?.(() => {
    window.clearInterval(clockTimer);
    window.clearInterval(swTimer);
    window.clearInterval(timerInterval);
    swRunning = false;
    timerRunning = false;
  });
}
