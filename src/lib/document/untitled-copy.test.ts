import { describe, expect, it } from 'vitest';

import {
  NEW_DOCUMENT_TITLE,
  UNTITLED_DOCUMENT,
  UNTITLED_PAGE,
  untitledFor,
  untitledKeyFor,
} from './untitled-copy';

/**
 * The two untitled placeholders (G215). The top bar and the list views use different strings for
 * the same entity.
 */
describe('the two placeholders', () => {
  it('uses 无标题页面 in the top bar', () => {
    expect(UNTITLED_PAGE).toBe('无标题页面');
    expect(untitledFor('topBar')).toBe(UNTITLED_PAGE);
  });

  it('uses 无标题文档 in the list and tag views', () => {
    expect(UNTITLED_DOCUMENT).toBe('无标题文档');
    expect(untitledFor('list')).toBe(UNTITLED_DOCUMENT);
  });

  it('names the collected keys', () => {
    expect(untitledKeyFor('topBar')).toBe('untitled.page');
    expect(untitledKeyFor('list')).toBe('untitled.document');
  });

  it('stores a new document under the list wording', () => {
    expect(NEW_DOCUMENT_TITLE).toBe('无标题文档');
  });
});
