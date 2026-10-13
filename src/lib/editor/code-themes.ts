/**
 * The code-block theme roster (G1093). Twenty selectable themes plus `auto`, which follows the
 * app's own light/dark state — `auto` is not a theme of its own but a pointer at one of the two
 * official `craft` palettes. Only those two have collected values; the other eighteen are
 * third-party themes whose names are known but whose palettes are not, so their `surface` stays
 * `null` rather than being invented.
 */
export interface CodeThemeSurface {
  background: string;
  foreground: string;
  selection: string;
  selectionMatch: string;
  lineHighlight: string;
  gutterBackground: string;
  gutterForeground: string;
  gutterActiveForeground: string;
  /** Only the dark palette declares these two. */
  caret?: string;
  gutterBorder?: string;
  fontFamily: string;
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
  /** The palette, when it has been collected. The eighteen third-party themes have none yet. */
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
  { id: 'atomone', label: 'Atom One', keywords: ['dark'], isDark: true, surface: null },
  { id: 'aura', label: 'Aura', keywords: ['dark'], isDark: true, surface: null },
  { id: 'bbedit', label: 'BBEdit', keywords: ['light'], isDark: false, surface: null },
  { id: 'darcula', label: 'Darcula', keywords: ['dark'], isDark: true, surface: null },
  { id: 'dracula', label: 'Dracula', keywords: ['dark'], isDark: true, surface: null },
  { id: 'githubdark', label: 'GitHub Dark', keywords: ['dark'], isDark: true, surface: null },
  { id: 'githublight', label: 'GitHub Light', keywords: [], isDark: false, surface: null },
  { id: 'gruvboxdark', label: 'Gruvbox Dark', keywords: ['dark'], isDark: true, surface: null },
  { id: 'gruvboxlight', label: 'Gruvbox Light', keywords: [], isDark: false, surface: null },
  { id: 'materialdark', label: 'Material Dark', keywords: [], isDark: true, surface: null },
  { id: 'materiallight', label: 'Material Light', keywords: ['light'], isDark: false, surface: null },
  { id: 'noctislilac', label: 'Noctis Lilac', keywords: ['light'], isDark: false, surface: null },
  { id: 'nord', label: 'Nord', keywords: ['dark'], isDark: true, surface: null },
  { id: 'sublime', label: 'Sublime', keywords: ['dark'], isDark: true, surface: null },
  { id: 'tokyonight', label: 'Tokyo Night', keywords: ['dark'], isDark: true, surface: null },
  { id: 'tokyonightday', label: 'Tokyo Night Day', keywords: ['light'], isDark: false, surface: null },
  { id: 'tokyonightstorm', label: 'Tokyo Night Storm', keywords: ['dark'], isDark: true, surface: null },
  { id: 'vscodedark', label: 'VS Code', keywords: ['dark'], isDark: true, surface: null },
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
  if (!theme || theme.id === 'auto') return isDark ? CRAFTDARK : CRAFTLIGHT;
  return theme.surface ?? (isDark ? CRAFTDARK : CRAFTLIGHT);
}
