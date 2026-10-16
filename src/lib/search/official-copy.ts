/**
 * The search palette's official create-document row (`gap.md` G178's second half). The template
 * carries a `[0]` slot — the raw query goes there — and the key is `browse.search.create.doc`
 * (the G178 row writes it as `search.create.doc`; the catalog value carries the `browse.` prefix
 * and is the one that decides).
 */
export const CREATE_DOC_KEY = 'browse.search.create.doc';
export const CREATE_DOC_TEMPLATE = '创建 [0]';

/** The row label for a query: 「创建 某某」 with the query verbatim in the slot. */
export function createDocLabel(query: string): string {
  return CREATE_DOC_TEMPLATE.replace('[0]', query);
}

/**
 * G1419 in-registry shape: search results group by three labels — document / pages / blocks. The
 * `document` label has the official `browse.docs` key verbatim; `pages` and `blocks` live in the
 * search-results domain but their panel-grouping keys were not collected (G1419 calls them 「裸键
 * （无点）」). Until the catalog lands the other two, keep the local headings but pin the source
 * where there is one and declare the rest as local wording.
 */
export const DOCS_HEADING_KEY = 'browse.docs';
export const DOCS_HEADING = '文档';
export const PAGES_HEADING = '页面';
export const BLOCKS_HEADING = '块内容';
export const ROWS_HEADING = '行';

/**
 * The two-stage search copy (G235). The palette shows a "still looking" line while more matches
 * are being fetched, and a 「再显示 [0] 项」 row for the next page.
 */
export const SEARCHING_OTHER_MATCHES = '正在搜索其他匹配项';
export const SEARCHING_OTHER_MATCHES_KEY = 'browse.searching.for.other.matches';

export const SEE_MORE_RESULTS = '查看更多结果';
export const SEE_MORE_RESULTS_KEY = 'browse.see.more.results';

export const SHOW_X_MORE_TEMPLATE = '再显示 [0] 项';
export const SHOW_X_MORE_KEY = 'browse.show.x.more';

/** The next-page row label: 「再显示 20 项」 with the count in the slot. */
export function showMoreLabel(count: number): string {
  return SHOW_X_MORE_TEMPLATE.replace('[0]', String(count));
}

/**
 * G235: the no-results sentence quotes the query, verbatim from the catalog
 * (`browse.no.results.found.for`). The pack also carries a bare `browse.no.results.found`
 * 「未找到结果」 for the *no-query* empty state — that state does not exist locally (an empty query
 * shows the launcher's action list instead), so only the with-query sentence is wired here.
 */
export const NO_RESULTS_FOUND_FOR_TEMPLATE = '未找到 [0] 的结果';
export const NO_RESULTS_FOUND_FOR_KEY = 'browse.no.results.found.for';

/** The with-query line: 「未找到 某某 的结果」, query verbatim in the slot. */
export function noResultsFor(query: string): string {
  return NO_RESULTS_FOUND_FOR_TEMPLATE.replace('[0]', query);
}

