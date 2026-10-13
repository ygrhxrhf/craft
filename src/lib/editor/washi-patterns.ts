/**
 * The washi (和纸胶带) divider patterns (G1247). Six built-in patterns, each with the description
 * the official CLI prints. All six are `built-in` — no second type has ever been observed, so a
 * "user-defined pattern" path is not something to invent here.
 *
 * The write side is three flags, verbatim: `--separator washi`, `--washi-pattern <name>` and
 * `--washi-color <hex>`. The default colour is the one the official usage line shows.
 */

export interface WashiPattern {
  /** The value `--washi-pattern` takes. */
  name: string;
  /** The official description line, verbatim. */
  description: string;
  /** Every collected pattern is built in. */
  type: 'built-in';
}

export const WASHI_PATTERNS: readonly WashiPattern[] = [
  { name: 'hex', description: 'Hexagon geometric pattern', type: 'built-in' },
  { name: 'dot', description: 'Dot pattern', type: 'built-in' },
  { name: 'stripe', description: 'Horizontal stripe pattern', type: 'built-in' },
  { name: 'diagonal', description: 'Diagonal stripe pattern', type: 'built-in' },
  { name: 'grid', description: 'Grid pattern', type: 'built-in' },
  { name: 'wave', description: 'Wave pattern', type: 'built-in' },
] as const;

/** The separator value that selects a washi tape rather than a plain rule. */
export const WASHI_SEPARATOR = 'washi';

/** The colour the official usage line shows. */
export const DEFAULT_WASHI_COLOR = '#3B82F6';

const BY_NAME = new Map(WASHI_PATTERNS.map((pattern) => [pattern.name, pattern]));

export function isWashiPattern(name: unknown): name is string {
  return typeof name === 'string' && BY_NAME.has(name);
}

/** The pattern a name selects, or null for a name that is not one of the six. */
export function washiPattern(name: unknown): WashiPattern | null {
  return typeof name === 'string' ? BY_NAME.get(name) ?? null : null;
}
