import { describe, expect, it } from 'vitest';
import { isImeComposing } from './ime-guard';

describe('isImeComposing (G490)', () => {
  it('is true while the browser reports a composition', () => {
    expect(isImeComposing({ isComposing: true, keyCode: 0, key: 'Process' })).toBe(true);
  });

  it('is true for the legacy keyCode 229 without the standard flag', () => {
    expect(isImeComposing({ keyCode: 229, key: 'Process' })).toBe(true);
  });

  it('is true for the synthetic Process key alone', () => {
    expect(isImeComposing({ key: 'Process' })).toBe(true);
  });

  it('is false for ordinary keys', () => {
    expect(isImeComposing({ key: 'Escape', keyCode: 27 })).toBe(false);
    expect(isImeComposing({ key: 'Enter', keyCode: 13 })).toBe(false);
    expect(isImeComposing({ isComposing: false, keyCode: 13, key: 'Enter' })).toBe(false);
  });
});
