import { describe, expect, it } from 'vitest';

import {
  INLINE_INPUT_MODES,
  INLINE_LINK_PLACEHOLDER,
  INLINE_LINK_PLACEHOLDER_KEY,
  inlineInputMode,
  inlinePlaceholder,
} from './inline-input';

describe('the four inline text siblings (G457)', () => {
  it('differ only by their inputMode', () => {
    expect(INLINE_INPUT_MODES).toEqual({
      text: 'text',
      email: 'email',
      phone: 'tel',
      url: 'url',
    });
  });

  it('lets a caller override propertyType from outside', () => {
    expect(inlineInputMode('email', 'url')).toBe('url');
    expect(inlineInputMode('phone')).toBe('tel');
    expect(inlineInputMode()).toBe('text');
  });

  it('reuses style.inline.link as the url placeholder only', () => {
    expect(inlinePlaceholder('url')).toBe('链接');
    expect(inlinePlaceholder('email')).toBe('');
    expect(inlinePlaceholder()).toBe('');
    expect(INLINE_LINK_PLACEHOLDER).toBe('链接');
    expect(INLINE_LINK_PLACEHOLDER_KEY).toBe('style.inline.link');
  });
});