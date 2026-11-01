import { describe, expect, it } from 'vitest';

import {
  SEARCH_ENDPOINTS,
  SEARCH_RESPONSE_FIELD,
  SEARCH_RESULT_KINDS,
  toTerms,
} from './contract';

// G344/G352: four endpoints, a term array, and non-uniform response field names.
describe('the search contract', () => {
  it('names the four endpoints', () => {
    expect(Object.values(SEARCH_ENDPOINTS)).toEqual([
      '/search-flexi/space/v1/search',
      '/search-flexi/document-highlights/v1/search',
      '/search-flexi/block-highlights/v1/search',
      '/search-flexi/rows/v1/search',
    ]);
  });

  it('keeps the per-endpoint response field names distinct', () => {
    expect(SEARCH_RESPONSE_FIELD.space).toBe('items');
    expect(SEARCH_RESPONSE_FIELD.documentHighlights).toBe('results');
    expect(SEARCH_RESPONSE_FIELD.blockHighlights).toBe('highlights');
    expect(new Set(Object.values(SEARCH_RESPONSE_FIELD)).size).toBe(4);
  });

  it('splits a query into a term array', () => {
    expect(toTerms('  craft   search ')).toEqual(['craft', 'search']);
    expect(toTerms('')).toEqual([]);
  });
});

// G387: nine result kinds.
describe('the result kinds', () => {
  it('lists all nine', () => {
    expect([...SEARCH_RESULT_KINDS]).toEqual([
      'document', 'block', 'date', 'documentAction', 'mention', 'folder', 'space', 'loadingMore', 'mentions',
    ]);
  });
});
