/**
 * G274/G275/G276: the official `textStyle` vocabulary and the two rules that read it.
 *
 * `textStyle` has nine values. The hierarchy ordinal comes from the official `eY()`:
 * Title 1 / Subtitle 2 / Heading 3 / Strong 4 / Body 5 / Caption 6, and the three page-ish
 * values (`PageRegular`, `PageCard`, `Note`) fall through to 5. `Note` is an internal leftover —
 * it exists in the enum but appears in neither the UI nor the outward string table, so it is
 * accepted on read and never offered.
 *
 * Block kind (G276) is decided by a precedence chain in which `listStyle` beats `textStyle`:
 * a block that is both a bullet and a Heading classifies as a list item, not a heading.
 */

export const TEXT_STYLE_VALUES = [
  'Title',
  'Subtitle',
  'Heading',
  'Strong',
  'Body',
  'Caption',
  'PageRegular',
  'PageCard',
  'Note',
] as const;

export type TextStyleValue = (typeof TEXT_STYLE_VALUES)[number];

const ORDINALS: Record<TextStyleValue, number> = {
  Title: 1,
  Subtitle: 2,
  Heading: 3,
  Strong: 4,
  Body: 5,
  Caption: 6,
  // The page-ish values share Body's ordinal; they are not a deeper level.
  PageRegular: 5,
  PageCard: 5,
  Note: 5,
};

const KNOWN = new Set<string>(TEXT_STYLE_VALUES);

/** `Note` is internal-only: readable, never offered. */
export const UI_TEXT_STYLES = TEXT_STYLE_VALUES.filter((value) => value !== 'Note');

export function isTextStyleValue(value: unknown): value is TextStyleValue {
  return typeof value === 'string' && KNOWN.has(value);
}

/** The hierarchy ordinal for a value, with unknown input reading as Body (the official default). */
export function textStyleOrdinal(value: unknown): number {
  return isTextStyleValue(value) ? ORDINALS[value] : ORDINALS.Body;
}

/** The local heading level a value maps onto, or `null` for a non-heading style. */
export function headingLevelFor(value: unknown): number | null {
  const ordinal = textStyleOrdinal(value);
  return isTextStyleValue(value) && ordinal <= 4 ? ordinal : null;
}

/** The style a local heading level corresponds to. */
export function textStyleForHeadingLevel(level: number): TextStyleValue {
  if (level <= 1) return 'Title';
  if (level === 2) return 'Subtitle';
  if (level === 3) return 'Heading';
  if (level === 4) return 'Strong';
  return 'Body';
}

/**
 * G275: the export tag per style, verbatim from the official table. `toggle→h4` and the
 * collapse-to-paragraph / collapse-to-div entries are the lossy ones — they are recorded as the
 * official behaviour, and the local exporters keep their own richer shapes where they differ.
 */
export const EXPORT_TAG_BY_STYLE: Record<TextStyleValue, string> = {
  Title: 'h1',
  Subtitle: 'h2',
  Heading: 'h3',
  Strong: 'h4',
  Body: 'p',
  Caption: 'p',
  PageRegular: 'p',
  PageCard: 'p',
  Note: 'p',
};

/** Non-text-style block shapes the export table names. */
export const EXPORT_TAG_BY_BLOCK: Record<string, string> = {
  toggle: 'h4',
  focus: 'blockquote',
  PageSeparator: 'hr',
  Video: 'p',
  File: 'p',
  Drawing: 'div',
  Whiteboard: 'div',
};

export type BlockKind = 'listItem' | 'taskItem' | 'heading' | 'textStyle' | 'paragraph';

/**
 * G276: kind precedence — list style first, then an explicit text style, then a plain paragraph.
 * A bulleted Heading is a `listItem`, which is what the official classification returns.
 */
export function classifyBlockKind(node: {
  type?: string;
  attrs?: { textStyle?: unknown; listStyle?: unknown; checked?: unknown } | null;
}): BlockKind {
  const type = node.type ?? 'paragraph';
  const attrs = node.attrs ?? {};

  if (type === 'taskItem' || type === 'taskList' || attrs.checked !== undefined) return 'taskItem';
  if (type === 'listItem' || type === 'bulletList' || type === 'orderedList') return 'listItem';
  // A list style on a paragraph-shaped node outranks its text style.
  if (typeof attrs.listStyle === 'string' && attrs.listStyle) return 'listItem';

  const style = attrs.textStyle;
  if (isTextStyleValue(style)) {
    return headingLevelFor(style) === null ? 'textStyle' : 'heading';
  }
  if (type === 'heading') return 'heading';
  return 'paragraph';
}
