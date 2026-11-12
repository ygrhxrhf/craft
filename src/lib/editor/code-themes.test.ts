import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODE_THEMES,
  CRAFTDARK,
  CRAFTLIGHT,
  DEFAULT_CODE_THEME,
  codeSurfaceStyle,
  filterThemes,
  isCodeThemeId,
  resolveCodeTheme,
  type CodeThemeSurface,
} from './code-themes';

/**
 * The code-theme roster (G1093). Twenty selectable themes plus `auto`, which follows the app's
 * light/dark state. All twenty palettes are the collected settings (G1141).
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
      'tokyonight',
      'tokyonightday',
      'tokyonightstorm',
      'vscodedark',
    ]);
  });

  it('keeps the tail in strict id order, with no runtime sort (G1165)', () => {
    const tail = CODE_THEMES.slice(3).map((t) => t.id);
    expect(tail).toEqual([...tail].sort());
  });

  it('defaults to auto', () => {
    expect(DEFAULT_CODE_THEME).toBe('auto');
  });

  it('guards unknown ids', () => {
    expect(isCodeThemeId('nord')).toBe(true);
    expect(isCodeThemeId('solarized')).toBe(false);
  });
});

describe('the labels are not the ids (G1139 / G1474)', () => {
  it('prints the collected display name for each row', () => {
    expect(CODE_THEMES.map((t) => t.label)).toEqual([
      'Auto',
      'Dark',
      'Light',
      'Atom One',
      'Aura',
      'BBEdit',
      'Darcula',
      'Dracula',
      'GitHub Dark',
      'GitHub Light',
      'Gruvbox Dark',
      'Gruvbox Light',
      'Material Dark',
      'Material Light',
      'Noctis Lilac',
      'Nord',
      'Sublime',
      'Tokyo Night',
      'Tokyo Night Day',
      'Tokyo Night Storm',
      'VS Code',
    ]);
  });

  it('keeps the id/label split on the two rows where it is widest', () => {
    // `vscodedark` prints without the word "dark"; the craft pair prints as bare 暗/亮.
    expect(CODE_THEMES.find((t) => t.id === 'vscodedark')?.label).toBe('VS Code');
    expect(CODE_THEMES.find((t) => t.id === 'craftdark')?.label).toBe('Dark');
    expect(CODE_THEMES.find((t) => t.id === 'craftlight')?.label).toBe('Light');
  });
});

describe('the dark flags are the roster table verbatim (G1139)', () => {
  it('carries the collected sequence', () => {
    expect(CODE_THEMES.map((t) => (t.isDark ? 'D' : 'L')).join('')).toBe('DDLDDLDDDLDLDLLDDDLDD');
  });

  it('does not reproduce the three factory-side mismatches (G1144, intentional deviation)', () => {
    // The official build tags `craftdark` light and `materiallight`/`tokyonightday` dark inside
    // its palette factories, and only that flag reaches CM6. Locally there is one flag, and it
    // follows the roster table, which is the correct classification.
    expect(CODE_THEMES.find((t) => t.id === 'craftdark')?.isDark).toBe(true);
    expect(CODE_THEMES.find((t) => t.id === 'materiallight')?.isDark).toBe(false);
    expect(CODE_THEMES.find((t) => t.id === 'tokyonightday')?.isDark).toBe(false);
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

/**
 * The eighteen third-party palettes against the collected settings table (G1141). The table is the
 * source: a cell of `-` means the key is absent, and a cell of `?` was never collected, so neither
 * is asserted as a colour. Only the keys the table actually holds are compared.
 */
const longtail = readFileSync(
  join(process.cwd(), 'docs/craft-ref/features/longtail.md'),
  'utf8',
);

const COLUMNS: { index: number; key: keyof CodeThemeSurface }[] = [
  { index: 14, key: 'background' },
  { index: 15, key: 'foreground' },
  { index: 16, key: 'caret' },
  { index: 17, key: 'selection' },
  { index: 18, key: 'gutterBackground' },
  { index: 19, key: 'gutterForeground' },
  { index: 20, key: 'gutterBorder' },
  { index: 21, key: 'fontFamily' },
];

