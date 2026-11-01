import { describe, expect, it } from 'vitest';

import { canonicalFontId,
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

// G685: canonical font names plus the irregular legacy aliases.
describe('font ids', () => {
  it('accepts both spellings and canonicalises them', () => {
    expect(canonicalFontId('system')).toBe('system');
    expect(canonicalFontId('inter')).toBe('system');
    // The irregular one: sans-serif is the default pack, not the serif pack.
    expect(canonicalFontId('sans-serif')).toBe('system');
    expect(canonicalFontId('serif')).toBe('system-serif');
    expect(canonicalFontId('rounded')).toBe('system-rounded');
    expect(canonicalFontId('mono')).toBe('system-mono');
  });

  it('falls back to the default pack for junk', () => {
    expect(canonicalFontId(undefined)).toBe('system');
    expect(canonicalFontId('comic-sans')).toBe('system');
  });

  it('normalizes a stored legacy value on read', () => {
    expect(normalizePageStyle({ fontPack: 'serif' }).fontPack).toBe('system-serif');
    expect(normalizePageStyle({ fontPack: 'inter' }).fontPack).toBe('system');
  });
});
