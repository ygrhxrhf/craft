import { describe, expect, it } from 'vitest';

import {
  RECENTS_LIMIT,
  REMOVE_FROM_RECENTS,
  forgetRecent,
  loadRecents,
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
