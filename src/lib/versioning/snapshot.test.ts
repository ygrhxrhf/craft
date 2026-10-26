import { describe, expect, it } from 'vitest';

import { changedFields, shouldSnapshot, versionMeta } from './snapshot';

const NOW = Date.parse('2026-10-07T12:00:00+08:00');
const iso = (ms: number) => new Date(ms).toISOString();

const row = {
  title: '甲',
  icon: null,
  coverImage: null,
  coverType: null,
  width: null,
  pageStyle: { theme: 'default', fontPack: 'inter' },
  content: { type: 'doc', content: [] },
  plainText: 'x',
  wordCount: 1,
  updatedAt: '2026-10-01 10:00:00+08',
};

describe('changedFields', () => {
  it('lists only versionable fields whose value moved', () => {
    expect(changedFields(row, { ...row, title: '乙' })).toEqual(['title']);
  });

  it('ignores columns that are not versioned', () => {
    expect(changedFields(row, { ...row, updatedAt: '2026-10-07 12:00:00+08' })).toEqual([]);
  });

  it('compares Json by content, not by key order', () => {
    const reordered = { ...row, pageStyle: { fontPack: 'inter', theme: 'default' } };
    expect(changedFields(row, reordered)).toEqual([]);
  });

  it('sees a nested style move', () => {
    expect(changedFields(row, { ...row, pageStyle: { theme: 'cream', fontPack: 'inter' } })).toEqual([
      'pageStyle',
    ]);
  });
});

describe('shouldSnapshot', () => {
  it('skips a write that moved nothing versionable', () => {
    expect(shouldSnapshot([], null, NOW)).toBe(false);
  });

  it('snapshots a metadata change immediately, one second after the last version', () => {
    expect(shouldSnapshot(['title'], iso(NOW - 1_000), NOW)).toBe(true);
  });

  it('holds a content-only change back until the ten minute window passes', () => {
    expect(shouldSnapshot(['content', 'plainText', 'wordCount'], iso(NOW - 60_000), NOW)).toBe(false);
  });

  it('takes a content-only change once the window passed', () => {
    expect(shouldSnapshot(['content'], iso(NOW - 10 * 60 * 1000), NOW)).toBe(true);
  });

  it('takes the first content-only change when there is no version yet', () => {
    expect(shouldSnapshot(['content'], null, NOW)).toBe(true);
  });

  it('treats an unparsable version timestamp as no window', () => {
    expect(shouldSnapshot(['content'], 'not-a-time', NOW)).toBe(true);
  });
});

describe('versionMeta', () => {
  it('keeps the five style columns and nothing else', () => {
    expect(versionMeta(row)).toEqual({
      icon: null,
      coverImage: null,
      coverType: null,
      width: null,
      pageStyle: { theme: 'default', fontPack: 'inter' },
    });
  });

  it('turns a missing style column into null rather than dropping the key', () => {
    expect(versionMeta({ title: '甲' })).toEqual({
      icon: null,
      coverImage: null,
      coverType: null,
      width: null,
      pageStyle: null,
    });
  });
});
