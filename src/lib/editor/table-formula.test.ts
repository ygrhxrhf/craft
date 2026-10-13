import { describe, expect, it } from 'vitest';

import { cellsInDirection, evaluateCellFormula } from './table-formula';

const grid = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

describe('a direction', () => {
  it('names the cells above, nearest first, and nothing past the edge', () => {
    expect(cellsInDirection(3, 3, 3, 2, 'above')).toEqual([
      { row: 2, col: 2 },
      { row: 1, col: 2 },
    ]);
    expect(cellsInDirection(3, 3, 1, 2, 'above')).toEqual([]);
  });

  it('names the cells to the left and the right', () => {
    expect(cellsInDirection(3, 3, 2, 2, 'left').map((cell) => cell.col)).toEqual([1]);
    expect(cellsInDirection(3, 3, 2, 2, 'right').map((cell) => cell.col)).toEqual([3]);
  });
});

describe('evaluating a formula', () => {
  it('sums an A1 range', () => {
    expect(evaluateCellFormula('=SUM(A1:B2)', grid, 3, 3)).toBe('12');
  });

  it('sums the cells above the formula', () => {
    expect(evaluateCellFormula('=SUM(ABOVE)', grid, 3, 2)).toBe('7');
  });

  it('counts the cells to the left, and counts non-empty ones separately', () => {
    expect(evaluateCellFormula('=COUNT(LEFT)', grid, 2, 3)).toBe('2');
    const sparse = [['', 'x', '1']];
    expect(evaluateCellFormula('=COUNTA(LEFT)', sparse, 1, 3)).toBe('1');
  });

  it('averages and rounds a half', () => {
    expect(evaluateCellFormula('=AVERAGE(A1:A2)', grid, 3, 1)).toBe('2.50');
    expect(evaluateCellFormula('=ROUND(A2)', grid, 1, 1)).toBe('4');
  });

  it('reads a constant without an argument', () => {
    expect(evaluateCellFormula('=PI', grid, 1, 1)).toBe(Math.PI.toFixed(2));
  });

  it('leaves plain text alone', () => {
    expect(evaluateCellFormula('hello', grid, 1, 1)).toBeNull();
    expect(evaluateCellFormula('=NOPE(A1)', grid, 1, 1)).toBeNull();
  });
});
