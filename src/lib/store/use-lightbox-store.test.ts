import { beforeEach, describe, expect, it } from 'vitest';
import { useLightboxStore } from './use-lightbox-store';

const reset = () => useLightboxStore.getState().close();

describe('useLightboxStore (G347)', () => {
  beforeEach(reset);

  it('starts closed', () => {
    expect(useLightboxStore.getState().src).toBeNull();
  });

  it('opening a single image sets the field and a one-item gallery', () => {
    useLightboxStore.getState().open('a.png');
    const state = useLightboxStore.getState();
    expect(state.src).toBe('a.png');
    expect(state.gallery).toEqual(['a.png']);
    expect(state.index).toBe(0);
  });

  it('opening from a gallery lands on the clicked image', () => {
    useLightboxStore.getState().open('b.png', ['a.png', 'b.png', 'c.png']);
    const state = useLightboxStore.getState();
    expect(state.src).toBe('b.png');
    expect(state.index).toBe(1);
  });

  it('next/prev wrap around the gallery', () => {
    useLightboxStore.getState().open('a.png', ['a.png', 'b.png']);
    useLightboxStore.getState().prev();
    expect(useLightboxStore.getState().src).toBe('b.png');
    useLightboxStore.getState().next();
    expect(useLightboxStore.getState().src).toBe('a.png');
  });

  it('the loader runs once on the first open — the chunk-prefetch analogue', () => {
    let calls = 0;
    useLightboxStore.getState().open('a.png', ['a.png'], () => { calls += 1; });
    expect(calls).toBe(1);
  });

  it('closing clears every field', () => {
    useLightboxStore.getState().open('a.png', ['a.png', 'b.png']);
    useLightboxStore.getState().close();
    const state = useLightboxStore.getState();
    expect(state.src).toBeNull();
    expect(state.gallery).toEqual([]);
    expect(state.index).toBe(0);
  });
});
