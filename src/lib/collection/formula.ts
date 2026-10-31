export type FormulaResult = { ok: true; value: number } | { ok: false; error: string };

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'ref'; name: string }
  | { kind: 'name'; name: string }
  | { kind: 'op'; value: string };

/**
 * What an argument can be *before* arithmetic gets hold of it. `COUNT` and `COUNTA` are defined
 * by this distinction — one counts numbers, the other counts non-empty values — so emptiness has
 * to survive the reference read instead of collapsing into the `null` that used to abort the
 * whole parse (see `asNumber`, which keeps arithmetic strict exactly as it was).
 */
type Atom =
  | { kind: 'num'; value: number }
  | { kind: 'text'; value: string }
  | { kind: 'empty' }
  | { kind: 'range'; values: number[] };

/** G23: the four official range references need the table around the current cell. */
export interface FormulaGrid {
  above?: number[];
  below?: number[];
  left?: number[];
  right?: number[];
}

/**
 * The eighteen functions of `table.formula` (`feature-catalog.md:6857-6891`), each following the
 * verbatim Chinese description next to its key. `null` means "this formula cannot be computed"
 * and surfaces as the caller's error. Where the official description is silent (empty input,
 * ties, an even-sized median) the choice is local and marked.
 *
 * The four range references `above` / `below` / `left` / `right` need the table around the
 * current cell; callers pass that as `FormulaGrid`. Without a grid they resolve to `null`
 * instead of inventing values.
 */
const FUNCTIONS: Record<string, (args: Atom[], grid?: FormulaGrid) => number | null | Atom> = {
  // Numbers only, filtered — an empty or textual argument is skipped rather than fatal, which is
  // what lets `COUNT({空列})` answer 0 instead of erroring.
  min: (args) => {
    const values = numbersOf(args);
    return values.length ? Math.min(...values) : null;
  },
  max: (args) => {
    const values = numbersOf(args);
    return values.length ? Math.max(...values) : null;
  },
  sum: (args) => numbersOf(args).reduce((total, value) => total + value, 0),
  abs: (args) => {
    const value = firstNumber(args);
    return value === null ? null : Math.abs(value);
  },
  round: (args) => {
    const value = firstNumber(args);
    if (value === null) return null;
    const digits = args.length > 1 ? firstNumber(args.slice(1)) : 0;
    if (digits === null) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  },
  // Official: 「返回小于或等于指定数字的最近整数」— floor, so INT(-2.5) is -3, not -2.
  int: (args) => {
    const value = firstNumber(args);
    return value === null ? null : Math.floor(value);
  },
  sign: (args) => {
    const value = firstNumber(args);
    return value === null ? null : Math.sign(value);
  },
  product: (args) => numbersOf(args).reduce((total, value) => total * value, 1),
  average: (args) => {
    const values = numbersOf(args);
    return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
  },
  median: (args) => {
    const values = [...numbersOf(args)].sort((a, b) => a - b);
    if (!values.length) return null;
    const middle = Math.floor(values.length / 2);
    // Even-sized input: the mean of the two middle values. The official line only says 「中值」.
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  },
  mode: (args) => {
    const values = numbersOf(args);
    const counts = new Map<number, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 1; // a value must actually repeat; ties go to the first one seen (local).
    for (const value of values) {
      const count = counts.get(value)!;
      if (count > bestCount) {
        best = value;
        bestCount = count;
      }
    }
    return best;
  },
  // Official: 「返回含有数字、数值表达式或日期的参数的个数」— numbers only.
  count: (args) => numbersOf(args).length,
  // Official: 「返回不为空的参数的个数」— anything that is not empty.
  counta: (args) => args.length
    ? args.reduce((total, arg) => total + (arg.kind === 'range' ? arg.values.length : arg.kind === 'empty' ? 0 : 1), 0)
    : 0,
  pi: () => Math.PI,
  // G23: the four range references. They return a range atom so SUM/AVERAGE/COUNT…
  // can consume the cells; arithmetic on a range is still refused by `asNumber`.
  above: (_args, grid) => (grid?.above?.length ? { kind: 'range', values: grid.above } : null),
  below: (_args, grid) => (grid?.below?.length ? { kind: 'range', values: grid.below } : null),
  left: (_args, grid) => (grid?.left?.length ? { kind: 'range', values: grid.left } : null),
  right: (_args, grid) => (grid?.right?.length ? { kind: 'range', values: grid.right } : null),
};

/** The seven bare-name constants of `table.formula`; looked up when a name is not a call. */
const CONSTANTS: Record<string, number> = {
  e: Math.E,
  ln10: Math.LN10,
  ln2: Math.LN2,
  log10e: Math.LOG10E,
  log2e: Math.LOG2E,
  sqrt1_2: Math.SQRT1_2,
  sqrt2: Math.SQRT2,
};

function numbersOf(args: Atom[]): number[] {
  return args.flatMap((arg) => {
    if (arg.kind === 'num') return [arg.value];
    if (arg.kind === 'range') return arg.values;
    return [];
  });
}

function firstNumber(args: Atom[]): number | null {
  const values = numbersOf(args);
  return values.length ? values[0] : null;
}

function asNumber(atom: Atom | null): number | null {
  // Arithmetic stays as strict as it was: only a number can be added, so an empty or textual
  // reference in `1 + {名字}` still fails the formula instead of silently becoming zero.
  return atom && atom.kind === 'num' ? atom.value : null;
}

