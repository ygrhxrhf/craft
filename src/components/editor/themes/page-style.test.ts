import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SPELLING_LANG,
  SPELLING_LANGUAGES,
  filterSpellingLanguages,
  normalizePageStyle,
  showsDocumentTitle,
} from './page-style';

describe('page settings (G65)', () => {
  it('shows the title unless the page explicitly hides it', () => {
    expect(showsDocumentTitle({})).toBe(true);
    expect(showsDocumentTitle({ showTitle: true })).toBe(true);
    expect(showsDocumentTitle({ showTitle: false })).toBe(false);
  });

  it('keeps a stored false instead of folding it back to shown', () => {
    expect(normalizePageStyle({ showTitle: false }).showTitle).toBe(false);
    expect(normalizePageStyle({ spelling: true, spellingLang: 'en-US' })).toMatchObject({
      spelling: true,
      spellingLang: 'en-US',
    });
  });

  it('drops anything that is not the type the page stores', () => {
    expect(normalizePageStyle({ showTitle: 'no', spelling: 1, spellingLang: 2 })).toEqual({});
    expect(normalizePageStyle(null)).toEqual({});
  });

  it('offers a searchable language list with a default', () => {
    expect(SPELLING_LANGUAGES.map((lang) => lang.value)).toContain(DEFAULT_SPELLING_LANG);
    expect(filterSpellingLanguages('').length).toBe(SPELLING_LANGUAGES.length);
    expect(filterSpellingLanguages('英').map((lang) => lang.value)).toEqual(['en-US', 'en-GB']);
    expect(filterSpellingLanguages('zzz')).toEqual([]);
  });
});
