import { describe, expect, it } from 'vitest';

import {
  EMPTY_DOCUMENT,
  SEPARATOR_MARK,
  SUBTITLE_PREVIEW_LENGTH,
  collectionSubtitle,
  flattenPreview,
  rowSubtitle,
  truncatePreview,
} from './row-subtitle';

/**
 * G248: the row's subtitle is a content-summary fallback chain — body preview, then 「空文档」, then
 * the separator mark. Order matters: an empty string must not read as a short preview.
 */
describe('the preview is flattened and cut', () => {
  it('collapses newlines and runs of spaces into single spaces', () => {
    expect(flattenPreview('a\n\nb   c')).toBe('a b c');
  });

  it('leaves a short preview alone', () => {
    expect(truncatePreview('短', 10)).toBe('短');
  });

  it('marks a long preview with an ellipsis at the limit', () => {
    const long = 'x'.repeat(SUBTITLE_PREVIEW_LENGTH + 5);
    const cut = truncatePreview(long);
    expect(cut).toBe(`${'x'.repeat(SUBTITLE_PREVIEW_LENGTH)}…`);
    expect(cut.length).toBe(SUBTITLE_PREVIEW_LENGTH + 1);
  });
});

describe('a collection shows its children', () => {
  it('joins names with the middle dot', () => {
    expect(collectionSubtitle(['Collection', 'Collection'])).toBe('Collection · Collection');
  });

  it('wins over the collection body text', () => {
    expect(rowSubtitle({ plainText: 'ignored', collectionChildNames: ['A'] })).toBe('A');
  });

  it('is ignored when the child list is empty', () => {
    expect(rowSubtitle({ plainText: 'body', collectionChildNames: [] })).toBe('body');
  });
});

describe('the fallback chain', () => {
  it('prefers the body preview', () => {
    expect(rowSubtitle({ plainText: '正文内容' })).toBe('正文内容');
  });

  it('falls to 「空文档」 when there is no text at all', () => {
    expect(rowSubtitle({ plainText: '' })).toBe(EMPTY_DOCUMENT);
    expect(rowSubtitle({ plainText: '   \n  ' })).toBe(EMPTY_DOCUMENT);
    expect(rowSubtitle({ plainText: null })).toBe(EMPTY_DOCUMENT);
    expect(rowSubtitle({})).toBe(EMPTY_DOCUMENT);
  });

  it('falls to the separator mark when the body is only a rule', () => {
    expect(rowSubtitle({ plainText: '/' })).toBe(SEPARATOR_MARK);
    expect(rowSubtitle({ plainText: '---' })).toBe(SEPARATOR_MARK);
    expect(rowSubtitle({ plainText: '***' })).toBe(SEPARATOR_MARK);
  });

  it('does not mistake a body that merely contains a slash for a separator', () => {
    expect(rowSubtitle({ plainText: 'a/b' })).toBe('a/b');
  });

  it('keeps the collected empty sentence verbatim', () => {
    expect(EMPTY_DOCUMENT).toBe('空文档');
  });
});
