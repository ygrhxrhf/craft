import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_FIND_OPTIONS, type FindOptions } from '@/lib/find/options';

/**
 * The store reads the persisted row once at module evaluation, so each case re-imports it against
 * its own `localStorage` stub. Module reset keeps one case's hydration out of the next.
 */
async function loadStore(seed?: Partial<FindOptions>) {
  const map = new Map<string, string>();
  if (seed) map.set('craft.find.options', JSON.stringify(seed));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  });
  vi.resetModules();
  const { useFindReplaceStore } = await import('./use-find-replace-store');
  return { store: useFindReplaceStore, map };
}

const persisted = (map: Map<string, string>): FindOptions =>
  JSON.parse(map.get('craft.find.options') ?? '{}') as FindOptions;

describe('G1418 — find options survive a reload', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('hydrates the four options from the persisted row', async () => {
    const { store } = await loadStore({
      mode: 'regex',
      scope: 'doc',
      caseSensitive: true,
      ignoreDiacritics: false,
    });
    const state = store.getState();
    expect([state.mode, state.scope, state.caseSensitive, state.ignoreDiacritics]).toEqual([
      'regex',
      'doc',
      true,
      false,
    ]);
  });

  it('falls back to the defaults when nothing is stored', async () => {
    const { store } = await loadStore();
    const state = store.getState();
    expect([state.mode, state.scope, state.caseSensitive, state.ignoreDiacritics]).toEqual([
      DEFAULT_FIND_OPTIONS.mode,
      DEFAULT_FIND_OPTIONS.scope,
      DEFAULT_FIND_OPTIONS.caseSensitive,
      DEFAULT_FIND_OPTIONS.ignoreDiacritics,
    ]);
  });

  it('writes each option change through to storage as one record', async () => {
    const { store, map } = await loadStore();
    store.getState().setMode('regex');
    expect(persisted(map).mode).toBe('regex');
    store.getState().setScope('doc');
    store.getState().setCaseSensitive(true);
    store.getState().setIgnoreDiacritics(false);
    expect(persisted(map)).toEqual({
      mode: 'regex',
      scope: 'doc',
      caseSensitive: true,
      ignoreDiacritics: false,
    });
  });
});
