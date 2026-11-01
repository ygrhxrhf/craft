/**
 * G1238: the official importer does **not** make inline math a node type. It emits a run
 * decoration whose `linkURL` is `tex://` + the source — the same channel an inline `code` uses
 * (`isCode: true`), and the same one `softbreak`/`hardbreak` share (both just append a newline,
 * so the two are indistinguishable after import).
 *
 * Locally inline math is its own node, so this module is the mapping between the two shapes:
 * a `tex://` link reads back as math, and math writes out as that link.
 */

export const TEX_SCHEME_PREFIX = 'tex://';

export type InlineRunKind = 'math' | 'code' | 'break';

export interface InlineRun {
  /** Start offset inside the block's text. */
  range: [number, number];
  linkURL?: string;
  isCode?: boolean;
}

/** The run an inline-math source becomes: a link whose URL carries the LaTeX. */
export function mathRun(range: [number, number], latex: string): InlineRun {
  return { range, linkURL: `${TEX_SCHEME_PREFIX}${latex}` };
}

/** The run inline code becomes. */
export function codeRun(range: [number, number]): InlineRun {
  return { range, isCode: true };
}

/** Whether a link URL is inline math, and the LaTeX it carries. */
export function mathFromLink(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith(TEX_SCHEME_PREFIX)) return null;
  return url.slice(TEX_SCHEME_PREFIX.length);
}

/**
 * `softbreak` and `hardbreak` both reduce to a newline — the official importer keeps no flag to
 * tell them apart, so a round trip cannot restore which one it was.
 */
export function breakRun(range: [number, number]): InlineRun {
  return { range };
}

export function breakKindOf(_run: InlineRun): 'break' {
  return 'break';
}
