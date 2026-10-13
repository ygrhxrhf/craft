/**
 * 「统计 · 这一页」 (G201). Four figures, all derived: word count, character count (excluding
 * spaces, which the panel says so under the label), block count, and reading time. The section
 * title carries a 「 · 这一页」 suffix, which implies the same panel has a whole-document reading
 * elsewhere — so the scope is a parameter, not baked into the labels.
 */
export type StatsScope = 'page' | 'document';

export const STATS_TITLE_BASE = '统计';
export const STATS_TITLE_SUFFIX = ' · 这一页';

/** Characters with whitespace removed — what the "不包括空格" note refers to. */
export function charactersExcludingSpaces(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Reading time in minutes. 200 words a minute is the common figure; a non-empty page rounds up to
 * at least one minute, so a short page does not read as "0 分钟".
 */
export const WORDS_PER_MINUTE = 200;

export function readingMinutes(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export interface PageStats {
  words: number;
  characters: number;
  blocks: number;
  readingMinutes: number;
}

/** Assemble the four figures. `blocks` is counted by the caller, which has the document. */
export function pageStats(input: {
  wordCount: number;
  plainText: string;
  blockCount: number;
}): PageStats {
  return {
    words: input.wordCount,
    characters: charactersExcludingSpaces(input.plainText),
    blocks: input.blockCount,
    readingMinutes: readingMinutes(input.wordCount),
  };
}

/** The section title for a scope. */
export function statsTitle(scope: StatsScope = 'page'): string {
  return scope === 'page' ? `${STATS_TITLE_BASE}${STATS_TITLE_SUFFIX}` : STATS_TITLE_BASE;
}

/** The four row labels, in order. */
export const STATS_LABELS = ['字数', '字符数', '区块', '阅读时间'] as const;
