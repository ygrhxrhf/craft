import { describe, expect, it } from 'vitest';

import {
  CODE_THEMES,
  CRAFTDARK,
  CRAFTLIGHT,
  DEFAULT_CODE_THEME,
  isCodeThemeId,
  resolveCodeTheme,
} from './code-themes';

/**
 * The code-theme roster (G1093). Twenty selectable themes plus `auto`, which follows the app's
 * light/dark state. Only the two official `craft` palettes have collected values; the rest keep
 * a `null` surface rather than an invented one.
 */
describe('the theme roster', () => {
  it('has 21 keys with auto first and the two craft palettes behind it', () => {
    expect(CODE_THEMES).toHaveLength(21);
    expect(CODE_THEMES.map((t) => t.id)).toEqual([
      'auto',
      'craftdark',
      'craftlight',
      'atomone',
      'aura',
      'bbedit',
      'darcula',
      'dracula',
      'githubdark',
      'githublight',
      'gruvboxdark',
      'gruvboxlight',
      'materialdark',
      'materiallight',
      'noctislilac',
      'nord',
      'sublime',
      'tokyonightday',
      'tokyonightstorm',
      'tokyonight',
      'vscodedark',
    ]);
  });

  it('defaults to auto', () => {
    expect(DEFAULT_CODE_THEME).toBe('auto');
  });

  it('guards unknown ids', () => {
    expect(isCodeThemeId('nord')).toBe(true);
    expect(isCodeThemeId('solarized')).toBe(false);
  });
});

describe('the two collected craft palettes', () => {
  it('matches craftlight verbatim, including the missing caret', () => {
    expect(CRAFTLIGHT.background).toBe('#FBFBFB');
    expect(CRAFTLIGHT.foreground).toBe('#3D3D3D');
    expect(CRAFTLIGHT.selection).toBe('#BBDFFF');
    expect(CRAFTLIGHT.lineHighlight).toBe('rgba(0,0,0,0.03)');
    expect(CRAFTLIGHT.gutterForeground).toBe('rgba(31,34,37,0.3)');
    expect(CRAFTLIGHT.fontFamily).toBe('Roboto Mono, monospace');
    expect(CRAFTLIGHT.caret).toBeUndefined();
  });

  it('matches craftdark verbatim, including the caret and gutter border', () => {
    expect(CRAFTDARK.background).toBe('#28292B');
    expect(CRAFTDARK.foreground).toBe('#CECFD0');
    expect(CRAFTDARK.caret).toBe('#fff');
    expect(CRAFTDARK.selection).toBe('#385576');
    expect(CRAFTDARK.lineHighlight).toBe('rgba(255,255,255,0.05)');
    expect(CRAFTDARK.gutterBorder).toBe('#f4f4f41f');
  });
});

describe('resolving a stored id', () => {
  it('reads auto as the app light/dark state', () => {
    expect(resolveCodeTheme('auto', false)).toBe(CRAFTLIGHT);
    expect(resolveCodeTheme('auto', true)).toBe(CRAFTDARK);
  });

  it('returns the named craft palette regardless of the app state', () => {
    expect(resolveCodeTheme('craftlight', true)).toBe(CRAFTLIGHT);
    expect(resolveCodeTheme('craftdark', false)).toBe(CRAFTDARK);
  });

  it('falls back to auto rather than rendering unstyled for an unknown id', () => {
    expect(resolveCodeTheme('nonsense', false)).toBe(CRAFTLIGHT);
    expect(resolveCodeTheme(null, true)).toBe(CRAFTDARK);
  });
});
