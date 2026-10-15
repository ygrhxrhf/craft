/**
 * 「统计 · 这一页」 (G201). Four figures, all derived: word count, character count (excluding
 * spaces, which the panel says so under the label), block count, and reading time. The section
 * title carries a 「 · 这一页」 suffix, which implies the same panel has a whole-document reading
 * elsewhere — so the scope is a parameter, not baked into the labels.
 */
export type StatsScope = 'page' | 'selection' | 'document';

export const STATS_SCOPES: readonly StatsScope[] = ['page', 'selection', 'document'];

/** The three scope names, verbatim from the catalog (`stats.this.page` / `selection` / `full.document`). */
export const STATS_SCOPE_LABELS: Record<StatsScope, string> = {
  page: '这一页',
  selection: '选择',
  document: '完整文档',
};

export const STATS_TITLE_BASE = '统计';

/** Characters with whitespace removed — what the "不包括空格" note refers to. */
export function charactersExcludingSpaces(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * `gap.md` G377 —— 官方「统计」区是**五项**：`字数` / `字符数` / `不包括空格` / `区块` / `阅读时间`
 * （V39 实采值 2/4/4/1/0s）。所以 `字符数`（**含**空格）与 `不包括空格` 是**两行**，不是一行里的注记。
 */
export function charactersWithSpaces(text: string): number {
  return text.length;
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
  /** 字符数：**含**空格（G377 五项里的第二项）。 */
  characters: number;
  /** 不包括空格：第三项。 */
  charactersNoSpaces: number;
  blocks: number;
  readingMinutes: number;
}

/** Assemble the five figures (G377). `blocks` is counted by the caller, which has the document. */
export function pageStats(input: {
  wordCount: number;
  plainText: string;
  blockCount: number;
}): PageStats {
  return {
    words: input.wordCount,
    characters: charactersWithSpaces(input.plainText),
    charactersNoSpaces: charactersExcludingSpaces(input.plainText),
    blocks: input.blockCount,
    readingMinutes: readingMinutes(input.wordCount),
  };
}

/** The section title for a scope: 「统计 · 这一页」, and the same shape for the other two. */
export function statsTitle(scope: StatsScope = 'page'): string {
  return `${STATS_TITLE_BASE} · ${STATS_SCOPE_LABELS[scope]}`;
}

/**
 * The slice a scope counts (G67). "这一页" is the open page; "选择" is the highlighted text, and with
 * nothing highlighted it counts nothing rather than silently falling back to the page; "完整文档" sums
 * the open page with its subpages, which the caller supplies because the document list does not carry
 * their text.
 */
export function statsInputFor(
  scope: StatsScope,
  input: {
    page: { wordCount: number; plainText: string; blockCount: number };
    selection: { wordCount: number; plainText: string; blockCount: number };
    subpages: readonly { wordCount: number; plainText: string; blockCount: number }[];
  },
): { wordCount: number; plainText: string; blockCount: number } {
  if (scope === 'selection') return input.selection;
  if (scope === 'page') return input.page;
  return input.subpages.reduce(
    (sum, page) => ({
      wordCount: sum.wordCount + page.wordCount,
      plainText: `${sum.plainText}${page.plainText}`,
      blockCount: sum.blockCount + page.blockCount,
    }),
    input.page,
  );
}

/** The five row labels, in order (G377). */
export const STATS_LABELS = ['字数', '字符数', '不包括空格', '区块', '阅读时间'] as const;
