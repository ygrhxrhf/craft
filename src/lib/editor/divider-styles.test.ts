import { describe, expect, it } from 'vitest';

import {
  DIVIDER_PATTERN,
  DIVIDER_SIGILS,
  OFFICIAL_DIVIDER_STYLES,
  dividerMarkupFromStyle,
  dividerStyleFromMarkup,
  normalizeDividerStyle,
} from './divider-styles';

describe('the official line-style table', () => {
  it('reads every markup the official importer names', () => {
    expect(dividerStyleFromMarkup('..-')).toBe('extraLight');
    expect(dividerStyleFromMarkup('.--')).toBe('light');
    expect(dividerStyleFromMarkup('---')).toBe('regular');
    expect(dividerStyleFromMarkup('=--')).toBe('strong');
    expect(dividerStyleFromMarkup('===')).toBe('pageSeparator');
  });

  it('reads the asterisk scale the bridge round-trips at', () => {
    expect(dividerStyleFromMarkup('***')).toBe('extraLight');
    expect(dividerStyleFromMarkup('****')).toBe('light');
    expect(dividerStyleFromMarkup('*****')).toBe('regular');
    expect(dividerStyleFromMarkup('******')).toBe('strong');
  });

  it('reads the asterisk scale the bridge round-trips at', () => {
    expect(dividerStyleFromMarkup('***')).toBe('extraLight');
    expect(dividerStyleFromMarkup('****')).toBe('light');
    expect(dividerStyleFromMarkup('*****')).toBe('regular');
    expect(dividerStyleFromMarkup('******')).toBe('strong');
    // The scale has to separate neighbouring styles, or counting asterisks proves nothing.
    expect(dividerStyleFromMarkup('****')).not.toBe(dividerStyleFromMarkup('*****'));
  });

  it('keeps an unnamed thematic break on the default style', () => {
    expect(dividerStyleFromMarkup('----')).toBe('regular');
    expect(dividerStyleFromMarkup('_____')).toBe('regular');
  });

  it('is not a divider for anything shorter than a rule', () => {
    expect(dividerStyleFromMarkup('**')).toBeUndefined();
    expect(dividerStyleFromMarkup('--')).toBeUndefined();
    expect(dividerStyleFromMarkup('-')).toBeUndefined();
    expect(dividerStyleFromMarkup('a')).toBeUndefined();
  });

  it('writes back a markup that reads as the same style', () => {
    for (const style of [...OFFICIAL_DIVIDER_STYLES]) {
      const markup = dividerMarkupFromStyle(style);
      expect(dividerStyleFromMarkup(markup), `${style} -> "${markup}"`).toBe(style);
    }
  });

  it('writes a legacy style as the official weight it stood for', () => {
    expect(dividerMarkupFromStyle('thin')).toBe('***');
    expect(dividerMarkupFromStyle('medium')).toBe('****');
    expect(dividerMarkupFromStyle('thick')).toBe('*****');
    expect(dividerMarkupFromStyle(undefined)).toBe('*****');
  });
});

describe('the style whitelist', () => {
  it('keeps known names and folds everything else onto the default', () => {
    expect(normalizeDividerStyle('strong')).toBe('strong');
    expect(normalizeDividerStyle('dashed')).toBe('dashed');
    expect(normalizeDividerStyle('banana')).toBe('regular');
    expect(normalizeDividerStyle('')).toBe('regular');
    expect(normalizeDividerStyle(undefined)).toBe('regular');
    expect(normalizeDividerStyle(null)).toBe('regular');
    expect(normalizeDividerStyle(7)).toBe('regular');
  });
});

describe('the typing surface', () => {
  it('answers only to markups the table also names', () => {
    const unmatched = Object.keys(DIVIDER_SIGILS).filter((sigil) => !DIVIDER_PATTERN.test(sigil));
    expect(unmatched).toEqual([]);
  });

  it('leaves the two-character dashed form out so `=--` stays reachable', () => {
    expect(DIVIDER_SIGILS['=-']).toBeUndefined();
    expect(DIVIDER_PATTERN.test('=-')).toBe(false);
  });
});
