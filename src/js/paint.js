/** Paint: neon canvas sketching with undo, eraser and PNG export. */

import { getAccentColor } from './settings.js';
import { toast } from './ui.js';

const BACKGROUND = '#120a11';
const HISTORY_LIMIT = 12;
const SWATCHES = ['#ff5aa5', '#b06bff', '#3ad8ff', '#46e58a', '#ffd34d', '#f7ebee'];

export function mountPaint(body, win) {
  body.innerHTML = `
    <div class="paint">
      <div class="paint__bar">
        <div class="paint__tools" role="group" aria-label="Drawing tools">
          <button class="paint__tool is-active" type="button" data-tool="brush" title="Brush (B)" aria-label="Brush">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13c0-2 .8-3.2 2.4-3.6L12.2 2.6a1.6 1.6 0 0 1 2.2 2.2L7.6 11.6C7.2 13.2 6 14 4 14H3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </button>
          <button class="paint__tool" type="button" data-tool="eraser" title="Eraser (E)" aria-label="Eraser">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 13H13M3 10.2 8.8 4.4a1.7 1.7 0 0 1 2.4 0l1.4 1.4a1.7 1.7 0 0 1 0 2.4l-3.4 3.4H5.4L3 10.2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <label class="paint__size">
          <span>Size</span>
          <input type="range" id="paintSize" min="2" max="48" value="10" aria-label="Brush size" />
          <output id="paintSizeOut">10</output>
        </label>

        <div class="paint__colors" role="group" aria-label="Brush colours">
          <button class="paint__swatch" type="button" data-color="${getAccentColor()}" style="--swatch:${getAccentColor()}" title="Accent colour" aria-label="Accent colour"></button>
          ${SWATCHES.map((color) => `<button class="paint__swatch" type="button" data-color="${color}" style="--swatch:${color}" title="${color}" aria-label="Colour ${color}"></button>`).join('')}
          <label class="paint__swatch paint__swatch--custom" style="--swatch:#ffffff" title="Custom colour">
            <input type="color" id="paintCustom" value="${getAccentColor()}" aria-label="Custom colour" />
          </label>
        </div>

        <div class="paint__actions">
          <button class="icon-btn" type="button" data-act="undo" title="Undo (Ctrl+Z)" aria-label="Undo">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 4 2.6 6.6 5.2 9.2M2.8 6.6h6.1a4.1 4.1 0 0 1 0 8.2H6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="icon-btn" type="button" data-act="clear" title="Clear canvas" aria-label="Clear canvas">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn--small btn--accent" type="button" data-act="save">Save PNG</button>
        </div>
      </div>

      <div class="paint__stage">
        <canvas class="paint__canvas" id="paintCanvas"></canvas>
        <span class="paint__cursor" id="paintCursor" aria-hidden="true"></span>
      </div>

      <footer class="paint__foot">
        <span id="paintStatus">Draw with your mouse, pen or finger.</span>
        <span>B brush · E eraser · Ctrl+Z undo</span>
      </footer>
    </div>
  `;

  const stage = body.querySelector('.paint__stage');
  const canvas = body.querySelector('#paintCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const cursor = body.querySelector('#paintCursor');
  const sizeInput = body.querySelector('#paintSize');
  const sizeOut = body.querySelector('#paintSizeOut');
  const status = body.querySelector('#paintStatus');
  const custom = body.querySelector('#paintCustom');

  const settings = {
    tool: 'brush',
    color: getAccentColor(),
    size: 10,
    drawing: false
  };
  const undoStack = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let last = null;

  const paintBackground = (width, height) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width ?? canvas.width, height ?? canvas.height);
    ctx.restore();
  };

  const snapshot = () => {
    if (!canvas.width || !canvas.height) return null;
    try {
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      return null;
    }
  };

  const pushUndo = () => {
    const frame = snapshot();
    if (!frame) return;
    undoStack.push(frame);
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  };

  const sizeCanvas = () => {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const saved = canvas.width ? canvas.toDataURL() : null;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBackground();

    if (saved) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = saved;
    }
  };

  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const stroke = (from, to) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = settings.size;
    ctx.strokeStyle = settings.tool === 'eraser' ? BACKGROUND : settings.color;
    ctx.fillStyle = ctx.strokeStyle;

    if (settings.tool === 'brush') {
      ctx.shadowColor = settings.color;
      ctx.shadowBlur = Math.max(6, settings.size * 0.7);
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // A dot makes single clicks visible.
    ctx.beginPath();
    ctx.arc(to.x, to.y, settings.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const placeCursor = (event) => {
    const rect = stage.getBoundingClientRect();
    cursor.style.left = `${event.clientX - rect.left}px`;
    cursor.style.top = `${event.clientY - rect.top}px`;
    cursor.style.width = `${settings.size}px`;
    cursor.style.height = `${settings.size}px`;
    cursor.dataset.tool = settings.tool;
    cursor.dataset.visible = 'true';
  };

  const setTool = (tool) => {
    settings.tool = tool;
    body.querySelectorAll('[data-tool]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tool === tool);
    });
    status.textContent = tool === 'eraser' ? 'Eraser — painting back to the canvas background.' : 'Neon brush — glow follows your stroke.';
  };

  body.addEventListener('click', (event) => {
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      setTool(tool.dataset.tool);
      return;
    }

    const swatch = event.target.closest('[data-color]');
    if (swatch) {
      settings.color = swatch.dataset.color;
      custom.value = settings.color;
      body.querySelectorAll('.paint__swatch').forEach((button) => {
        button.classList.toggle('is-active', button === swatch);
      });
      setTool('brush');
      return;
    }

    const action = event.target.closest('[data-act]');
    if (action) {
      if (action.dataset.act === 'undo') {
        const frame = undoStack.pop();
        if (!frame) {
          toast('Nothing to undo yet.');
          return;
        }
        ctx.putImageData(frame, 0, 0);
        toast('Stroke undone.');
      } else if (action.dataset.act === 'clear') {
        pushUndo();
        paintBackground();
        toast('Canvas cleared — undo still works.');
      } else if (action.dataset.act === 'save') {
        canvas.toBlob((blob) => {
          if (!blob) {
            toast('Could not export the canvas.');
            return;
          }
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `raevix-sketch-${Date.now()}.png`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
          toast('Sketch exported as PNG.');
        }, 'image/png');
      }
    }
  });

  custom.addEventListener('input', () => {
    settings.color = custom.value;
    body.querySelectorAll('.paint__swatch').forEach((button) => button.classList.remove('is-active'));
    setTool('brush');
  });

  sizeInput.addEventListener('input', () => {
    settings.size = Number(sizeInput.value);
    sizeOut.value = sizeInput.value;
    cursor.style.width = `${settings.size}px`;
    cursor.style.height = `${settings.size}px`;
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    pushUndo();
    settings.drawing = true;
    last = point(event);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    stroke(last, last);
    placeCursor(event);
  });

  canvas.addEventListener('pointermove', (event) => {
    placeCursor(event);
    if (!settings.drawing) return;
    const next = point(event);
    stroke(last || next, next);
    last = next;
  });

  const stop = (event) => {
    if (!settings.drawing) return;
    settings.drawing = false;
    last = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointerleave', () => {
    if (!settings.drawing) cursor.dataset.visible = 'false';
  });
  canvas.addEventListener('pointerenter', (event) => placeCursor(event));

  body.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;

    if (event.key.toLowerCase() === 'b') setTool('brush');
    else if (event.key.toLowerCase() === 'e') setTool('eraser');
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      body.querySelector('[data-act="undo"]').click();
    }
  });

  const observer = new ResizeObserver(() => sizeCanvas());
  observer.observe(stage);

  win?.addCleanup?.(() => observer.disconnect());

  sizeCanvas();
  setTool('brush');
  body.querySelector(`[data-color="${getAccentColor()}"]`)?.classList.add('is-active');
}
