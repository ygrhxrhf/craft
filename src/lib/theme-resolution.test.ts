import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  it('treats ?system as an override that follows the OS, ignoring the stored value', () => {
    // 官方 `Ik` 逐字 `o==="system"?e:o` ⇒ `?system` 不是"没有覆写"，而是"忽略存储值、跟系统"。
    expect(resolveScheme({ url: 'system', stored: 'light', system: 'dark' })).toBe('dark');
    expect(resolveScheme({ url: 'system', stored: 'dark', system: 'light' })).toBe('light');
  });
});

/**
 * G1206：这条链此前是"纯逻辑写好了、没人调用"——`readUrlOverride`/`resolveScheme` 全仓零消费者，
 * `ThemeProvider` 直接交给 next-themes。钉住接线，别让 URL 开关再悄悄失效。
 */
describe('the URL override is actually wired into the provider', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/theme/ThemeProvider.tsx'),
    'utf8',
  );

  it('reads the override and hands it to next-themes as forcedTheme', () => {
    expect(source).toContain('readUrlOverride');
    expect(source).toContain('resolveScheme');
    expect(source).toContain('forcedTheme');
  });

  it('keeps ?system live by watching the media query', () => {
    expect(source).toContain("addEventListener('change'");
  });
});
