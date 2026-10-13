import { describe, expect, it } from 'vitest';

import {
  OPERATORS,
  OPERATORS_BY_TYPE,
  applyFilter,
  evaluateOperator,
  operatorsFor,
  resolveOperator,
} from './filter-operators';

/**
 * The gate reads the ledger's own tables (`protocol.md` §九) as the source: the 19 line values,
 * the `TKe` permission table, and the evaluation edges that differ from an intuitive
 * implementation. Anything asserted here is a fact a wrong filter can silently violate — a
 * filter that passes everything looks exactly like a working one.
 */
describe('the official operator vocabulary', () => {
  it('holds exactly the 19 line values from protocol §9', () => {
    expect(Object.keys(OPERATORS)).toEqual([
      'isEmpty',
      'isNotEmpty',
      'equals',
      'doesNotEqual',
      'string_contains',
      'string_doesNotContain',
      'select_isAnyOf',
      'select_isNoneOf',
      'relation_hasAnyOf',
      'relation_hasAllOf',
      'relation_hasNoneOf',
      'date_isBefore',
      'date_isAfter',
      'number_equal',
      'number_notEqual',
      'number_smaller',
      'number_smallerOrEqual',
      'number_greater',
      'number_greaterOrEqual',
    ]);
  });

  it('prints the official labels verbatim', () => {
    expect(OPERATORS.equals.label).toBe('是');
    expect(OPERATORS.doesNotEqual.label).toBe('不是');
    expect(OPERATORS.string_contains.label).toBe('包含');
    expect(OPERATORS.string_doesNotContain.label).toBe('不包含');
    expect(OPERATORS.select_isAnyOf.label).toBe('任何');
    expect(OPERATORS.select_isNoneOf.label).toBe('无');
    expect(OPERATORS.isEmpty.label).toBe('为空');
    expect(OPERATORS.isNotEmpty.label).toBe('不为空');
    expect(OPERATORS.date_isBefore.label).toBe('早于');
    expect(OPERATORS.date_isAfter.label).toBe('晚于');
    expect(OPERATORS.number_equal.label).toBe('=');
    expect(OPERATORS.number_greaterOrEqual.label).toBe('≥');
  });

  it('leaves the operand off exactly the two official operators that have none', () => {
    const withoutValue = Object.entries(OPERATORS)
      .filter(([, def]) => !def.takesValue)
      .map(([id]) => id);
    expect(withoutValue).toEqual(['isEmpty', 'isNotEmpty']);
  });
});

describe('the TKe permission table', () => {
  it('gives checkbox exactly one operator', () => {
    expect(OPERATORS_BY_TYPE.checkbox).toEqual(['equals']);
  });

  it('offers the six string operators to text-shaped columns and nothing more', () => {
    for (const type of ['text', 'url', 'email'] as const) {
      expect(operatorsFor(type)).toEqual([
        'string_contains',
        'string_doesNotContain',
        'isEmpty',
        'isNotEmpty',
        'equals',
        'doesNotEqual',
      ]);
    }
  });

  it('limits media to the four string operators — no equals, unlike text', () => {
    expect(operatorsFor('file')).toEqual(['string_contains', 'string_doesNotContain', 'isEmpty', 'isNotEmpty']);
    expect(operatorsFor('file')).not.toContain('equals');
  });

  it('gives number all eight, select both multi-value operators, relation only its trio', () => {
    expect(operatorsFor('number')).toHaveLength(8);
    expect(operatorsFor('multi_select')).toEqual(operatorsFor('select'));
    expect(operatorsFor('relation')).toEqual([
      'relation_hasAnyOf',
      'relation_hasAllOf',
      'relation_hasNoneOf',
      'isEmpty',
      'isNotEmpty',
    ]);
    expect(operatorsFor('date')).toHaveLength(6);
  });

  it('offers nothing on the three locally-only types: official TKe has no default branch', () => {
    expect(operatorsFor('formula')).toEqual([]);
    expect(operatorsFor('created_at')).toEqual([]);
    expect(operatorsFor('updated_at')).toEqual([]);
  });

  it('refuses an operator that belongs to another column type', () => {
    // `number_greater` is legal on number, inert on text — the guard that keeps the menu and the
    // evaluator agreeing on what a column may ask.
    expect(resolveOperator('number_greater', 'number')).toBe('number_greater');
    expect(resolveOperator('number_greater', 'text')).toBeNull();
    expect(resolveOperator('select_isAnyOf', 'text')).toBeNull();
    expect(resolveOperator('string_contains', 'checkbox')).toBeNull();
  });
});

