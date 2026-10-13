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
  /** The palette, when it has been collected. The eighteen third-party themes have none yet. */
  surface: CodeThemeSurface | null;
}

/** The roster in the official display order (G1165): `auto` first, the two craft palettes next
 *  (dark before light), then the rest strictly by `id` ascending — there is no runtime sort. */
export const CODE_THEMES: readonly CodeTheme[] = [
  { id: 'auto', surface: null },
  { id: 'craftdark', surface: CRAFTDARK },
  { id: 'craftlight', surface: CRAFTLIGHT },
  { id: 'atomone', surface: null },
  { id: 'aura', surface: null },
  { id: 'bbedit', surface: null },
  { id: 'darcula', surface: null },
  { id: 'dracula', surface: null },
  { id: 'githubdark', surface: null },
  { id: 'githublight', surface: null },
  { id: 'gruvboxdark', surface: null },
  { id: 'gruvboxlight', surface: null },
  { id: 'materialdark', surface: null },
  { id: 'materiallight', surface: null },
  { id: 'noctislilac', surface: null },
  { id: 'nord', surface: null },
  { id: 'sublime', surface: null },
  { id: 'tokyonight', surface: null },
  { id: 'tokyonightday', surface: null },
  { id: 'tokyonightstorm', surface: null },
  { id: 'vscodedark', surface: null },
] as const;

export const DEFAULT_CODE_THEME = 'auto';

const BY_ID = new Map(CODE_THEMES.map((theme) => [theme.id, theme]));

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
