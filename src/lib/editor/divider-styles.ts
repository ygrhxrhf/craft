/**
 * The `line` block family (`gap.md` G1229, G1405, G1411). One table serves the markdown
 * importer, the editor's typing input rule and the exporter, because the official law keys all
 * three on the same markup string.
 */
export const OFFICIAL_DIVIDER_STYLES = [
  'extraLight',
  'light',
  'regular',
  'strong',
  'pageSeparator',
] as const;

/** Names local documents stored before the official table was measured. Read-only. */
export const LEGACY_DIVIDER_STYLES = ['thin', 'medium', 'thick', 'dashed'] as const;

export type DividerStyle =
  | (typeof OFFICIAL_DIVIDER_STYLES)[number]
  | (typeof LEGACY_DIVIDER_STYLES)[number];

export const DEFAULT_DIVIDER_STYLE: DividerStyle = 'regular';

/** The four weights the style menu offers, with the collected labels. */
export const DIVIDER_STYLE_CHOICES: readonly { style: DividerStyle; label: string }[] = [
  { style: 'extraLight', label: '分隔线 - 极细' },
  { style: 'light', label: '分隔线 - 细' },
  { style: 'regular', label: '分隔线 - 常规' },
  { style: 'strong', label: '分隔线 - 粗' },
];

const KNOWN_STYLES = new Set<string>([...OFFICIAL_DIVIDER_STYLES, ...LEGACY_DIVIDER_STYLES]);

const STYLE_BY_MARKUP: Record<string, DividerStyle> = {
  // G1229, verbatim: `---` is the default style, not the heaviest one.
  '..-': 'extraLight',
  '.--': 'light',
  '---': 'regular',
  '=--': 'strong',
  '===': 'pageSeparator',
  // G1405: a line block's own markdown carries its style as an asterisk count, `3 + 档序`.
  '***': 'extraLight',
  '****': 'light',
  '*****': 'regular',
  '******': 'strong',
  // Smart typography folds a typed `--` into one dash before an input rule sees the line.
  '–-': 'regular',
  '—-': 'regular',
  '=–': 'strong',
  '=—': 'strong',
  // Local-only: the shape `dashed` had before the official table was measured.
  '=-': 'dashed',
};

/**
 * The forms the editor answers to while typing — the four the official docs spell out
 * (`longtail.md`: "Type `=--` to insert strong rule") plus `===`, which only markdown can
 * reach, and the typography rewrites. `=-` is left out on purpose: an input rule fires the
 * moment the line matches, so the two-character form would swallow `=--` one keystroke early.
 */
const TYPED_SIGILS = ['..-', '.--', '---', '=--', '===', '–-', '—-', '=–', '=—'];

export const DIVIDER_SIGILS: Record<string, DividerStyle> = Object.fromEntries(
  TYPED_SIGILS.map((sigil) => [sigil, STYLE_BY_MARKUP[sigil]]),
);

// Whole-line alternatives over `.`, `-`, `=` and the two dash forms, so no other
// metacharacter has to survive escaping; each entry is exercised by name in `divider.test.ts`.
export const DIVIDER_PATTERN = /^(\.\.-|\.--|---|=--|===|–-|—-|=–|=—)$/;

/**
 * The line shapes a markdown importer turns into a divider block: the typed sigils plus any
 * thematic-break run of dashes, asterisks or underscores. The codec's exporter checks against
 * this same set so it never writes markup that would read back as plain text.
 */
export const DIVIDER_MARKUP_PATTERN = /^(\.\.-|\.--|---|=--|===|–-|—-|=–|=—|-{3,}|\*{3,}|_{3,})$/;

/** Whole-line rule markup → style, with the official fallback for a run the table does not name. */
export function dividerStyleFromMarkup(markup: string): DividerStyle | undefined {
  if (markup in STYLE_BY_MARKUP) return STYLE_BY_MARKUP[markup];
  // G1229 `?? "regular"`: a thematic break the table has no entry for is still a default rule.
  return /^(-{3,}|\*{3,}|_{3,})$/.test(markup) ? DEFAULT_DIVIDER_STYLE : undefined;
}

const MARKUP_BY_STYLE: Record<DividerStyle, string> = {
  extraLight: '***',
  light: '****',
  regular: '*****',
  strong: '******',
  // The bridge rejects `pageSeparator` (G1411) so its asterisk form was never measured; `===`
  // is the markup the official importer does name for it.
  pageSeparator: '===',
  // Each legacy name writes the markup of the official style it was read as, so an export of
  // old data comes back at the same weight.
  thin: '***',
  medium: '****',
  thick: '*****',
  dashed: '=-',
};

export function dividerMarkupFromStyle(style: unknown): string {
  return MARKUP_BY_STYLE[normalizeDividerStyle(style)];
}

/**
 * G1411: a value outside the vocabulary must not ride through silently. Unknown reads land on
 * the default style, which is also what the official importer does with an unmatched markup.
 */
export function normalizeDividerStyle(value: unknown): DividerStyle {
  return typeof value === 'string' && KNOWN_STYLES.has(value)
    ? (value as DividerStyle)
    : DEFAULT_DIVIDER_STYLE;
}
