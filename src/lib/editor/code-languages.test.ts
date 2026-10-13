import { describe, expect, it } from 'vitest';

import { CODE_LANGUAGES, languageFor, languageLabel } from './code-languages';

/**
 * The code-block language list (G1086). 39 entries, each a `{storedLangCode, langCode, label}`
 * triple, in the official order. The two codes are not interchangeable: five entries differ, and
 * `plaintext`'s langCode is a deliberate `null` rather than an empty string.
 */
describe('the official language list', () => {
  it('has all 39 entries in order', () => {
    expect(CODE_LANGUAGES).toHaveLength(39);
    expect(CODE_LANGUAGES[0].storedLangCode).toBe('ada');
    expect(CODE_LANGUAGES[CODE_LANGUAGES.length - 1].storedLangCode).toBe('other');
  });

  it('carries the five entries whose two spellings differ', () => {
    const differs = CODE_LANGUAGES.filter((e) => e.langCode !== e.storedLangCode).map(
      (e) => e.storedLangCode,
    );
    expect(differs).toEqual(['cs', 'math_formula', 'objectivec', 'plaintext', 'typescript']);
    expect(languageFor('cs')?.langCode).toBe('csharp');
    expect(languageFor('typescript')?.langCode).toBe('tsx');
    expect(languageFor('objectivec')?.langCode).toBe('objectiveC');
    expect(languageFor('math_formula')?.langCode).toBe('stex');
  });

  it('expresses "no highlighting" as a null langCode on plaintext', () => {
    expect(languageFor('plaintext')?.langCode).toBeNull();
  });

  it('keeps a fallback entry for an unknown language', () => {
    expect(languageFor('other')?.label).toBe('Other');
  });

  it('prints the label, not the code', () => {
    expect(languageLabel('cs')).toBe('C#');
    expect(languageLabel('vbnet')).toBe('Visual Basic.NET');
    expect(languageLabel('math_formula')).toBe('Formula (TeX)');
  });

  it('falls back to the raw code for something outside the list', () => {
    expect(languageLabel('cobol')).toBe('cobol');
  });

  it('reads an empty or missing value as Plain text', () => {
    expect(languageLabel('')).toBe('Plain text');
    expect(languageLabel(null)).toBe('Plain text');
    expect(languageLabel(undefined)).toBe('Plain text');
  });
});
