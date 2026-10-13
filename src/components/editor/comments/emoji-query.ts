/**
 * The trigger a comment composer completes (G74): `:` for emoji, `@` for a person. It is the run of
 * characters after the last trigger that sits at the caret. An empty query is a query for `@`, which
 * lists everyone, and not one for `:`, which would list the whole emoji set. Typing past it closes it.
 */
export interface EmojiQuery {
  /** Where the trigger sits, so accepting a suggestion can replace from there. */
  start: number;
  query: string;
}

export function triggerQueryAt(
  draft: string,
  caret: number,
  trigger: string,
  allowEmpty: boolean,
): EmojiQuery | null {
  const upto = draft.slice(0, caret);
  const at = upto.lastIndexOf(trigger);
  if (at < 0) return null;
  const query = upto.slice(at + trigger.length);
  // The other trigger wins when it sits closer to the caret, so `:smile @zhang` completes the name.
  if (/[:@]/.test(query)) return null;
  if (/\s/.test(query)) return null;
  if (!query && !allowEmpty) return null;
  return { start: at, query };
}

export function emojiQueryAt(draft: string, caret: number): EmojiQuery | null {
  return triggerQueryAt(draft, caret, ':', false);
}

export function mentionQueryAt(draft: string, caret: number): EmojiQuery | null {
  return triggerQueryAt(draft, caret, '@', true);
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
