import { describe, expect, it } from 'vitest';

import {
  RECENTS_LIMIT,
  REMOVE_FROM_RECENTS,
  forgetRecent,
  loadRecents,
  recentForDisplay,
  rememberRecent,
  saveRecents,
} from './recents';

describe('search recents (G235)', () => {
  it('keeps the copy verbatim', () => {
    expect(REMOVE_FROM_RECENTS).toBe('从最近使用中移除');
  });

  it('moves a reopened document to the front without duplicating it', () => {
    const list = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ];
    expect(rememberRecent(list, { id: 'b', title: 'B' })).toEqual([
      { id: 'b', title: 'B' },
      { id: 'a', title: 'A' },
    ]);
  });

  it('caps the list and ignores a blank id', () => {
    let list: { id: string; title: string }[] = [];
    for (let i = 0; i < RECENTS_LIMIT + 3; i += 1) list = rememberRecent(list, { id: `d${i}`, title: `D${i}` });
    expect(list).toHaveLength(RECENTS_LIMIT);
    expect(list[0].id).toBe(`d${RECENTS_LIMIT + 2}`);
    expect(rememberRecent(list, { id: '  ', title: 'x' })).toHaveLength(RECENTS_LIMIT);
  });

  it('removes one entry', () => {
    const list = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ];
    expect(forgetRecent(list, 'a')).toEqual([{ id: 'b', title: 'B' }]);
  });

  it('round-trips through storage and survives bad data', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    const list = [{ id: 'a', title: 'A' }];
    saveRecents(storage, list);
    expect(loadRecents(storage)).toEqual(list);
    store.set('craft.search.recents', '{not json');
    expect(loadRecents(storage)).toEqual([]);
    store.set('craft.search.recents', JSON.stringify([{ id: 1 }, null, { id: 'ok', title: 2 }]));
    expect(loadRecents(storage)).toEqual([{ id: 'ok', title: '2' }]);
  });
});

describe('the recent-documents group (G355)', () => {
  it('truncates at the official 20, not the old local 8', () => {
    expect(RECENTS_LIMIT).toBe(20);
  });

  it('drops the document that is open right now', () => {
    const list = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ];
    expect(recentForDisplay(list, 'a').map((item) => item.id)).toEqual(['b']);
  });

  it('keeps the whole list when nothing is open, up to the cap', () => {
    const list = Array.from({ length: 25 }, (_, i) => ({ id: `d${i}`, title: `D${i}` }));
    expect(recentForDisplay(list, null)).toHaveLength(20);
    expect(recentForDisplay(list, null)[0].id).toBe('d0');
  });

  it('sorts by each document\'s updatedAt, oldest first', () => {
    const list = [
      { id: 'new', title: 'New', updatedAt: '2026-11-07T10:00:00.000Z' },
      { id: 'old', title: 'Old', updatedAt: '2026-01-02T10:00:00.000Z' },
      { id: 'mid', title: 'Mid', updatedAt: '2026-06-01T10:00:00.000Z' },
    ];
    expect(recentForDisplay(list, null).map((item) => item.id)).toEqual(['old', 'mid', 'new']);
  });

  it('drops the current document before sorting, so it never takes a slot', () => {
    const list = [
      { id: 'a', title: 'A', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', title: 'B', updatedAt: '2026-02-01T00:00:00.000Z' },
    ];
    expect(recentForDisplay(list, 'a').map((item) => item.id)).toEqual(['b']);
  });

  it('pushes entries with no updatedAt (legacy storage) behind the dated ones', () => {
    const list = [
      { id: 'undated', title: 'U' },
      { id: 'dated', title: 'D', updatedAt: '2026-05-05T00:00:00.000Z' },
      { id: 'bad', title: 'B', updatedAt: 'not-a-date' },
    ];
    expect(recentForDisplay(list, null).map((item) => item.id)).toEqual(['dated', 'undated', 'bad']);
  });

  it('stores updatedAt with the entry and keeps it when a doc is reopened without one', () => {
    const stored = rememberRecent([], { id: 'a', title: 'A', updatedAt: '2026-03-01T00:00:00.000Z' });
    expect(stored[0].updatedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(rememberRecent(stored, { id: 'a', title: 'A' })[0].updatedAt).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });

  it('round-trips updatedAt through storage and drops a malformed one', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    saveRecents(storage, [{ id: 'a', title: 'A', updatedAt: '2026-03-01T00:00:00.000Z' }]);
    expect(loadRecents(storage)[0].updatedAt).toBe('2026-03-01T00:00:00.000Z');
    store.set('craft.search.recents', JSON.stringify([{ id: 'b', title: 'B', updatedAt: 'nope' }]));
    expect(loadRecents(storage)).toEqual([{ id: 'b', title: 'B' }]);
  });
});
