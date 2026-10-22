/**
 * Tiny expression evaluator shared by the Calculator app and the terminal.
 * Supports +, -, *, /, %, ^, parentheses, unary signs and a few functions.
 */

const FUNCTIONS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10,
  ln: Math.log
};

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E
};

function tokenize(source) {
  const tokens = [];
  const text = String(source).replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll(',', '');
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let number = '';
      while (index < text.length && /[0-9.]/.test(text[index])) {
        number += text[index];
        index += 1;
      }
      // Scientific notation from a previous result, e.g. 1.5e+21.
      const exponent = /^[eE][+-]?\d+/.exec(text.slice(index));
      if (exponent) {
        number += exponent[0];
        index += exponent[0].length;
      }
      if ((number.match(/\./g) || []).length > 1 || number === '.' || !Number.isFinite(Number(number))) {
        throw new Error(`Bad number “${number}”`);
      }
      tokens.push({ type: 'number', value: Number(number) });
      continue;
    }

    if (/[a-z]/i.test(char)) {
      let name = '';
      while (index < text.length && /[a-z]/i.test(text[index])) {
        name += text[index];
        index += 1;
      }
      tokens.push({ type: 'name', value: name.toLowerCase() });
      continue;
    }

    if ('+-*/%^()'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character “${char}”`);
  }

  return tokens;
}

function parse(tokens) {
  let cursor = 0;

  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];

  const expect = (value) => {
    const token = take();
    if (!token || token.value !== value) throw new Error(`Expected “${value}”`);
    return token;
  };

  const primary = () => {
    const token = take();
    if (!token) throw new Error('Incomplete expression');

    if (token.type === 'number') return token.value;

    if (token.type === 'name') {
      const name = token.value;
      if (name in CONSTANTS) return CONSTANTS[name];
      if (!(name in FUNCTIONS)) throw new Error(`Unknown function “${name}”`);
      expect('(');
      const argument = expression();
      expect(')');
      const output = FUNCTIONS[name](argument);
      if (!Number.isFinite(output)) throw new Error('Result is not a finite number');
      return output;
    }

    if (token.value === '(') {
      const value = expression();
      expect(')');
      return value;
    }

    if (token.value === '-') return -unary();
    if (token.value === '+') return unary();

    throw new Error(`Unexpected “${token.value}”`);
  };

  const unary = () => primary();

  const power = () => {
    let base = primary();
    while (peek() && peek().value === '^') {
      take();
      base **= unary();
    }
    return base;
  };

  const term = () => {
    let value = power();
    while (peek() && ['*', '/', '%'].includes(peek().value)) {
      const operator = take().value;
      const right = power();
      if (operator === '*') value *= right;
      else if (operator === '/') value /= right;
      else value %= right;
    }
    return value;
  };

  const expression = () => {
    let value = term();
    while (peek() && ['+', '-'].includes(peek().value)) {
      const operator = take().value;
      const right = term();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = expression();
  if (cursor < tokens.length) throw new Error(`Unexpected “${tokens[cursor].value}”`);
  return result;
}

/** Replace typographic operators typed by keypads. */
export function normalizeExpression(value) {
  return String(value ?? '').replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
}

/** Round away binary floating-point noise for display. */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Error';
  if (Math.abs(value) < 1e-12) return '0';
  const magnitude = Math.abs(value);
  if (magnitude >= 1e12 || magnitude < 1e-6) return value.toExponential(6).replace('e+', 'e');
  const rounded = Number(value.toPrecision(12));
  return String(rounded);
}

/**
 * @returns {{ ok: true, value: number, display: string } | { ok: false, error: string }}
 */
export function evaluateExpression(source) {
  const text = String(source ?? '').trim();
  if (!text) return { ok: false, error: 'Empty expression' };

  try {
    const value = parse(tokenize(text));
    if (!Number.isFinite(value)) return { ok: false, error: 'Result is not a finite number' };
    return { ok: true, value, display: formatNumber(value) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
