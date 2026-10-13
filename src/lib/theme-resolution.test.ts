import { describe, expect, it } from 'vitest';

import {
  readUrlOverride,
  resolveScheme,
  storeScheme,
} from './theme-resolution';

/**
 * The colour-scheme chain (G1205 / G1206): feature flag > URL override > stored value > system,
 * with "follow the system" stored as null rather than as a member of the light/dark enum.
 */
describe('the stored value', () => {
  it('stores system as null, so the enum only holds a forced choice', () => {
    expect(storeScheme('system')).toBeNull();
    expect(storeScheme('dark')).toBe('dark');
    expect(storeScheme('light')).toBe('light');
  });
});

describe('the URL override', () => {
  it('reads the three switches', () => {
    expect(readUrlOverride('?dark')).toBe('dark');
    expect(readUrlOverride('?light')).toBe('light');
    expect(readUrlOverride('?system')).toBe('system');
  });

  it('reads nothing from a URL without a switch', () => {
    expect(readUrlOverride('')).toBeNull();
    expect(readUrlOverride('?q=1')).toBeNull();
  });

  it('prefers dark over light when both are present, as the official reader does', () => {
    expect(readUrlOverride('?light&dark')).toBe('dark');
  });
});

describe('the resolution order', () => {
  it('lets the feature flag win over everything', () => {
    expect(
      resolveScheme({ forced: 'dark', url: 'light', stored: 'light', system: 'light' }),
    ).toBe('dark');
  });

  it('lets the URL override win over the stored value', () => {
    expect(resolveScheme({ url: 'light', stored: 'dark', system: 'dark' })).toBe('light');
  });

  it('falls to the stored value when the URL says nothing', () => {
    expect(resolveScheme({ stored: 'dark', system: 'light' })).toBe('dark');
  });

  it('falls to the system when nothing is stored', () => {
    expect(resolveScheme({ stored: null, system: 'dark' })).toBe('dark');
  });

  it('treats ?system as "no override", so the stored value still decides', () => {
    expect(resolveScheme({ url: 'system', stored: 'light', system: 'dark' })).toBe('light');
  });
});
