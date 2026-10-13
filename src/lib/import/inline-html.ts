/**
 * The inline-HTML → text-decoration dispatch table (G1236). Official Craft's importer maps six
 * tags onto run decorations and silently drops everything else (its `default:` is a `continue`,
 * not a warning). `span` is a case with an empty body — recognised, but it decorates nothing.
 *
 * This is the table itself, kept separate from any parser: the local importer reads markdown
 * punctuation today, and this is what an HTML entry point would consult.
 */

export type InlineMarkType = 'bold' | 'italic' | 'strike' | 'highlight' | 'link';

export interface InlineTagRule {
  /** The local mark the tag produces, or null for the recognised-but-empty `span` case. */
  mark: InlineMarkType | null;
  /** Whether the rule reads an attribute (only `link` does, and only `href`). */
  readsAttribute?: 'href';
}

/** The six tags, verbatim. Anything not listed here is dropped silently. */
export const INLINE_TAG_RULES: Record<string, InlineTagRule> = {
  strong: { mark: 'bold' },
  em: { mark: 'italic' },
  s: { mark: 'strike' },
  highlight: { mark: 'highlight' },
  link: { mark: 'link', readsAttribute: 'href' },
  // Recognised, but it decorates nothing.
  span: { mark: null },
};

/**
 * The default highlight colour, verbatim: one literal string carrying both the light and the dark
 * value, light first (`#fff100 #fff432`). The pair is not split into two fields.
 */
export const DEFAULT_HIGHLIGHT_COLOR = '#fff100 #fff432';

/** Resolve a tag to its rule, or null when the tag is one the official table drops. */
export function ruleForTag(tag: string): InlineTagRule | null {
  const rule = INLINE_TAG_RULES[tag.toLowerCase()];
  return rule ?? null;
}
