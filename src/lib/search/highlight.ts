/**
 * G1286: a block hit comes back with its match marked, and the snippet keeps the
 * match in view instead of always taking the first N characters. The comparison is
 * case-insensitive, matching the official search.
 */

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, hit: false }];
  const haystack = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const found = haystack.indexOf(needle, cursor);
    if (found < 0) {
      segments.push({ text: text.slice(cursor), hit: false });
      break;
    }
    if (found > cursor) segments.push({ text: text.slice(cursor, found), hit: false });
    segments.push({ text: text.slice(found, found + needle.length), hit: true });
    cursor = found + needle.length;
  }
  return segments.length ? segments : [{ text, hit: false }];
}

export interface Snippet {
  segments: HighlightSegment[];
  /** True when the snippet starts/ends inside the original text. */
  prefix: boolean;
  suffix: boolean;
}

export function snippetAround(text: string, query: string, limit = 120): Snippet {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (text.length <= limit || index < 0) {
    return { segments: highlightSegments(text.slice(0, limit), query), prefix: false, suffix: text.length > limit };
  }
  const lead = Math.min(30, Math.max(0, index - Math.floor(limit / 3)));
  const start = Math.max(0, Math.min(index - lead, text.length - limit));
  const end = Math.min(text.length, start + limit);
  return {
    segments: highlightSegments(text.slice(start, end), query),
    prefix: start > 0,
    suffix: end < text.length,
  };
}
