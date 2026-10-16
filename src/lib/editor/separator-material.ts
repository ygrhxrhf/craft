/**
 * The separator's material axis (G1247). A divider is not only a line weight: the official write
 * side takes three flags — `--separator washi`, `--washi-pattern <name>` and `--washi-color <hex>`
 * — so the block carries a *material* on top of its weight.
 *
 * `line` is the plain rule the four weights already describe; `washi` is the tape. The pattern and
 * colour only mean anything for `washi`, and the colour is a hex literal (the official example is
 * `#3B82F6`, which is a sample rather than a named palette entry).
 */
import {
  DEFAULT_WASHI_COLOR,
  WASHI_PATTERNS,
  isWashiPattern,
  washiPattern,
} from './washi-patterns';

export const SEPARATOR_MATERIAL_IDS = ['line', 'washi'] as const;
export type SeparatorMaterial = (typeof SEPARATOR_MATERIAL_IDS)[number];

export const SEPARATOR_MATERIAL_LABELS: Record<SeparatorMaterial, string> = {
  line: '分隔线',
  washi: '和纸',
};

/** The default pattern when a washi separator is picked but no pattern was named. */
export const DEFAULT_WASHI_PATTERN = 'stripe';

/** The six patterns, in the order the official listing prints them. */
export const WASHI_PATTERN_CHOICES = WASHI_PATTERNS.map((pattern) => ({
  name: pattern.name,
  label: pattern.name,
  description: pattern.description,
}));

export interface SeparatorAttrs {
  material: SeparatorMaterial;
  pattern: string;
  color: string;
}

/** The attributes a plain rule starts with — the shape every existing divider already has. */
export const DEFAULT_SEPARATOR_ATTRS: SeparatorAttrs = {
  material: 'line',
  pattern: DEFAULT_WASHI_PATTERN,
  color: DEFAULT_WASHI_COLOR,
};

/** A value outside the vocabulary must not ride through: it lands on the default material. */
export function normalizeSeparatorMaterial(value: unknown): SeparatorMaterial {
  return value === 'washi' ? 'washi' : 'line';
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Only a six-digit hex literal is stored; anything else falls back to the official sample. */
export function normalizeWashiColor(value: unknown): string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim())
    ? value.trim().toUpperCase()
    : DEFAULT_WASHI_COLOR;
}

/** The pattern name, falling back to the default when the name is not one of the six. */
export function normalizeWashiPattern(value: unknown): string {
  return isWashiPattern(value) ? value : DEFAULT_WASHI_PATTERN;
}

/** The description the official listing prints for a pattern, or null for an unknown name. */
export function washiPatternDescription(name: unknown): string | null {
  return washiPattern(name)?.description ?? null;
}

/**
 * Whether the separator should be drawn as tape. A pattern/colour on a `line` separator is inert
 * — the material decides — which is what keeps a weight-only document rendering as a plain rule.
 */
export function isWashiSeparator(attrs: { separator?: unknown }): boolean {
  return normalizeSeparatorMaterial(attrs.separator) === 'washi';
}
