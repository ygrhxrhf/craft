import { describe, expect, it } from 'vitest';

import {
  BASE_SNAPSHOT_KEYS,
  emptyBaseSnapshot,
  INITIAL_SYNC_TOKEN,
  isDegenerateBase,
  normalizeBase,
  oldValueOf,
} from './conflict-base';

describe('normalizeBase (G441)', () => {
  it('fills a missing token with the literal "init"', () => {
    expect(normalizeBase({}).syncToken).toBe(INITIAL_SYNC_TOKEN);
    expect(normalizeBase({ syncToken: 'tok-1' }).syncToken).toBe('tok-1');
    expect(normalizeBase(null).syncToken).toBe(INITIAL_SYNC_TOKEN);
  });

  it('a null snapshot becomes the four empty dictionaries', () => {
    const base = normalizeBase({ snapshot: null });
    expect(base.snapshot).toEqual(emptyBaseSnapshot());
    for (const key of BASE_SNAPSHOT_KEYS) expect(base.snapshot![key]).toEqual({});
  });

  it('keeps the dictionaries the server did send and fills the rest', () => {
    const base = normalizeBase({ syncToken: 't', snapshot: { oldPluginData: { a: 1 } } as never });
    expect(base.snapshot!.oldPluginData).toEqual({ a: 1 });
    expect(base.snapshot!.oldObjectData).toEqual({});
  });

  it('copies the dictionaries rather than aliasing the server object', () => {
    const incoming = { oldPluginData: { a: 1 } };
    const base = normalizeBase({ snapshot: incoming as never });
    (base.snapshot!.oldPluginData as Record<string, number>).a = 2;
    expect(incoming.oldPluginData.a).toBe(1);
  });
});

describe('isDegenerateBase (G441: first sync falls back to server-wins)', () => {
  it('a null snapshot is degenerate', () => {
    expect(isDegenerateBase(normalizeBase({ snapshot: null }))).toBe(true);
  });

  it('four empty dictionaries are degenerate', () => {
    expect(isDegenerateBase({ syncToken: INITIAL_SYNC_TOKEN, snapshot: emptyBaseSnapshot() })).toBe(true);
  });

  it('one non-empty dictionary is enough to make it a real base', () => {
    const snapshot = emptyBaseSnapshot();
    snapshot.oldTaskData = { t1: { title: '旧' } };
    expect(isDegenerateBase({ syncToken: 't', snapshot })).toBe(false);
  });
});

describe('oldValueOf (G441)', () => {
  const base = normalizeBase({ snapshot: { oldTaskData: { t1: null } } as never });

  it('separates "server never told me" from "the old value was empty"', () => {
    expect(oldValueOf(base, 'oldTaskData', 't1')).toEqual({ known: true, value: null });
    expect(oldValueOf(base, 'oldTaskData', 't2')).toEqual({ known: false, value: undefined });
  });
});
