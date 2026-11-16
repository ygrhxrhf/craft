import { describe, expect, it } from 'vitest';

import { reactionRowId, readReactions } from './reactions';

/**
 * G1640：表情是**每人一行**（`comment_reaction`），不再是一枚 JSON 数组。这一层只回答两件事：
 * 「读回来哪些行是干净的」与「这个人对这一枚表情有没有行、是哪一行」——有没有就是"要不要新建一行"，
 * 是哪一行就是"墓碑打在哪"。
 */
const mine = { id: 'r1', glyph: '👍', userId: 'u1', name: '张三' };
const theirs = { id: 'r2', glyph: '👍', userId: 'u2', name: '李四' };

describe('reading stored rows', () => {
  it('keeps well-formed rows and drops the rest', () => {
    expect(readReactions([mine, { glyph: '🎉' }, null, 'nope', { id: 'x', glyph: '👍', userId: 'u1' }]))
      .toEqual([mine]);
  });

  it('reads anything that is not a list as none', () => {
    expect(readReactions(null)).toEqual([]);
    expect(readReactions('👍')).toEqual([]);
    expect(readReactions(undefined)).toEqual([]);
  });
});

describe('locating this person’s row', () => {
  it('returns the row id when they already reacted with that glyph', () => {
    expect(reactionRowId([mine, theirs], 'u1', '👍')).toBe('r1');
    expect(reactionRowId([mine, theirs], 'u2', '👍')).toBe('r2');
  });

  it('returns null for a different glyph or a different person', () => {
    expect(reactionRowId([mine], 'u1', '🎉')).toBeNull();
    expect(reactionRowId([mine], 'u3', '👍')).toBeNull();
    expect(reactionRowId([], 'u1', '👍')).toBeNull();
  });

  it('the same person can hold several glyphs at once (one row each)', () => {
    const second = { id: 'r3', glyph: '🎉', userId: 'u1', name: '张三' };
    expect(reactionRowId([mine, second], 'u1', '🎉')).toBe('r3');
    expect(reactionRowId([mine, second], 'u1', '👍')).toBe('r1');
  });
});
