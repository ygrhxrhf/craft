import { describe, expect, it } from 'vitest';

import { groupReactions, reactionSentence } from './reaction-copy';

describe('the reaction sentence', () => {
  it('names the one person', () => {
    expect(reactionSentence({ glyph: '👍', names: ['张三'] })).toBe('张三 添加了 👍 表情');
  });

  it('names both people', () => {
    expect(reactionSentence({ glyph: '👍', names: ['张三', '李四'] })).toBe('张三 和 李四 添加了 👍 表情');
  });

  it('counts everyone past the first', () => {
    expect(reactionSentence({ glyph: '🎉', names: ['张三', '李四', '王五'] })).toBe(
      '张三 及其他 2 人添加了 🎉 表情',
    );
  });

  it('says nothing when nobody reacted', () => {
    expect(reactionSentence({ glyph: '👍', names: [] })).toBe('');
  });
});

describe('grouping', () => {
  it('keeps one group per glyph, in first-seen order', () => {
    expect(
      groupReactions([
        { glyph: '👍', name: '张三' },
        { glyph: '🎉', name: '李四' },
        { glyph: '👍', name: '王五' },
      ]),
    ).toEqual([
      { glyph: '👍', names: ['张三', '王五'] },
      { glyph: '🎉', names: ['李四'] },
    ]);
  });
});
