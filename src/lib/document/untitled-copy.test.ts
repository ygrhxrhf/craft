import { describe, expect, it } from 'vitest';

import {
  NEW_DOCUMENT_TITLE,
  UNTITLED_BY_ENTITY,
  UNTITLED_DOCUMENT,
  UNTITLED_FOLDER,
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

describe('the four entities each have their own sentence (G231)', () => {
  it('gives page, document and folder distinct labels', () => {
    expect(UNTITLED_BY_ENTITY.page.label).toBe('无标题页面');
    expect(UNTITLED_BY_ENTITY.document.label).toBe('无标题文档');
    expect(UNTITLED_BY_ENTITY.folder.label).toBe('无标题文件夹');
  });

  it('names each key', () => {
    expect(UNTITLED_BY_ENTITY.page.key).toBe('untitled.page');
    expect(UNTITLED_BY_ENTITY.document.key).toBe('untitled.document');
    expect(UNTITLED_BY_ENTITY.folder.key).toBe('untitled.folder');
  });

  it('keeps the folder label verbatim', () => {
    expect(UNTITLED_FOLDER).toBe('无标题文件夹');
  });
});
