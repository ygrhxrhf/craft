import { describe, expect, it } from 'vitest';

import {
  ALT_COLOR_IDS,
  ALT_OFF,
  DEFAULT_ALT_COLOR_ID,
  altColorValue,
  isAltColorId,
  nextAltColorId,
  readAlternating,
} from './table-alternating';

/**
 * G510: 隔行颜色存的是主题色 id，不是布尔，也不是十六进制。
 */
describe('the stored value', () => {
  it('lists the solid page themes and defaults to the first of them', () => {
    expect(ALT_COLOR_IDS.length).toBeGreaterThan(1);
    expect(ALT_COLOR_IDS.every(isAltColorId)).toBe(true);
    expect(ALT_COLOR_IDS).not.toContain('default');
    expect(ALT_COLOR_IDS).toContain(DEFAULT_ALT_COLOR_ID);
  });

  it('reads the legacy "true" as the default colour and anything else illegal as off', () => {
    expect(readAlternating(null)).toBe(ALT_OFF);
    expect(readAlternating('')).toBe(ALT_OFF);
    expect(readAlternating('false')).toBe(ALT_OFF);
    expect(readAlternating('banana')).toBe(ALT_OFF);
    expect(readAlternating('true')).toBe(DEFAULT_ALT_COLOR_ID);
    expect(readAlternating(ALT_COLOR_IDS[1])).toBe(ALT_COLOR_IDS[1]);
  });

  it('cycles within the palette and resolves an id to a colour', () => {
    const second = nextAltColorId(DEFAULT_ALT_COLOR_ID);
    expect(second).not.toBe(DEFAULT_ALT_COLOR_ID);
    expect(nextAltColorId(null)).toBe(DEFAULT_ALT_COLOR_ID);
    expect(nextAltColorId(ALT_COLOR_IDS[ALT_COLOR_IDS.length - 1])).toBe(DEFAULT_ALT_COLOR_ID);
    expect(altColorValue(second)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(altColorValue(ALT_OFF)).toBeNull();
  });
});
