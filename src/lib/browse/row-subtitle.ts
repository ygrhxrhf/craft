/**
 * The browse list row's subtitle (G248). It is a **content-summary fallback chain**, not a date:
 *
 *   1. a preview of the body text, truncated with `…` when long
 *   2. 「空文档」 for a document with no text at all
 *   3. `/` for a document whose body is only a separator
 *   4. for a collection, the child names joined with `·`
 *
 * The order matters — each step is the answer only when the ones above it produce nothing, so an
 * empty string must not be mistaken for "short preview".
 */

export const EMPTY_DOCUMENT = '空文档';
export const EMPTY_DOCUMENT_KEY = 'browse.empty.document';

/** How much of the body fits on one row before it is cut. */
export const SUBTITLE_PREVIEW_LENGTH = 80;

/** The separator a divider-only body reduces to. */
export const SEPARATOR_MARK = '/';

export interface RowSubtitleInput {
  /** The document's plain-text projection, already flattened to a single line. */
  plainText?: string | null;
  /** Child names, when this row is a collection rather than a page. */
  collectionChildNames?: readonly string[] | null;
}

/** Collapse whitespace so a multi-line body reads as one row. */
export function flattenPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Cut a preview to the row's width, marking the cut with an ellipsis. */
export function truncatePreview(text: string, limit = SUBTITLE_PREVIEW_LENGTH): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

/** The child-name string a collection row shows, e.g. 「Collection · Collection」. */
export function collectionSubtitle(names: readonly string[]): string {
  return names.join(' · ');
}

/**
 * The row's subtitle, or `null` when there is nothing to say.
 *
 * A collection wins over body text: its children *are* its content, and the official row shows the
 * names even though the collection's own stored text may be non-empty.
 */
export function rowSubtitle(input: RowSubtitleInput): string | null {
  if (input.collectionChildNames?.length) {
    return collectionSubtitle(input.collectionChildNames);
  }
  const text = flattenPreview(input.plainText ?? '');
  if (!text) return EMPTY_DOCUMENT;
  // A body that is nothing but a rule reduces to the separator mark, not to an empty preview.
  if (/^[/\\|—–\-_*]+$/.test(text)) return SEPARATOR_MARK;
  return truncatePreview(text);
}
