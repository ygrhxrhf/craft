/**
 * G51: the official text hierarchy is semantic, not an H1–H4 ladder. The local
 * editor stores headings as levels 1–4, so the panel shows the official names
 * while the export table keeps the level mapping.
 * Labels are verbatim from `feature-catalog.md` (`style.text.*`).
 */
export const TEXT_STYLE_LABELS = {
  title: '标题',
  subtitle: '副标题',
  heading: '中标题',
  strong: '小标题',
  body: '正文',
  caption: '说明',
} as const;

export type TextStyleKey = keyof typeof TEXT_STYLE_LABELS;

/** Heading level ↔ official semantic name. */
export const HEADING_SEMANTICS: { key: Exclude<TextStyleKey, 'body' | 'caption'>; level: number }[] = [
  { key: 'title', level: 1 },
  { key: 'subtitle', level: 2 },
  { key: 'heading', level: 3 },
  { key: 'strong', level: 4 },
];

export function headingLabel(level: number): string {
  return TEXT_STYLE_LABELS[HEADING_SEMANTICS.find((item) => item.level === level)?.key ?? 'title'];
}
