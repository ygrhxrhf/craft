/**
 * The `:query` a comment composer completes (G74). It is the run of word characters after the last
 * colon that sits at the caret, and only while the caret is inside it — typing past it, or a colon
 * with nothing after it, offers nothing.
 */
export interface EmojiQuery {
  /** Where the colon sits, so accepting a suggestion can replace from there. */
  start: number;
  query: string;
}

export function emojiQueryAt(draft: string, caret: number): EmojiQuery | null {
  const upto = draft.slice(0, caret);
  const colon = upto.lastIndexOf(':');
  if (colon < 0) return null;
  const query = upto.slice(colon + 1);
  if (!query || /\s/.test(query)) return null;
  return { start: colon, query };
}

/**
 * Enter accepts the first suggestion while one is open, instead of sending the half-typed query.
 * The caller only has the count: the component owns which glyph that is.
 */
export function enterAcceptsEmoji(query: EmojiQuery | null, matchCount: number): boolean {
  return query !== null && matchCount > 0;
}

/** Replace the `:query` with the chosen glyph and report where the caret should land. */
export function acceptEmoji(draft: string, query: EmojiQuery, caret: number, glyph: string): {
  draft: string;
  caret: number;
} {
  const next = `${draft.slice(0, query.start)}${glyph}${draft.slice(caret)}`;
  return { draft: next, caret: query.start + glyph.length };
}
