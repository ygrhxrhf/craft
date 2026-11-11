import { describe, expect, it } from 'vitest';

import { parseSeparatorExpression } from './separator-expression';

describe('parseSeparatorExpression（G707/G708）', () => {
  it('reads the two bare forms', () => {
    expect(parseSeparatorExpression('line')).toEqual({ kind: 'line' });
    expect(parseSeparatorExpression('doodle')).toEqual({ kind: 'doodle' });
    expect(parseSeparatorExpression(' none ')).toBeNull();
    expect(parseSeparatorExpression(undefined)).toBeNull();
  });

  it('reads a washi image expression', () => {
    expect(parseSeparatorExpression('washi(image, "https://a/b.png", "{{SECRET_ab12}}")')).toEqual({
      kind: 'washi-image',
      url: 'https://a/b.png',
      token: '{{SECRET_ab12}}',
    });
  });

  it('keeps commas inside the quoted url', () => {
    expect(parseSeparatorExpression('washi(image, "https://a/b,c.png", "tok")')).toEqual({
      kind: 'washi-image',
      url: 'https://a/b,c.png',
      token: 'tok',
    });
  });

  it('reads a washi pattern expression', () => {
    expect(parseSeparatorExpression('washi(pattern, "grid", "#3B82F6 #1E3A8A")')).toEqual({
      kind: 'washi-pattern',
      pattern: 'grid',
      light: '#3B82F6',
      dark: '#1E3A8A',
    });
    expect(parseSeparatorExpression('washi(pattern, "nope", "#3B82F6")')).toBeNull();
    expect(parseSeparatorExpression('washi(pattern, "dot", "#25f")')).toBeNull();
  });

  it('rejects an image expression with no url', () => {
    expect(parseSeparatorExpression('washi(image, , "tok")')).toBeNull();
    expect(parseSeparatorExpression('washi(other)')).toBeNull();
  });
});
