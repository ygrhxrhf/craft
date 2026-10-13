import { describe, expect, it } from 'vitest';

import { readReactions, toggleReaction } from './reactions';

const mine = { glyph: '👍', userId: 'u1', name: '张三' };

describe('reading a stored list', () => {
  it('keeps well-formed entries and drops the rest', () => {
    expect(readReactions([mine, { glyph: '🎉' }, null, 'nope'])).toEqual([mine]);
  });

  it('reads anything that is not a list as none', () => {
    expect(readReactions(null)).toEqual([]);
    expect(readReactions('👍')).toEqual([]);
  });
});

describe('toggling', () => {
  it('adds a reaction the person has not made', () => {
    expect(toggleReaction([], mine)).toEqual([mine]);
  });

  it('removes it when they make the same one again', () => {
    expect(toggleReaction([mine], mine)).toEqual([]);
  });

  it('keeps a different glyph and a different person', () => {
    const other = { glyph: '🎉', userId: 'u1', name: '张三' };
    const theirs = { glyph: '👍', userId: 'u2', name: '李四' };
    expect(toggleReaction([mine], other)).toEqual([mine, other]);
    expect(toggleReaction([mine, theirs], mine)).toEqual([theirs]);
  });
});
