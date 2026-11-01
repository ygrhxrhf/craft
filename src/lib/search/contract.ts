/**
 * G344/G352/G387: the official search surface is four PUT endpoints whose input is a **term
 * array** plus a scope, and whose result rows carry nine kinds.
 *
 * Locally search is a server action rather than four HTTP routes, so what is shared here is the
 * contract the local action must satisfy: the endpoint names, the scope vocabulary, the nine
 * result kinds, and the per-endpoint response field names. Keeping them in one place is what lets
 * the palette and the action agree without re-deriving the shape from prose.
 */

export const SEARCH_ENDPOINTS = {
  space: '/search-flexi/space/v1/search',
  documentHighlights: '/search-flexi/document-highlights/v1/search',
  blockHighlights: '/search-flexi/block-highlights/v1/search',
  rows: '/search-flexi/rows/v1/search',
} as const;

export type SearchEndpoint = (typeof SEARCH_ENDPOINTS)[keyof typeof SEARCH_ENDPOINTS];

/** The response envelope field each endpoint uses — the names are **not** uniform. */
export const SEARCH_RESPONSE_FIELD: Record<keyof typeof SEARCH_ENDPOINTS, string> = {
  space: 'items',
  documentHighlights: 'results',
  blockHighlights: 'highlights',
  rows: 'rows',
};

/** The nine result kinds the official result list can hold. */
export const SEARCH_RESULT_KINDS = [
  'document',
  'block',
  'date',
  'documentAction',
  'mention',
  'folder',
  'space',
  'loadingMore',
  'mentions',
] as const;

export type SearchResultKind = (typeof SEARCH_RESULT_KINDS)[number];

export interface SearchRequest {
  /** The term array — not a single query string. */
  terms: string[];
  scope?: string;
}

/** Split a typed query into the term array the endpoints take. */
export function toTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** A `date` result the palette can offer when the query parses as a day. */
export interface SearchDateResult {
  kind: 'date';
  label: string;
  href: string;
}

/** A `folder` result. */
export interface SearchFolderResult {
  kind: 'folder';
  id: string;
  title: string;
  href: string;
}
