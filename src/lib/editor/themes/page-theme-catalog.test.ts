import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  colorPair,
  loadPageThemes,
  pageStylePatchForTheme,
  parseThemePresets,
  resetPageThemesCache,
} from './page-theme-catalog';

/** G682：`public/themes-presets.json` 是第 3d 批从 `res.craft.do/themes/presets.json` 抓的原文。 */
const raw = readFileSync(join(process.cwd(), 'public', 'themes-presets.json'), 'utf8');

describe('官方页面主题清单（G682）', () => {
  it('parses the captured preset file into 131 named themes', () => {
    const presets = parseThemePresets(JSON.parse(raw));
    expect(presets).toHaveLength(131);
    expect(presets[0]).toMatchObject({ themeId: 'default', title: 'Original' });
    // 节日/联名档在册。
    const ids = new Set(presets.map((preset) => preset.themeId));
    for (const id of ['fire-horse', 'soft-spring', 'golden-hour', 'old-money', 'leopard', 'paris-2024']) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('splits the light/dark colour pairs', () => {
    expect(colorPair('#1F2225 #F4F4F4')).toEqual({ light: '#1F2225', dark: '#F4F4F4' });
    expect(colorPair('#ffffff')).toEqual({ light: '#ffffff', dark: '#ffffff' });
    expect(colorPair('')).toEqual({ light: 'transparent', dark: 'transparent' });
  });

  it('maps a preset onto the page-style fields this build can render', () => {
    const presets = parseThemePresets(JSON.parse(raw));
    const original = presets.find((preset) => preset.themeId === 'default')!;
    const patch = pageStylePatchForTheme(original);
    // G708：官方 `--theme-id` 一次写五个字段，明暗对原样成串（等值的对也保留）。
    expect(patch.theme).toBe('default');
    expect(patch.themeColor).toBe('#FFFFFF');
    expect(patch.textColor).toBe('#1F2225 #F4F4F4');
    expect(patch.backgroundColor).toBe('#FFFFFF #222222');
    expect(patch.separatorStyleRaw).toBe('line');
    expect(patch.fontPack).toBe('system');
    expect(patch.backdrop).toBeUndefined();
  });

  it('keeps the official washi expression and gradient backdrop verbatim', () => {
    const presets = parseThemePresets(JSON.parse(raw));
    const washi = presets.find((preset) => preset.props['separator-style'].startsWith('washi('))!;
    const washiPatch = pageStylePatchForTheme(washi);
    expect(washiPatch.separatorStyleRaw).toBe(washi.props['separator-style']);
    const gradient = presets.find((preset) => preset.props.backdrop.startsWith('gradient('))!;
    const gradientPatch = pageStylePatchForTheme(gradient);
    expect(gradientPatch.backdrop).toBe(gradient.props.backdrop);
    const colored = presets.find(
      (preset) => /^#/.test(preset.props.backdrop) && preset.props.backdrop !== preset.props['background-color'],
    )!;
    expect(pageStylePatchForTheme(colored).backdrop).toBe(colored.props.backdrop);
  });

  it('skips malformed entries instead of failing the whole list', () => {
    const presets = parseThemePresets({
      themes: [{ themeId: 'ok', title: 'Ok', pageStyleProps: { 'background-color': '#fff' } }, { title: 'no id' }, null, 'nope'],
    });
    expect(presets.map((preset) => preset.themeId)).toEqual(['ok']);
  });

  it('loads at runtime through fetch and caches the result', async () => {
    resetPageThemesCache();
    let calls = 0;
    const fakeFetch = (async () => {
      calls += 1;
      return { ok: true, json: async () => JSON.parse(raw) } as Response;
    }) as unknown as typeof fetch;
    const first = await loadPageThemes(fakeFetch);
    const second = await loadPageThemes(fakeFetch);
    expect(first).toHaveLength(131);
    expect(second).toBe(first);
    expect(calls).toBe(1);
    resetPageThemesCache();
  });

  it('falls back to an empty list when the fetch fails', async () => {
    resetPageThemesCache();
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await loadPageThemes(failing)).toEqual([]);
    resetPageThemesCache();
  });
});