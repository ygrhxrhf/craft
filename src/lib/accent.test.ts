import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { ACCENTS, applyAccent, isAccent, pickAccent, readAccent } from './accent';

/**
 * The accent switch (`accent.ts`, G1090 / G1110). Picking a colour points the document at a
 * channel rather than writing a colour: `data-accent` re-aims the 18 aliases, and the two local
 * vars read those aliases. The wiring must therefore only ever set `data-accent` plus the two
 * indirections — a literal here would be the two-hop structure collapsing into one.
 */
function fakeRoot() {
  const props = new Map<string, string>();
  const root = {
    dataset: {} as Record<string, string>,
    style: { setProperty: (name: string, value: string) => props.set(name, value) },
  };
  vi.stubGlobal('document', { documentElement: root });
  return { root, props };
}

function fakeStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the accent channel', () => {
  it('offers exactly the six official themes', () => {
    expect([...ACCENTS]).toEqual(['blue', 'pink', 'green', 'purple', 'yellow', 'gray']);
  });

  it('recognises only those six', () => {
    expect(isAccent('pink')).toBe(true);
    expect(isAccent('orange')).toBe(false);
    expect(isAccent(null)).toBe(false);
    expect(isAccent(7)).toBe(false);
  });

  it('re-aims the channel through data-accent, not through a literal', () => {
    const { root, props } = fakeRoot();
    applyAccent('purple');
    expect(root.dataset.accent).toBe('purple');
    // Both local vars read channel steps, which is the second hop.
    expect(props.get('--craft-accent')).toBe('var(--accent-500)');
    expect(props.get('--craft-accent-hover')).toBe('var(--accent-600)');
  });

  it('reads the stored channel back', () => {
    const store = fakeStorage();
    store.set('craft.accent', 'green');
    expect(readAccent()).toBe('green');
  });

  it('ignores a stored value that is not a theme', () => {
    const store = fakeStorage();
    store.set('craft.accent', 'chartreuse');
    expect(readAccent()).toBeNull();
  });

  it('remembers the pick', () => {
    fakeRoot();
    const store = fakeStorage();
    pickAccent('yellow');
    expect(store.get('craft.accent')).toBe('yellow');
  });
});
