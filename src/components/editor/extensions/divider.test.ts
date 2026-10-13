import { describe, expect, it } from 'vitest';
import { DIVIDER_PATTERN, DIVIDER_SIGILS } from './divider';

function styleFor(typed: string): string | undefined {
  const match = DIVIDER_PATTERN.exec(typed);
  return match ? DIVIDER_SIGILS[match[1]] : undefined;
}

describe('divider sigils', () => {
  it('maps each typed weight onto the official table', () => {
    expect(styleFor('..-')).toBe('extraLight');
    expect(styleFor('.--')).toBe('light');
    expect(styleFor('---')).toBe('regular');
    expect(styleFor('=--')).toBe('strong');
    expect(styleFor('===')).toBe('pageSeparator');
  });

  it('accepts the en/em dash forms typography leaves behind', () => {
    expect(styleFor('–-')).toBe('regular');
    expect(styleFor('—-')).toBe('regular');
  });

  it('does not let one sigil swallow another', () => {
    expect(styleFor('--')).toBeUndefined();
    expect(styleFor('.-')).toBeUndefined();
    expect(styleFor('....-')).toBeUndefined();
    expect(styleFor('a.-')).toBeUndefined();
    expect(styleFor('==')).toBeUndefined();
    expect(styleFor('--- ')).toBeUndefined();
  });
});
