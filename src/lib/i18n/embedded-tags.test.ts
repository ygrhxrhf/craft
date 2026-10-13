import { describe, expect, it } from 'vitest';

import { EMBEDDED_TAGS, isKnownTag, stripEmbeddedTags, tagNamingStyle } from './embedded-tags';

/**
 * Tags embedded in i18n values (G320): 17 names in five naming styles, and a plain-text strip for
 * renderers that cannot show them.
 */
describe('the vocabulary', () => {
  it('has 17 tags', () => {
    expect(EMBEDDED_TAGS).toHaveLength(17);
  });

  it('puts the three heaviest first', () => {
    expect(EMBEDDED_TAGS[0]).toEqual({ name: 'strong', count: 18 });
    expect(EMBEDDED_TAGS[1]).toEqual({ name: 'highlight', count: 17 });
  });

  it('recognises the known names and a PascalCase one', () => {
    expect(isKnownTag('strong')).toBe(true);
    expect(isKnownTag('UncoloredLink')).toBe(true);
    expect(isKnownTag('nonsense')).toBe(false);
  });
});

describe('the five naming styles', () => {
  it('classifies each', () => {
    expect(tagNamingStyle('strong')).toBe('htmlStandard');
    expect(tagNamingStyle('username')).toBe('customLowercase');
    expect(tagNamingStyle('italic')).toBe('elementAsStyle');
    expect(tagNamingStyle('UncoloredLink')).toBe('pascalCase');
    expect(tagNamingStyle('br')).toBe('selfClosing');
  });

  it('returns null for an unknown name', () => {
    expect(tagNamingStyle('nonsense')).toBeNull();
  });
});

describe('stripping the tags', () => {
  it('removes wrapping tags and keeps the text', () => {
    expect(stripEmbeddedTags('请阅读 <strong>条款</strong> 后再继续')).toBe('请阅读 条款 后再继续');
  });

  it('turns a self-closing br into a newline', () => {
    expect(stripEmbeddedTags('第一行<br/>第二行')).toBe('第一行\n第二行');
  });

  it('removes a PascalCase tag', () => {
    expect(stripEmbeddedTags('见 <UncoloredLink>此页</UncoloredLink>')).toBe('见 此页');
  });

  it('leaves plain text untouched', () => {
    expect(stripEmbeddedTags('没有标签')).toBe('没有标签');
  });
});
