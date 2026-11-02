import { describe, expect, it } from 'vitest';

import { parseWireFlag, serializeWireFlag } from './wire-flag';

// G501: three wire encodings, all tri-state; absent stays null.
describe('tri-state wire flags (G501)', () => {
  it('accepts both string encodings and numbers', () => {
    expect(parseWireFlag('1')).toBe(true);
    expect(parseWireFlag('true')).toBe(true);
    expect(parseWireFlag(1)).toBe(true);
    expect(parseWireFlag('0')).toBe(false);
    expect(parseWireFlag('false')).toBe(false);
    expect(parseWireFlag(0)).toBe(false);
  });

  it('keeps "never set" distinct from false', () => {
    expect(parseWireFlag(null)).toBeNull();
    expect(parseWireFlag(undefined)).toBeNull();
    expect(parseWireFlag('')).toBeNull();
    expect(parseWireFlag('yes')).toBeNull();
  });

  it('writes the requested encoding and omits null', () => {
    expect(serializeWireFlag(true, 'numeric')).toBe('1');
    expect(serializeWireFlag(false, 'numeric')).toBe('0');
    expect(serializeWireFlag(true, 'todo')).toBe('1');
    expect(serializeWireFlag(true)).toBe('true');
    expect(serializeWireFlag(false)).toBe('false');
    expect(serializeWireFlag(null)).toBeUndefined();
  });
});
