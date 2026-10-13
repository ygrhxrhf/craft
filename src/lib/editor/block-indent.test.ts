import { describe, expect, it } from 'vitest';

import {
  INDENT_STEP_PX,
  INDENT_VARIABLE,
  MAX_INDENT_LEVEL,
  indentDown,
  indentStyle,
  indentUp,
  indentWidth,
} from './block-indent';

/**
 * Block indentation (G218): one level is 28px, and level 0 omits the variable rather than setting
 * it to zero.
 */
describe('the indent width', () => {
  it('is 28px per level', () => {
    expect(INDENT_STEP_PX).toBe(28);
    expect(indentWidth(1)).toBe(28);
    expect(indentWidth(2)).toBe(56);
    expect(indentWidth(0)).toBe(0);
  });
});

describe('the inline style', () => {
  it('omits the variable entirely at level 0', () => {
    expect(indentStyle(0)).toEqual({});
  });

  it('sets the variable above zero', () => {
    expect(indentStyle(1)).toEqual({ [INDENT_VARIABLE]: '28px' });
    expect(indentStyle(2)).toEqual({ [INDENT_VARIABLE]: '56px' });
  });
});

describe('stepping the level', () => {
  it('goes up and down one at a time', () => {
    expect(indentUp(0)).toBe(1);
    expect(indentUp(1)).toBe(2);
    expect(indentDown(2)).toBe(1);
    expect(indentDown(1)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(indentDown(0)).toBe(0);
  });

  it('stops at the ceiling', () => {
    expect(indentUp(MAX_INDENT_LEVEL)).toBe(MAX_INDENT_LEVEL);
  });

  it('returns to no variable after stepping down to zero', () => {
    const level = indentDown(indentDown(indentUp(0)));
    expect(indentStyle(level)).toEqual({});
  });
});
