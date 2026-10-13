import { describe, expect, it } from 'vitest';

import { fillPositional, interpolationKinds, mixesSyntaxes } from './interpolation';

/**
 * The four interpolation syntaxes (G229): mustache legacy, positional, prompt slot and i18next
 * named.
 */
describe('reading the syntaxes a string uses', () => {
  it('reads a positional slot', () => {
    expect(interpolationKinds('你现在是 [0] 的成员')).toEqual(['positional']);
  });

  it('reads a prompt slot', () => {
    expect(interpolationKinds('总结 {0} 的内容')).toEqual(['promptSlot']);
  });

  it('reads a legacy named slot', () => {
    expect(interpolationKinds('你现在是 {{spaceName}} 的管理员')).toEqual(['namedLegacy']);
  });

  it('reads an i18next named slot', () => {
    expect(interpolationKinds('已删除 {{deletedCount}} 项')).toEqual(['i18nextNamed']);
  });

  it('reports the order they appear in', () => {
    expect(interpolationKinds('[0] 与 {0}')).toEqual(['positional', 'promptSlot']);
  });
});

describe('mixing syntaxes', () => {
  it('flags a string that uses more than one', () => {
    expect(mixesSyntaxes('[0] 和 {{name}}')).toBe(true);
  });

  it('does not flag a string that uses one', () => {
    expect(mixesSyntaxes('[0] 结果')).toBe(false);
    expect(mixesSyntaxes('没有插值')).toBe(false);
  });
});

describe('filling positional slots', () => {
  it('replaces each [N] with its value', () => {
    expect(fillPositional('创建 [0]', ['季度复盘'])).toBe('创建 季度复盘');
  });

  it('fills out of order by index', () => {
    expect(fillPositional('[1] 先于 [0]', ['甲', '乙'])).toBe('乙 先于 甲');
  });

  it('leaves a missing value as an empty string rather than the slot', () => {
    expect(fillPositional('创建 [0] 于 [1]', ['季度复盘'])).toBe('创建 季度复盘 于 ');
  });
});
