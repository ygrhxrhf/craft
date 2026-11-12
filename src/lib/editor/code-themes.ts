import type { CSSProperties } from 'react';

/**
 * The code-block theme roster (G1093). Twenty selectable themes plus `auto`, which follows the
 * app's own light/dark state — `auto` is not a theme of its own but a pointer at one of the two
 * official `craft` palettes. All twenty palettes are the collected settings (G1141); only the
 * keys a palette actually declares are present.
 */
/**
 * A code theme's container colours (G1141). Every key is optional except the four the collected
 * table has for all 20 palettes, because the official settings objects omit keys rather than
 * defaulting them: `githubdark` has no gutter, `githublight` has no caret, and `tokyonight` has no
 * font. A missing key means "inherit", which is what the official build does for those slots.
 */
export interface CodeThemeSurface {
  background: string;
  foreground: string;
  selection: string;
  selectionMatch?: string;
  lineHighlight?: string;
  gutterBackground?: string;
  gutterForeground?: string;
  gutterActiveForeground?: string;
  caret?: string;
  gutterBorder?: string;
  fontFamily?: string;
}

export const CRAFTLIGHT: CodeThemeSurface = {
  background: '#FBFBFB',
  foreground: '#3D3D3D',
  selection: '#BBDFFF',
  selectionMatch: '#BBDFFF',
  lineHighlight: 'rgba(0,0,0,0.03)',
  gutterBackground: '#FBFBFB',
  gutterForeground: 'rgba(31,34,37,0.3)',
  gutterActiveForeground: 'rgba(31,34,37,0.6)',
  fontFamily: 'Roboto Mono, monospace',
};

export const CRAFTDARK: CodeThemeSurface = {
  background: '#28292B',
  foreground: '#CECFD0',
  caret: '#fff',
  selection: '#385576',
  selectionMatch: '#385576',
  lineHighlight: 'rgba(255,255,255,0.05)',
  gutterBackground: '#28292B',
  gutterForeground: 'rgba(255,255,255,0.4)',
  gutterActiveForeground: 'rgba(255,255,255,0.7)',
  gutterBorder: '#f4f4f41f',
  fontFamily: 'Roboto Mono, monospace',
};

/**
 * The eighteen third-party palettes (G1141). Values are the collected settings table, including
 * the keys a palette omits — those stay absent rather than being filled from a neighbour. The
 * selection-match and line-highlight colours were never collected for these eighteen, so they are
 * not invented here either.
 */