describe('stored line values', () => {
  it('maps every one of the fourteen legacy values onto an official one', () => {
    const legacy: Record<string, [string, string]> = {
      contains: ['text', 'string_contains'],
      not_contains: ['text', 'string_doesNotContain'],
      is: ['text', 'equals'],
      is_not: ['text', 'doesNotEqual'],
      is_empty: ['text', 'isEmpty'],
      is_not_empty: ['text', 'isNotEmpty'],
      eq: ['number', 'number_equal'],
      ne: ['number', 'number_notEqual'],
      gt: ['number', 'number_greater'],
      gte: ['number', 'number_greaterOrEqual'],
      lt: ['number', 'number_smaller'],
      lte: ['number', 'number_smallerOrEqual'],
      before: ['date', 'date_isBefore'],
      after: ['date', 'date_isAfter'],
    };
    for (const [stored, [type, expected]] of Object.entries(legacy)) {
      expect(resolveOperator(stored, type), `${stored} on ${type}`).toBe(expected);
    }
  });

  it('turns a value that means nothing on this column into an inert filter', () => {
    // `before` is a date operator; on a number column the legacy value cannot be honoured.
    expect(resolveOperator('before', 'number')).toBeNull();
    expect(resolveOperator('nonsense', 'text')).toBeNull();
    expect(applyFilter({ propertyId: 'p', operator: 'nonsense', value: 'x' }, 'anything', 'text')).toBe(true);
  });
});

describe('evaluation edges the official source pins down', () => {
  it('answers false — not true — when either side of a contains is empty', () => {
    expect(evaluateOperator('string_contains', '', 'a', 'text')).toBe(false);
    expect(evaluateOperator('string_contains', 'abc', '', 'text')).toBe(false);
    expect(evaluateOperator('string_doesNotContain', '', 'a', 'text')).toBe(false);
    expect(evaluateOperator('string_doesNotContain', 'abc', '', 'text')).toBe(false);
    expect(evaluateOperator('string_contains', 'abc', 'b', 'text')).toBe(true);
    expect(evaluateOperator('string_doesNotContain', 'abc', 'b', 'text')).toBe(false);
  });

  it('answers true for none-of when the cell is null, without looking at the operand', () => {
    expect(evaluateOperator('select_isNoneOf', null, 'a, b', 'multi_select')).toBe(true);
    expect(evaluateOperator('select_isNoneOf', ['a'], 'a, b', 'multi_select')).toBe(false);
    expect(evaluateOperator('select_isNoneOf', ['c'], 'a, b', 'multi_select')).toBe(true);
  });

  it('requires an array operand for any-of and refuses a non-array one', () => {
    expect(evaluateOperator('select_isAnyOf', ['a', 'b'], 'b', 'multi_select')).toBe(true);
    expect(evaluateOperator('select_isAnyOf', ['a'], 7, 'multi_select')).toBe(false);
  });

  it('keeps unparsable numbers out of every number filter instead of letting ≠ collect them', () => {
    expect(evaluateOperator('number_equal', 'not a number', 3, 'number')).toBe(false);
    expect(evaluateOperator('number_notEqual', 'not a number', 3, 'number')).toBe(false);
    expect(evaluateOperator('number_greater', '10', '9', 'number')).toBe(true);
    expect(evaluateOperator('number_smallerOrEqual', '9', '10', 'number')).toBe(true);
  });

  it('compares dates by instant and refuses an unparsable one', () => {
    expect(evaluateOperator('date_isBefore', '2026-01-02', '2026-01-03', 'date')).toBe(true);
    expect(evaluateOperator('date_isAfter', '2026-01-02', '2026-01-03', 'date')).toBe(false);
    expect(evaluateOperator('date_isBefore', 'not a date', '2026-01-03', 'date')).toBe(false);
  });

  it('treats an empty cell as empty only for the two emptiness operators', () => {
    expect(evaluateOperator('isEmpty', '', null, 'text')).toBe(true);
    expect(evaluateOperator('isEmpty', null, null, 'text')).toBe(true);
    expect(evaluateOperator('isNotEmpty', 'x', null, 'text')).toBe(true);
    expect(evaluateOperator('isEmpty', 'x', null, 'text')).toBe(false);
  });

  it('answers relation operators over the local id-array shape', () => {
    expect(evaluateOperator('relation_hasAnyOf', ['i1', 'i2'], 'i2, i3', 'relation')).toBe(true);
    expect(evaluateOperator('relation_hasAllOf', ['i1', 'i2'], 'i2, i3', 'relation')).toBe(false);
    expect(evaluateOperator('relation_hasAllOf', ['i2'], 'i2, i3', 'relation')).toBe(true);
    expect(evaluateOperator('relation_hasAllOf', [], 'i2', 'relation')).toBe(false);
    expect(evaluateOperator('relation_hasNoneOf', ['i1'], 'i2', 'relation')).toBe(true);
  });
});