describe('the eighteen third-party palettes match the collected table', () => {
  const rows = longtail
    .split('\n')
    .filter((line) => /^\| \d+ \| [a-z]+ \|/.test(line))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    // `auto` has no palette of its own, so the table marks every colour cell `?`.
    .filter((row) => row[2] !== 'auto');

  it('reads all twenty palettes out of the ledger', () => {
    expect(rows).toHaveLength(20);
  });

  it.each(rows.map((row) => [row[2], row]))('%s matches its row', (_id, row) => {
    const theme = CODE_THEMES.find((candidate) => candidate.id === row[2]);
    expect(theme?.surface).toBeTruthy();
    const surface = theme?.surface as CodeThemeSurface;
    for (const { index, key } of COLUMNS) {
      const cell = row[index];
      if (cell === '-' || cell === '?') {
        expect(surface[key]).toBeUndefined();
      } else {
        expect(surface[key]).toBe(cell);
      }
    }
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

/**
 * The block surface (G1163 / batch 530). The wrapper paints the gutter strip, but the `<pre>`
 * inside it is painted by the stylesheet's `pre { background: var(--code-background); color:
 * var(--code-foreground) }`, so the palette only reaches the code area when the block also
 * re-points those two variables — otherwise a named theme changes the gutter strip alone.
 */
describe('the block surface re-points the variables the pre reads', () => {
  it.each(CODE_THEMES.filter((theme) => theme.surface))('$id carries the palette vars', (theme) => {
    const style = codeSurfaceStyle(theme.surface as CodeThemeSurface);
    expect(style.background).toBe((theme.surface as CodeThemeSurface).background);
    expect(style.color).toBe((theme.surface as CodeThemeSurface).foreground);
    expect(style['--code-background']).toBe((theme.surface as CodeThemeSurface).background);
    expect(style['--code-foreground']).toBe((theme.surface as CodeThemeSurface).foreground);
  });

  it('does not stay on the document palette for a named theme', () => {
    const dracula = resolveCodeTheme('dracula', false);
    expect(codeSurfaceStyle(dracula)['--code-background']).toBe(dracula.background);
    expect(dracula.background).not.toBe(CRAFTLIGHT.background);
    expect(dracula.background).not.toBe(CRAFTDARK.background);
  });

  it('keeps auto on the app light/dark palette', () => {
    expect(codeSurfaceStyle(resolveCodeTheme('auto', false))['--code-background']).toBe(
      CRAFTLIGHT.background,
    );
    expect(codeSurfaceStyle(resolveCodeTheme('auto', true))['--code-background']).toBe(
      CRAFTDARK.background,
    );
  });
});

describe('the menu filter (G1167)', () => {
  it('matches a label substring', () => {
    const dark = filterThemes('dark');
    expect(dark.length).toBeGreaterThanOrEqual(5);
    for (const theme of dark) {
      const matchedByLabel = theme.label.toLowerCase().includes('dark');
      const matchedByKeyword = theme.keywords.includes('dark');
      expect(matchedByLabel || matchedByKeyword).toBe(true);
    }
  });

  it('finds a theme by a keyword its label never says', () => {
    // `nord`'s label says nothing about light or dark; only its `dark` keyword reaches it, so a
    // search for `dark` returns it alongside the rows whose labels do carry the word.
    const ids = filterThemes('dark').map((t) => t.id);
    expect(ids).toContain('nord');
    expect(ids).not.toContain('githublight');
  });

  it('does not match a keyword by substring, only by exact member', () => {
    // `syst` is a prefix of the `system` keyword but not the whole member, so it finds nothing —
    // the keyword half of the predicate is an exact membership test.
    expect(filterThemes('syst')).toEqual([]);
  });

  it('finds auto by its keyword, which is not part of its label', () => {
    expect(filterThemes('system').map((t) => t.id)).toEqual(['auto']);
  });

  it('returns the whole roster for an empty query', () => {
    expect(filterThemes('')).toHaveLength(CODE_THEMES.length);
  });
});