/**
 * A deliberately tiny calculator: numbers, `{属性名}` references, the four arithmetic operators,
 * parentheses, the fourteen official functions and the seven official constants. Nothing here
 * reaches `eval`, so a formula authored in a shared collection cannot run code.
 */
function atomFromFunction(result: number | null | Atom): Atom | null {
  if (result === null) return null;
  if (typeof result === 'number') {
    return Number.isFinite(result) ? { kind: 'num', value: result } : null;
  }
  return result;
}

export function evaluateFormula(
  expression: string,
  row: Record<string, unknown> = {},
  grid?: FormulaGrid,
): FormulaResult {
  const tokens = tokenize(expression);
  if (!tokens) return { ok: false, error: '无法识别的表达式' };
  if (!tokens.length) return { ok: false, error: '表达式为空' };

  let position = 0;
  const peek = () => tokens[position];

  const expect = (kind: Token['kind'], value?: string) => {
    const token = tokens[position];
    if (!token || token.kind !== kind || (value && (token as { value?: string }).value !== value)) return null;
    position += 1;
    return token;
  };

  const parseSum = (): Atom | null => {
    let left = parseProduct();
    if (left === null) return null;
    for (;;) {
      const token = peek();
      if (token?.kind !== 'op' || (token.value !== '+' && token.value !== '-')) return left;
      position += 1;
      const right = parseProduct();
      const a = asNumber(left);
      const b = asNumber(right);
      if (right === null || a === null || b === null) return null;
      left = { kind: 'num', value: token.value === '+' ? a + b : a - b };
    }
  };

  const parseProduct = (): Atom | null => {
    let left = parseUnary();
    if (left === null) return null;
    for (;;) {
      const token = peek();
      if (token?.kind !== 'op' || (token.value !== '*' && token.value !== '/')) return left;
      position += 1;
      const right = parseUnary();
      const a = asNumber(left);
      const b = asNumber(right);
      if (right === null || a === null || b === null) return null;
      if (token.value === '/') {
        if (b === 0) return null;
        left = { kind: 'num', value: a / b };
      } else {
        left = { kind: 'num', value: a * b };
      }
    }
  };

  const parseUnary = (): Atom | null => {
    const token = peek();
    if (token?.kind === 'op' && (token.value === '-' || token.value === '+')) {
      position += 1;
      const atom = parseUnary();
      const value = asNumber(atom);
      if (atom === null || value === null) return null;
      return { kind: 'num', value: token.value === '-' ? -value : value };
    }
    return parseAtom();
  };

  const parseAtom = (): Atom | null => {
    const token = peek();
    if (!token) return null;

    if (token.kind === 'number') {
      position += 1;
      return { kind: 'num', value: token.value };
    }

    if (token.kind === 'ref') {
      position += 1;
      const raw = row[token.name];
      if (raw === null || raw === undefined || raw === '') return { kind: 'empty' };
      if (typeof raw === 'number') return { kind: 'num', value: raw };
      if (typeof raw === 'string' && raw.trim() && Number.isFinite(Number(raw))) {
        return { kind: 'num', value: Number(raw) };
      }
      return { kind: 'text', value: String(raw) };
    }

    if (token.kind === 'name') {
      position += 1;
      const key = token.name.toLowerCase();
      if (peek()?.kind === 'op' && (peek() as { value: string }).value === '(') {
        const fn = FUNCTIONS[key];
        if (!fn) return null;
        position += 1; // consume '('
        const args: Atom[] = [];
        if (expect('op', ')')) {
          return atomFromFunction(fn(args, grid));
        }
        for (;;) {
          const arg = parseSum();
          if (arg === null) return null;
          args.push(arg);
          const next = peek();
          if (next?.kind === 'op' && next.value === ',') {
            position += 1;
            continue;
          }
          if (!expect('op', ')')) return null;
          return atomFromFunction(fn(args, grid));
        }
      }
      const constant = CONSTANTS[key];
      return constant === undefined ? null : { kind: 'num', value: constant };
    }

    if (token.kind === 'op' && token.value === '(') {
      position += 1;
      const value = parseSum();
      if (value === null) return null;
      return expect('op', ')') ? value : null;
    }

    return null;
  };

  const result = parseSum();
  const value = asNumber(result);
  if (result === null || value === null || position !== tokens.length || !Number.isFinite(value)) {
    return { ok: false, error: '公式无法计算' };
  }
  return { ok: true, value };
}

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  const source = expression.trim();
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const match = /^\d*\.?\d+/.exec(source.slice(index));
      if (!match) return null;
      tokens.push({ kind: 'number', value: Number(match[0]) });
      index += match[0].length;
      continue;
    }

    if (char === '{') {
      const end = source.indexOf('}', index);
      if (end === -1) return null;
      tokens.push({ kind: 'ref', name: source.slice(index + 1, end).trim() });
      index = end + 1;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      // Digits after the first character: the official constants are `LN10`, `LOG2E`,
      // `SQRT1_2`… — stopping at the first digit split `LN10` into `LN` + `10` and the name
      // then resolved to nothing.
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index));
      if (!match) return null;
      tokens.push({ kind: 'name', name: match[0] });
      index += match[0].length;
      continue;
    }

    if ('+-*/(),'.includes(char)) {
      tokens.push({ kind: 'op', value: char });
      index += 1;
      continue;
    }

    return null;
  }

  return tokens;
}
