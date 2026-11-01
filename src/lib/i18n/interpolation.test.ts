import { describe, expect, it } from 'vitest';

import { fillNamed, fillPositional, interpolate, interpolationKinds, mixesSyntaxes } from './interpolation';

/**
 * The six interpolation conventions (G229 / G321): positional, named, prompt slot, wrapping tag,
 * indexed children, and a literal `[team]` that is a word rather than a parameter.
 */
describe('reading the conventions a string uses', () => {
  it('reads a positional slot', () => {
    expect(interpolationKinds('你现在是 [0] 的成员')).toEqual(['positional']);
  });

  it('reads a prompt slot', () => {
    expect(interpolationKinds('总结 {0} 的内容')).toEqual(['promptSlot']);
  });

  it('reads a named slot, i18next form included', () => {
    expect(interpolationKinds('你现在是 {{spaceName}} 的管理员')).toEqual(['namedLegacy']);
    expect(interpolationKinds('已删除 {{deletedCount}} 项')).toEqual(['namedLegacy']);
  });

  it('reads a wrapping tag', () => {
    expect(interpolationKinds('请阅读 <b>条款</b> 后再继续')).toEqual(['wrappingTag']);
  });

  it('reads numeric-index children, distinct from a named tag', () => {
    expect(interpolationKinds('你想提及 <0></0>，但他们未被邀请')).toEqual(['indexedChildren']);
  });

  it('reports the order they appear in', () => {
    expect(interpolationKinds('[0] 与 {0}')).toEqual(['positional', 'promptSlot']);
  });
});

describe('the literal word is not a parameter', () => {
  it('does not read [team] as a positional slot, because the index is not numeric', () => {
    expect(interpolationKinds('<b>[team]</b> 说明')).toEqual(['wrappingTag']);
  });
});

describe('mixing conventions', () => {
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

  it('does not touch a literal bracketed word', () => {
    expect(fillPositional('[team] 与 [0]', ['甲'])).toBe('[team] 与 甲');
  });
});

// G321: the two forms a plain string carries, plus the pass-through for the other four.
describe('filling the two string forms', () => {
  it('fills named slots and leaves an unknown name visible', () => {
    expect(fillNamed('已删除 {{deletedCount}} 项', { deletedCount: 3 })).toBe('已删除 3 项');
    expect(fillNamed('你的方案是 {{plan}}', {})).toBe('你的方案是 {{plan}}');
  });

  it('applies positional then named in one pass', () => {
    expect(interpolate('[0] 属于 {{space}}', { positional: ['文档'], named: { space: '工作区' } })).toBe(
      '文档 属于 工作区',
    );
  });

  it('leaves prompt slots and tags alone', () => {
    expect(interpolate('总结 {0} 的内容', { positional: ['甲'] })).toBe('总结 {0} 的内容');
    expect(interpolate('请阅读 <b>条款</b>', {})).toBe('请阅读 <b>条款</b>');
  });
});
