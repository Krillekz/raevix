/** Calculator: keyboard-friendly expression calculator with a persistent tape. */

import { evaluateExpression } from './calc-engine.js';
import { escapeHtml, toast } from './ui.js';

const HISTORY_KEY = 'raevix.calc.history.v1';
const HISTORY_LIMIT = 24;

const KEYS = [
  { value: '(', label: '(', title: 'Open bracket' },
  { value: ')', label: ')', title: 'Close bracket' },
  { value: 'sqrt(', label: '√', title: 'Square root' },
  { value: '^', label: 'xʸ', title: 'Power' },
  { value: 'pi', label: 'π', title: 'Pi' },
  { act: 'clear', label: 'AC', tone: 'muted', title: 'Clear all' },
  { act: 'back', label: '⌫', tone: 'muted', title: 'Backspace' },
  { act: 'percent', label: '%', tone: 'muted', title: 'Percent' },
  { value: '/', label: '÷', tone: 'operator', title: 'Divide' },
  { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
  { value: '*', label: '×', tone: 'operator', title: 'Multiply' },
  { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
  { value: '-', label: '−', tone: 'operator', title: 'Subtract' },
  { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
  { value: '+', label: '+', tone: 'operator', title: 'Add' },
  { act: 'sign', label: '±', title: 'Toggle sign' },
  { value: '0', label: '0' }, { value: '.', label: '.' },
  { act: 'equals', label: '=', tone: 'equals', title: 'Equals' }
];

const pretty = (value) => String(value)
  .replaceAll('*', '×')
  .replaceAll('/', '÷')
  .replaceAll('-', '−')
  .replaceAll('sqrt(', '√(');

function readHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.expression === 'string' && typeof entry.result === 'string')
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeHistory(entries) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch (error) {
    console.warn('[Raevix] could not save calculator tape', error);
  }
}

export function mountCalculator(body) {
  const history = readHistory();
  let expression = '';

  body.innerHTML = `
    <div class="calc">
      <section class="calc__pad">
        <div class="calc__display">
          <span class="calc__expr" id="calcExpr" aria-live="polite">0</span>
          <output class="calc__result" id="calcResult">0</output>
        </div>
        <div class="calc__keys" id="calcKeys">
          ${KEYS.map((key) => `
            <button class="calc__key${key.tone ? ` calc__key--${key.tone}` : ''}" type="button"
              ${key.value ? `data-value="${key.value}"` : `data-act="${key.act}"`}
              ${key.title ? `title="${key.title}" aria-label="${key.title}"` : ''}>${key.label}</button>
          `).join('')}
        </div>
        <p class="calc__hint">Type on your keyboard · Enter evaluates · Esc clears</p>
      </section>

      <aside class="calc__side">
        <header class="calc__sidehead">
          <h4>Tape</h4>
          <button class="btn btn--small" type="button" data-act="clearHistory">Clear</button>
        </header>
        <ol class="calc__tape" id="calcTape"></ol>
      </aside>
    </div>
  `;

  const exprEl = body.querySelector('#calcExpr');
  const resultEl = body.querySelector('#calcResult');
  const tapeEl = body.querySelector('#calcTape');

  const render = () => {
    exprEl.textContent = expression ? pretty(expression) : '0';
    const preview = expression ? evaluateExpression(expression) : null;
    if (expression && preview?.ok) {
      resultEl.textContent = preview.display;
      resultEl.dataset.state = 'ok';
    } else if (expression && preview && !preview.ok) {
      resultEl.textContent = '—';
      resultEl.dataset.state = 'error';
    } else {
      resultEl.textContent = '0';
      resultEl.dataset.state = 'ok';
    }
  };

  const renderTape = () => {
    if (!history.length) {
      tapeEl.innerHTML = '<li class="calc__tape-empty">Nothing here yet. Press = to keep a result.</li>';
      return;
    }

    tapeEl.replaceChildren(...history.map((entry) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <button type="button" class="calc__tape-item" title="Use this result">
          <span>${escapeHtml(pretty(entry.expression))}</span>
          <strong>${escapeHtml(entry.result)}</strong>
        </button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        expression = entry.result;
        render();
      });
      return item;
    }));
  };

  const append = (value) => {
    expression += value;
    render();
  };

  const equals = () => {
    if (!expression) return;
    const result = evaluateExpression(expression);
    if (!result.ok) {
      toast(result.error);
      resultEl.dataset.state = 'error';
      return;
    }

    history.unshift({ expression, result: result.display });
    history.splice(HISTORY_LIMIT);
    writeHistory(history);
    renderTape();

    exprEl.textContent = pretty(expression);
    resultEl.textContent = result.display;
    expression = result.display === 'Error' ? '' : result.display;
    toast(`${pretty(expression)}`, { timeout: 1400 });
  };

  body.addEventListener('click', (event) => {
    const button = event.target.closest('.calc__key, [data-act="clearHistory"]');
    if (!button) return;

    if (button.dataset.act === 'clearHistory') {
      history.length = 0;
      writeHistory(history);
      renderTape();
      return;
    }

    if (button.dataset.value) {
      append(button.dataset.value);
      return;
    }

    switch (button.dataset.act) {
      case 'clear':
        expression = '';
        render();
        break;
      case 'back':
        expression = expression.slice(0, -1);
        render();
        break;
      case 'percent':
        expression = expression ? `(${expression})/100` : '';
        render();
        break;
      case 'sign':
        expression = expression.startsWith('-') ? expression.slice(1) : `-${expression || '0'}`;
        render();
        break;
      case 'equals':
        equals();
        break;
      default:
        break;
    }
  });

  body.addEventListener('keydown', (event) => {
    const { key } = event;

    if (/^[0-9.]$/.test(key)) {
      event.preventDefault();
      append(key);
      return;
    }

    if (['+', '-', '*', '/', '^', '%', '(', ')'].includes(key)) {
      event.preventDefault();
      append(key);
      return;
    }

    if (key === 'Enter' || key === '=') {
      event.preventDefault();
      equals();
      return;
    }

    if (key === 'Backspace') {
      event.preventDefault();
      expression = expression.slice(0, -1);
      render();
      return;
    }

    if (key === 'Escape') {
      event.preventDefault();
      expression = '';
      render();
    }
  });

  renderTape();
  render();
}
