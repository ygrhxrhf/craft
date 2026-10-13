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

