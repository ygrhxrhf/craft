import { describe, expect, it } from 'vitest';
import { evaluateFormula } from './formula';

const row = { 价格: 12, 数量: 3, 折扣: 0.5, 名称: '苹果' };

describe('evaluateFormula', () => {
  it('evaluates arithmetic', () => {
    expect(evaluateFormula('1 + 2 * 3')).toEqual({ ok: true, value: 7 });
    expect(evaluateFormula('(1 + 2) * 3')).toEqual({ ok: true, value: 9 });
    expect(evaluateFormula('7 / 2')).toEqual({ ok: true, value: 3.5 });
    expect(evaluateFormula('-4 + 1')).toEqual({ ok: true, value: -3 });
  });

  it('reads named properties out of the row', () => {
    expect(evaluateFormula('{价格} * {数量}', row)).toEqual({ ok: true, value: 36 });
    expect(evaluateFormula('{价格} * {数量} * (1 - {折扣})', row)).toEqual({ ok: true, value: 18 });
  });

  it('applies the whitelisted functions', () => {
    expect(evaluateFormula('MIN(3, 7, 1)')).toEqual({ ok: true, value: 1 });
    expect(evaluateFormula('MAX(3, 7)')).toEqual({ ok: true, value: 7 });
    expect(evaluateFormula('SUM(1, 2, 3)')).toEqual({ ok: true, value: 6 });
    expect(evaluateFormula('ROUND(1.235, 2)')).toEqual({ ok: true, value: 1.24 });
    expect(evaluateFormula('ABS(-2) * {数量}', row)).toEqual({ ok: true, value: 6 });
  });

  it('refuses a missing or non-numeric reference', () => {
    expect(evaluateFormula('{不存在} + 1', row).ok).toBe(false);
    expect(evaluateFormula('{名称} + 1', row).ok).toBe(false);
  });

  it('refuses anything outside the language instead of evaluating it', () => {
    expect(evaluateFormula('alert(1)').ok).toBe(false);
    expect(evaluateFormula('1 +').ok).toBe(false);
    expect(evaluateFormula('a; drop').ok).toBe(false);
    expect(evaluateFormula('1 / 0').ok).toBe(false);
    expect(evaluateFormula('').ok).toBe(false);
  });
});

/**
 * The fourteen functions and seven constants of `table.formula`
 * (`feature-catalog.md:6857-6881`), each pinned to its verbatim description: INT floors toward
 * negative infinity, SIGN answers 1/-1/0, COUNT counts numbers while COUNTA counts non-empty
 * values, and the range references stay unimplemented on purpose.
 */
describe('the official table.formula set', () => {
  const cells = { a: 1, b: '苹果', c: '', d: null, e: '2' };

  it('follows each function description', () => {
    expect(evaluateFormula('INT(-2.5)')).toEqual({ ok: true, value: -3 });
    expect(evaluateFormula('INT(2.7)')).toEqual({ ok: true, value: 2 });
    expect(evaluateFormula('SIGN(5)')).toEqual({ ok: true, value: 1 });
    expect(evaluateFormula('SIGN(-5)')).toEqual({ ok: true, value: -1 });
    expect(evaluateFormula('SIGN(0)')).toEqual({ ok: true, value: 0 });
    expect(evaluateFormula('AVERAGE(2, 4, 6)')).toEqual({ ok: true, value: 4 });
    expect(evaluateFormula('PRODUCT(2, 3, 4)')).toEqual({ ok: true, value: 24 });
    expect(evaluateFormula('MEDIAN(1, 2, 3)')).toEqual({ ok: true, value: 2 });
    expect(evaluateFormula('MEDIAN(1, 2, 3, 4)')).toEqual({ ok: true, value: 2.5 });
    expect(evaluateFormula('MODE(1, 2, 2, 3)')).toEqual({ ok: true, value: 2 });
    expect(evaluateFormula('PI()')).toEqual({ ok: true, value: Math.PI });
    expect(evaluateFormula('SUM(1, 2) + MIN(4, 2)')).toEqual({ ok: true, value: 5 });
  });

  it('separates COUNT (how many numbers) from COUNTA (how many values)', () => {
    expect(evaluateFormula('COUNT({a},{b},{c},{d},{e})', cells)).toEqual({ ok: true, value: 2 });
    expect(evaluateFormula('COUNTA({a},{b},{c},{d})', cells)).toEqual({ ok: true, value: 2 });
    expect(evaluateFormula('COUNTA({c},{d})', cells)).toEqual({ ok: true, value: 0 });
    expect(evaluateFormula('COUNT({c},{d})', cells)).toEqual({ ok: true, value: 0 });
  });

  it('resolves the bare constants without parentheses', () => {
    expect(evaluateFormula('E')).toEqual({ ok: true, value: Math.E });
    expect(evaluateFormula('LN10')).toEqual({ ok: true, value: Math.LN10 });
    expect(evaluateFormula('LN2')).toEqual({ ok: true, value: Math.LN2 });
    expect(evaluateFormula('LOG10E')).toEqual({ ok: true, value: Math.LOG10E });
    expect(evaluateFormula('LOG2E')).toEqual({ ok: true, value: Math.LOG2E });
    expect(evaluateFormula('SQRT1_2')).toEqual({ ok: true, value: Math.SQRT1_2 });
    expect(evaluateFormula('SQRT2')).toEqual({ ok: true, value: Math.SQRT2 });
    expect(evaluateFormula('1 + PI() / PI()')).toEqual({ ok: true, value: 2 });
  });

  it('keeps the no-eval property and the declared deferrals', () => {
    expect(evaluateFormula('Function("return 1")()').ok).toBe(false);
    expect(evaluateFormula('constructor(1)').ok).toBe(false);
    expect(evaluateFormula('window.location').ok).toBe(false);
    // above/below/left/right address a grid; this engine only ever sees one row, so they stay
    // failing names rather than a fabricated answer.
    expect(evaluateFormula('ABOVE()').ok).toBe(false);
    expect(evaluateFormula('BELOW(1)').ok).toBe(false);
    // A tie resolves to the first value seen — the official description does not say (local).
    expect(evaluateFormula('MODE(1, 1, 2, 2)')).toEqual({ ok: true, value: 1 });
  });
});
