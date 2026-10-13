import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CODE_LANGUAGE,
  PSEUDO_LANGUAGES,
  isValidDefaultLanguage,
  isValidDefaultTheme,
  resolveDefaultLanguage,
  resolveDefaultTheme,
} from './code-preferences';

/**
 * The two code-block defaults (G1166). The validators are deliberately different: the theme only
 * checks that the value is a string (an unknown name is folded later), while the language excludes
 * the three pseudo-languages outright.
 */
describe('the default theme preference', () => {
  it('accepts any string, as the official validator does', () => {
    expect(isValidDefaultTheme('nord')).toBe(true);
    expect(isValidDefaultTheme('nonsense')).toBe(true);
    expect(isValidDefaultTheme(7)).toBe(false);
    expect(isValidDefaultTheme(null)).toBe(false);
  });

  it('folds an unknown name onto auto', () => {
    expect(resolveDefaultTheme('nord')).toBe('nord');
    expect(resolveDefaultTheme('nonsense')).toBe('auto');
    expect(resolveDefaultTheme(undefined)).toBe('auto');
  });
});

describe('the default language preference', () => {
  it('defaults to javascript', () => {
    expect(DEFAULT_CODE_LANGUAGE).toBe('javascript');
  });

  it('excludes exactly the three pseudo-languages', () => {
    expect([...PSEUDO_LANGUAGES]).toEqual(['mermaid', 'math_formula', 'stex']);
    for (const pseudo of PSEUDO_LANGUAGES) {
      expect(isValidDefaultLanguage(pseudo), pseudo).toBe(false);
    }
  });

  it('accepts an ordinary language and rejects a non-string', () => {
    expect(isValidDefaultLanguage('python')).toBe(true);
    expect(isValidDefaultLanguage(42)).toBe(false);
  });

  it('folds an excluded or unknown value onto javascript', () => {
    expect(resolveDefaultLanguage('mermaid')).toBe('javascript');
    expect(resolveDefaultLanguage('cobol')).toBe('javascript');
    expect(resolveDefaultLanguage('python')).toBe('python');
  });
});