const ATOMONE: CodeThemeSurface = {
  background: '#272C35',
  foreground: '#9d9b97',
  caret: '#797977',
  selection: '#ffffff30',
  gutterBackground: '#272C35',
  gutterForeground: '#465063',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const AURA: CodeThemeSurface = {
  background: '#21202e',
  foreground: '#edecee',
  caret: '#a277ff',
  selection: '#3d375e',
  gutterBackground: '#21202e',
  gutterForeground: 'rgba(237,236,238,0.4)',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const BBEDIT: CodeThemeSurface = {
  background: '#FFFFFF',
  foreground: '#000000',
  caret: '#FBAC52',
  selection: '#fffca5',
  gutterBackground: '#f5f5f5',
  gutterForeground: '#4D4D4C',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const DARCULA: CodeThemeSurface = {
  background: '#2B2B2B',
  foreground: '#f8f8f2',
  caret: '#FFFFFF',
  selection: 'rgba(255, 255, 255, 0.1)',
  gutterBackground: '#414040',
  gutterForeground: '#999',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const DRACULA: CodeThemeSurface = {
  background: '#282a36',
  foreground: '#f8f8f2',
  caret: '#f8f8f0',
  selection: 'rgba(255, 255, 255, 0.2)',
  gutterBackground: '#282a36',
  gutterForeground: '#6D8A88',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const GITHUBDARK: CodeThemeSurface = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  caret: '#c9d1d9',
  selection: '#003d73',
  gutterBorder: '#f4f4f41f',
  fontFamily: 'Roboto Mono, monospace',
};

const GITHUBLIGHT: CodeThemeSurface = {
  background: '#fff',
  foreground: '#24292e',
  selection: '#BBDFFF',
  gutterBackground: '#fff',
  gutterForeground: '#6e7781',
  fontFamily: 'Roboto Mono, monospace',
};

const GRUVBOXDARK: CodeThemeSurface = {
  background: '#282828',
  foreground: '#ebdbb2',
  caret: '#ebdbb2',
  selection: 'rgba(189,174,147,0.5)',
  gutterBackground: '#282828',
  gutterForeground: '#7c6f64',
  fontFamily: 'Roboto Mono, monospace',
};

const GRUVBOXLIGHT: CodeThemeSurface = {
  background: '#fbf1c7',
  foreground: '#3c3836',
  caret: '#af3a03',
  selection: 'rgba(235,219,178)',
  gutterBackground: '#ebdbb2',
  gutterForeground: '#665c54',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const MATERIALDARK: CodeThemeSurface = {
  background: '#2e3235',
  foreground: '#bdbdbd',
  caret: '#a0a4ae',
  selection: 'rgba(215,212,240,0.7)',
  gutterBackground: '#2e3235',
  gutterForeground: '#999',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const MATERIALLIGHT: CodeThemeSurface = {
  background: '#FAFAFA',
  foreground: '#90A4AE',
  caret: '#272727',
  selection: '#80CBC440',
  gutterBackground: '#FAFAFA',
  gutterForeground: '#90A4AE',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const NOCTISLILAC: CodeThemeSurface = {
  background: '#f2f1f8',
  foreground: '#0c006b',
  caret: '#5c49e9',
  selection: '#d5d1f2',
  gutterBackground: '#f2f1f8',
  gutterForeground: '#0c006b70',
  fontFamily: 'Roboto Mono, monospace',
};

const NORD: CodeThemeSurface = {
  background: '#2e3440',
  foreground: '#FFFFFF',
  caret: '#FFFFFF',
  selection: '#4c566a',
  gutterBackground: '#2e3440',
  gutterForeground: '#4c566a',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const SUBLIME: CodeThemeSurface = {
  background: '#303841',
  foreground: '#FFFFFF',
  caret: '#FBAC52',
  selection: '#4C5964',
  gutterBackground: '#303841',
  gutterForeground: '#FFFFFF70',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const TOKYONIGHT: CodeThemeSurface = {
  background: '#1a1b26',
  foreground: '#787c99',
  caret: '#c0caf5',
  selection: '#515c7e',
  gutterBackground: '#1a1b26',
  gutterForeground: '#787c99',
  gutterBorder: 'transparent',
};

const TOKYONIGHTDAY: CodeThemeSurface = {
  background: '#e1e2e7',
  foreground: '#3760bf',
  caret: '#3760bf',
  selection: '#99a7df',
  gutterBackground: '#e1e2e7',
  gutterForeground: '#3760bf',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

const TOKYONIGHTSTORM: CodeThemeSurface = {
  background: '#24283b',
  foreground: '#7982a9',
  caret: '#c0caf5',
  selection: '#6f7bb6',
  gutterBackground: '#24283b',
  gutterForeground: '#7982a9',
  gutterBorder: 'transparent',
};

const VSCODEDARK: CodeThemeSurface = {
  background: '#1e1e1e',
  foreground: '#9cdcfe',
  caret: '#c6c6c6',
  selection: '#6199ff2f',
  gutterBackground: '#1e1e1e',
  gutterForeground: '#838383',
  gutterBorder: 'transparent',
  fontFamily: 'Roboto Mono, monospace',
};

export interface CodeTheme {
  id: string;
  /**
   * The name the menu prints. It is *not* the id: `vscodedark` prints `VS Code`, `craftdark`
   * prints `Dark`. Only `auto` happens to print its id with a capital.
   */
  label: string;
  /**
   * Extra search terms (G1167). The official filter matches a theme when the query is a substring
   * of its label **or** an exact member of this array — so `tokyonight` is found by typing `dark`
   * even though its label never says so.
   */
  keywords: readonly string[];
  /**
   * The roster's own light/dark tag (G1139). The official build carries a *second* dark flag
   * inside each palette factory, and three of them disagree with this one (`craftdark` says
   * `light`, `materiallight` and `tokyonightday` say `dark`). Only the second flag reaches CM6;
   * locally there is no factory, so this one is the only flag — an intentional deviation from the
   * three mismatches rather than a reproduction of them (G1144).
   */
  isDark: boolean;
  /** The palette. Only `auto` has none: it points at one of the two craft palettes. */
  surface: CodeThemeSurface | null;
}

/**
 * The roster in the official display order (G1165): `auto` first, the two craft palettes next
 * (dark before light), then the rest strictly by `id` ascending — there is no runtime sort.
 * Labels, keywords and dark flags are verbatim from the collected table (G1139).
 */
export const CODE_THEMES: readonly CodeTheme[] = [
  { id: 'auto', label: 'Auto', keywords: ['system'], isDark: true, surface: null },
  { id: 'craftdark', label: 'Dark', keywords: [], isDark: true, surface: CRAFTDARK },
  { id: 'craftlight', label: 'Light', keywords: [], isDark: false, surface: CRAFTLIGHT },
  { id: 'atomone', label: 'Atom One', keywords: ['dark'], isDark: true, surface: ATOMONE },
  { id: 'aura', label: 'Aura', keywords: ['dark'], isDark: true, surface: AURA },
  { id: 'bbedit', label: 'BBEdit', keywords: ['light'], isDark: false, surface: BBEDIT },
  { id: 'darcula', label: 'Darcula', keywords: ['dark'], isDark: true, surface: DARCULA },
  { id: 'dracula', label: 'Dracula', keywords: ['dark'], isDark: true, surface: DRACULA },
  { id: 'githubdark', label: 'GitHub Dark', keywords: ['dark'], isDark: true, surface: GITHUBDARK },
  { id: 'githublight', label: 'GitHub Light', keywords: [], isDark: false, surface: GITHUBLIGHT },
  { id: 'gruvboxdark', label: 'Gruvbox Dark', keywords: ['dark'], isDark: true, surface: GRUVBOXDARK },
  { id: 'gruvboxlight', label: 'Gruvbox Light', keywords: [], isDark: false, surface: GRUVBOXLIGHT },
  { id: 'materialdark', label: 'Material Dark', keywords: [], isDark: true, surface: MATERIALDARK },
  { id: 'materiallight', label: 'Material Light', keywords: ['light'], isDark: false, surface: MATERIALLIGHT },
  { id: 'noctislilac', label: 'Noctis Lilac', keywords: ['light'], isDark: false, surface: NOCTISLILAC },
  { id: 'nord', label: 'Nord', keywords: ['dark'], isDark: true, surface: NORD },
  { id: 'sublime', label: 'Sublime', keywords: ['dark'], isDark: true, surface: SUBLIME },
  { id: 'tokyonight', label: 'Tokyo Night', keywords: ['dark'], isDark: true, surface: TOKYONIGHT },
  { id: 'tokyonightday', label: 'Tokyo Night Day', keywords: ['light'], isDark: false, surface: TOKYONIGHTDAY },
  { id: 'tokyonightstorm', label: 'Tokyo Night Storm', keywords: ['dark'], isDark: true, surface: TOKYONIGHTSTORM },
  { id: 'vscodedark', label: 'VS Code', keywords: ['dark'], isDark: true, surface: VSCODEDARK },
] as const;

export const DEFAULT_CODE_THEME = 'auto';

const BY_ID = new Map(CODE_THEMES.map((theme) => [theme.id, theme]));

/** The label a theme prints in the menu; the id is stored, the label is shown (G1139). */
export function themeLabel(theme: CodeTheme): string {
  return theme.label;
}

/**
 * The menu filter (G1167), verbatim in shape: a theme matches when the lower-cased query is a
 * substring of its label, or an exact member of its `keywords`. Not a substring of the keywords —
 * `syst` finds nothing, `system` finds `auto`.
 */
export function filterThemes(query: string): CodeTheme[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...CODE_THEMES];
  return CODE_THEMES.filter(
    (theme) =>
      theme.label.toLowerCase().includes(needle) ||
      theme.keywords.includes(needle),
  );
}

export function isCodeThemeId(value: unknown): value is string {
  return typeof value === 'string' && BY_ID.has(value);
}

/**
 * Resolve a stored id to a palette. `auto` reads the app's own light/dark state rather than
 * carrying a value of its own, and an unknown id falls back to `auto` instead of rendering
 * unstyled.
 */
export function resolveCodeTheme(id: unknown, isDark: boolean): CodeThemeSurface {
  const theme = typeof id === 'string' ? BY_ID.get(id) : undefined;
  if (!theme || theme.id === 'auto' || !theme.surface) return isDark ? CRAFTDARK : CRAFTLIGHT;
  return theme.surface;
}

/**
 * The container style for one code block. `background`/`color` paint the wrapper strip that holds
 * the gutter, but the `<pre>` inside it is painted by the stylesheet's own
 * `pre { background: var(--code-background); color: var(--code-foreground) }` rule (G1163), so a
 * palette only reaches the code area when the block re-points those two variables too — without
 * them a named theme changes the gutter strip and nothing else.
 */
export type CodeSurfaceStyle = CSSProperties & {
  '--code-background': string;
  '--code-foreground': string;
};

export function codeSurfaceStyle(surface: CodeThemeSurface): CodeSurfaceStyle {
  return {
    background: surface.background,
    color: surface.foreground,
    '--code-background': surface.background,
    '--code-foreground': surface.foreground,
  };
}
