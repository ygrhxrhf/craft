/**
 * The matching half of 查找和替换 (`find.*`, `gap.md` G12 / `panels.md §六`): two modes
 * (文本 / 正则) over the text runs of a document, with two independent sensitivities
 * (区分大小写 / 忽略变音符号).
 *
 * Positions stay in ProseMirror coordinates throughout, so a match spanning two inline nodes
 * reports the range a transaction needs instead of an offset someone has to convert back.
 *
 * Runs are joined only where they are positionally contiguous. Two runs inside one paragraph
 * (plain text meeting bold) are contiguous and may be matched across; the gap where one block
 * ends and the next begins is a forbidden range, because a replacement there would have to
 * write across a node boundary. A run that falls inside such a gap is dropped rather than
 * clipped, so 「N 结果」 never disagrees with the marks on screen.
 */

export type FindMode = 'text' | 'regex';

/** One contiguous run of text, with the document range it came from. */
export interface TextSlice {
  text: string;
  from: number;
  to: number;
}

export interface FindMatch {
  from: number;
  to: number;
}

export interface FindResult {
  matches: FindMatch[];
  /**
   * A `regex` query that does not compile. The ledger collected no copy for this state
   * (`find.*` is 14 keys and none is an error line), so the panel falls back to a zero-length
   * result rather than showing an invented message.
   */
  invalid: boolean;
}

interface TextIndex {
  text: string;
  /** `starts[i]` is the offset where run `i` begins in the joined text. */
  starts: number[];
  /** Half-open offset ranges that belong to no run — the gaps between blocks. */
  gaps: Array<[number, number]>;
  slices: readonly TextSlice[];
}

export function buildIndex(slices: readonly TextSlice[]): TextIndex {
  const starts: number[] = [];
  const gaps: Array<[number, number]> = [];
  let text = '';
  for (let i = 0; i < slices.length; i += 1) {
    const slice = slices[i];
    const previous = slices[i - 1];
    if (previous && slice.from > previous.to) {
      // One placeholder character keeps every later offset honest; it is never part of a run.
      gaps.push([text.length, text.length + 1]);
      text += '\n';
    }
    starts.push(text.length);
    text += slice.text;
  }
  return { text, starts, gaps, slices };
}

/** Offset in the joined text → absolute document position (clamped to the owning run). */
export function docPosition(index: TextIndex, offset: number): number {
  const { starts, slices } = index;
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  const slice = slices[low];
  if (!slice) return 0;
  return slice.from + (offset - starts[low]);
}

function crossesGap(index: TextIndex, from: number, to: number): boolean {
  return index.gaps.some(([start, end]) => from < end && to > start);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COMBINING_MARKS = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\ufe20-\ufe2f]/gu;

interface FoldedText {
  text: string;
  /** Folded index → the source range it came from, so matches map back to document offsets. */
  start: number[];
  end: number[];
}

/**
 * G1418 「忽略变音符号（例如 ä = a）」: NFD-decompose and strip combining marks. Folding can change
 * length (`ǆ` → `dž`), so every folded character remembers the source range it came from; a match
 * is translated back through that map before it becomes a document range. Off, the map is the
 * identity so both paths share one scanning loop.
 */
function foldText(text: string, enabled: boolean): FoldedText {
  if (!enabled) {
    const start: number[] = [];
    const end: number[] = [];
    for (let i = 0; i < text.length; i += 1) {
      start.push(i);
      end.push(i + 1);
    }
    return { text, start, end };
  }
  let folded = '';
  const start: number[] = [];
  const end: number[] = [];
  let offset = 0;
  for (const char of text) {
    const base = char.normalize('NFD').replace(COMBINING_MARKS, '');
    const width = char.length;
    if (base.length === 0) {
      // A combining mark is part of the previous character, not a matchable position of its own.
      if (end.length > 0) end[end.length - 1] = offset + width;
    } else {
      for (let k = 0; k < base.length; k += 1) {
        start.push(offset);
        end.push(offset + width);
      }
      folded += base;
    }
    offset += width;
  }
  return { text: folded, start, end };
}

/** A regex source with combining marks stripped so an accented literal still matches its base. */
function foldPattern(pattern: string, enabled: boolean): string {
  return enabled ? pattern.normalize('NFD').replace(COMBINING_MARKS, '') : pattern;
}

/**
 * Case-insensitive unless `caseSensitive` is set: `match.case` (「区分大小写」) is its own toggle,
 * off by default, so the baseline is the toggle's off state. `diacriticsInsensitive` mirrors the
 * official 「忽略变音符号（例如 ä = a）」, which the capture shows selected by default.
 *
 * Zero-length matches (`a*`, an empty lookahead) are skipped: there is no text to mark or
 * replace, and counting them would make 「N 结果」 disagree with the marks on screen.
 */
export function findMatches(
  slices: readonly TextSlice[],
  query: string,
  mode: FindMode,
  caseSensitive: boolean = false,
  diacriticsInsensitive: boolean = true,
): FindResult {
  if (!query || slices.length === 0) return { matches: [], invalid: false };

  const flags = matchFlags(caseSensitive);
  const source = foldPattern(query, diacriticsInsensitive);
  const index = buildIndex(slices);
  const folded = foldText(index.text, diacriticsInsensitive);

  let pattern: RegExp;
  if (mode === 'regex') {
    try {
      pattern = new RegExp(source, flags);
    } catch {
      return { matches: [], invalid: true };
    }
  } else {
    pattern = new RegExp(escapeRegExp(source), flags);
  }

  const matches: FindMatch[] = [];
  let guard = 0;
  for (const hit of folded.text.matchAll(pattern)) {
    if (guard++ > 100_000) break;
    if (hit[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    const hitStart = hit.index;
    const hitEnd = hitStart + hit[0].length;
    const from = folded.start[hitStart];
    const to = folded.end[hitEnd - 1];
    if (from === undefined || to === undefined) continue;
    if (crossesGap(index, from, to)) continue;
    matches.push({ from: docPosition(index, from), to: docPosition(index, to) });
  }

  return { matches, invalid: false };
}

/**
 * The count line is `find.replace.search` =「[0] 结果 [1]」. Only `[0]` was collected, so `[1]`
 * is dropped rather than guessed.
 */
export function formatResultCount(total: number): string {
  return `${total} 结果`;
}

/** Same flags `findMatches` searches with, so a regex replacement cannot ignore `match.case`. */
export function matchFlags(caseSensitive: boolean): string {
  return caseSensitive ? 'g' : 'gi';
}

/**
 * What one hit becomes. Text mode writes the replacement verbatim (`$1` stays literal); regex mode
 * expands groups, and honours the same flags the search used to find the hit. When diacritics are
 * folded, the replacement runs over the folded text so a hit found as `a` in `ä` still rewrites.
 */
export function applyReplacement(
  text: string,
  query: string,
  replacement: string,
  mode: FindMode,
  caseSensitive: boolean,
  diacriticsInsensitive: boolean = true,
): string {
  if (mode !== 'regex') return replacement;
  const source = foldPattern(query, diacriticsInsensitive);
  const target = diacriticsInsensitive
    ? foldText(text, true).text
    : text;
  return target.replace(new RegExp(source, matchFlags(caseSensitive)), replacement);
}
