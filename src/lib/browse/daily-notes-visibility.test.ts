import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SHOW_DAILY_NOTES,
  readShowDailyNotes,
  serverShowDailyNotes,
  storeShowDailyNotes,
  subscribeShowDailyNotes,
} from './daily-notes-visibility';

describe('the 显示每日笔记 switch (G223)', () => {
  const store = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };

  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('starts on, which is the menu’s ✓ state', () => {
    expect(DEFAULT_SHOW_DAILY_NOTES).toBe(true);
    expect(serverShowDailyNotes()).toBe(true);
    expect(readShowDailyNotes()).toBe(true);
  });

  it('round-trips through storage and notifies subscribers', () => {
    let calls = 0;
    const off = subscribeShowDailyNotes(() => {
      calls += 1;
    });
    storeShowDailyNotes(false);
    expect(readShowDailyNotes()).toBe(false);
    expect(calls).toBe(1);
    storeShowDailyNotes(true);
    expect(readShowDailyNotes()).toBe(true);
    expect(calls).toBe(2);
    off();
  });
});
