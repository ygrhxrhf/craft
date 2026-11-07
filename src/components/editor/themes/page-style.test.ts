import { describe, expect, it } from 'vitest';

import { canonicalFontId,
  DEFAULT_SPELLING_LANG,
  SPELLING_LANGUAGES,
  filterSpellingLanguages,
  normalizeColorChannel,
  normalizePageStyle,
  pageStyleForPreset,
  parseDualColor,
  resolveColorChannel,
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

// G1436: the page text colour is part of the page style and validated on read.
describe('the page text colour', () => {
  it('accepts a six-digit hex and drops anything else', () => {
    expect(normalizePageStyle({ textColor: '#2563eb' }).textColor).toBe('#2563eb');
    expect(normalizePageStyle({ textColor: 'red' }).textColor).toBeUndefined();
    expect(normalizePageStyle({ textColor: '#25f' }).textColor).toBeUndefined();
    expect(normalizePageStyle({}).textColor).toBeUndefined();
  });
});

/**
 * G673/G686: a colour channel is either `#RRGGBB` or the light/dark pair `"#light #dark"`,
 * and the pair stays **one string** in storage — never two fields.
 */
describe('the colour channels', () => {
  it('parses a single value and a light/dark pair', () => {
    expect(parseDualColor('#222222')).toEqual({ light: '#222222' });
    expect(parseDualColor('#111111 #eeeeee')).toEqual({ light: '#111111', dark: '#eeeeee' });
    expect(parseDualColor('  #111111   #eeeeee  ')).toEqual({ light: '#111111', dark: '#eeeeee' });
  });

  it('rejects anything that is not one or two hex colours', () => {
    expect(parseDualColor(undefined)).toBeNull();
    expect(parseDualColor('#25f')).toBeNull();
    expect(parseDualColor('#111111 red')).toBeNull();
    expect(parseDualColor('#111111 #eeeeee #333333')).toBeNull();
  });

  it('stores the pair verbatim, not split', () => {
    expect(normalizeColorChannel('#111111 #eeeeee')).toBe('#111111 #eeeeee');
    expect(normalizeColorChannel('#222222')).toBe('#222222');
    expect(normalizeColorChannel('nope')).toBeUndefined();
  });

  it('picks the half the current appearance needs', () => {
    expect(resolveColorChannel('#111111 #eeeeee', false)).toBe('#111111');
    expect(resolveColorChannel('#111111 #eeeeee', true)).toBe('#eeeeee');
    // A single value serves both appearances.
    expect(resolveColorChannel('#222222', true)).toBe('#222222');
  });

  it('round-trips a background channel through the page style', () => {
    expect(normalizePageStyle({ backgroundColor: '#111111 #eeeeee' }).backgroundColor).toBe('#111111 #eeeeee');
    expect(normalizePageStyle({ backgroundColor: '#222222' }).backgroundColor).toBe('#222222');
    expect(normalizePageStyle({ backgroundColor: 'transparent' }).backgroundColor).toBeUndefined();
  });
});

/**
 * G282: the two page-style actions the ledger recorded as missing — a paragraph spacing preset and
 * a named page-style preset.
 */
describe('the page paragraph spacing and style preset (G282)', () => {
  it('normalises a known paragraph spacing value', () => {
    expect(normalizePageStyle({ paragraphSpacing: 'compact' }).paragraphSpacing).toBe('compact');
    expect(normalizePageStyle({ paragraphSpacing: 'relaxed' }).paragraphSpacing).toBe('relaxed');
  });

  it('drops an unknown spacing value rather than keeping it', () => {
    expect(normalizePageStyle({ paragraphSpacing: 'huge' }).paragraphSpacing).toBeUndefined();
  });

  it('keeps null distinct from a real preset (null = not set)', () => {
    // `null` reads as "not set, follow the document"; it is not a zero-spacing preset.
    expect(normalizePageStyle({ paragraphSpacing: null }).paragraphSpacing).toBeUndefined();
  });

  it('applies a page style preset as a patch of the individual fields', () => {
    expect(pageStyleForPreset('serif')).toMatchObject({ fontPack: 'system-serif', stylePreset: 'serif' });
    expect(pageStyleForPreset('mono')).toMatchObject({ fontPack: 'system-mono', stylePreset: 'mono' });
    expect(pageStyleForPreset('default')).toMatchObject({ fontPack: 'system', washi: 'none', stylePreset: 'default' });
  });

  it('normalises a known style preset and drops an unknown one', () => {
    expect(normalizePageStyle({ stylePreset: 'paper' }).stylePreset).toBe('paper');
    expect(normalizePageStyle({ stylePreset: 'nope' }).stylePreset).toBeUndefined();
  });
});
