/**
 * G51: the official text hierarchy is semantic, not an H1–H4 ladder. Six names are shown in the
 * panel (`api-contract.md` §一): title / subtitle / heading / strong / page / body.
 *
 * The local editor stores headings as levels 1–4 and has no page block of its own, so the panel
 * shows the official names while the export table keeps the level mapping. `page` is a named
 * entry here because the panel lists it; it maps onto no heading level.
 */
export const TEXT_STYLE_LABELS = {
  title: '标题',
  subtitle: '副标题',
  heading: '中标题',
  strong: '小标题',
  page: '页面',
  body: '正文',
  caption: '说明',
} as const;

export type TextStyleKey = keyof typeof TEXT_STYLE_LABELS;

/** Heading level ↔ official semantic name. */
export const HEADING_SEMANTICS: { key: Exclude<TextStyleKey, 'body' | 'caption' | 'page'>; level: number }[] = [
  { key: 'title', level: 1 },
  { key: 'subtitle', level: 2 },
  { key: 'heading', level: 3 },
  { key: 'strong', level: 4 },
];

/** The six names the panel shows, in the official order. */
export const PANEL_TEXT_STYLES: TextStyleKey[] = [
  'title',
  'subtitle',
  'heading',
  'strong',
  'page',
  'body',
];

export function headingLabel(level: number): string {
  return TEXT_STYLE_LABELS[HEADING_SEMANTICS.find((item) => item.level === level)?.key ?? 'title'];
}
