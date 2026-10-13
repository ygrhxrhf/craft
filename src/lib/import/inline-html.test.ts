import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HIGHLIGHT_COLOR,
  INLINE_TAG_RULES,
  ruleForTag,
} from './inline-html';

/**
 * The inline-HTML dispatch table (G1236). Six tags, one of which (`span`) decorates nothing, and
 * a silent default for everything else. The highlight colour is one string holding both the light
 * and the dark value.
 */
describe('the dispatch table', () => {
  it('has exactly the six collected tags', () => {
    expect(Object.keys(INLINE_TAG_RULES).sort()).toEqual([
      'em',
      'highlight',
      'link',
      's',
      'span',
      'strong',
    ]);
  });

  it('maps the five decorating tags to their marks', () => {
    expect(ruleForTag('strong')?.mark).toBe('bold');
    expect(ruleForTag('em')?.mark).toBe('italic');
    expect(ruleForTag('s')?.mark).toBe('strike');
    expect(ruleForTag('highlight')?.mark).toBe('highlight');
    expect(ruleForTag('link')?.mark).toBe('link');
  });

  it('recognises span but decorates nothing', () => {
    expect(ruleForTag('span')).toEqual({ mark: null });
  });

  it('reads an attribute only for the link rule', () => {
    expect(ruleForTag('link')?.readsAttribute).toBe('href');
    for (const tag of ['strong', 'em', 's', 'highlight', 'span']) {
      expect(ruleForTag(tag)?.readsAttribute, tag).toBeUndefined();
    }
  });

  it('returns null for a tag the official table drops, rather than guessing a mark', () => {
    expect(ruleForTag('div')).toBeNull();
    expect(ruleForTag('script')).toBeNull();
  });

  it('matches tags case-insensitively', () => {
    expect(ruleForTag('STRONG')?.mark).toBe('bold');
  });
});

describe('the highlight colour', () => {
  it('carries both the light and the dark value in one string, light first', () => {
    expect(DEFAULT_HIGHLIGHT_COLOR).toBe('#fff100 #fff432');
    const [light, dark] = DEFAULT_HIGHLIGHT_COLOR.split(' ');
    expect(light).toBe('#fff100');
    expect(dark).toBe('#fff432');
  });
});
