import { describe, expect, it } from 'vitest';

import {
  FOLDER_PIN_COPY,
  FOLDER_PIN_LIMIT,
  isFolderPinned,
  parsePinnedDocumentIds,
  pinnedIdsFor,
} from './pinned-doc';

/** G338：官方 `folder_set_pinned` 的字段形状——数组，但只放 0 或 1 个。 */
describe('the folder pinned-doc slot (G338)', () => {
  it('writes the official array shapes', () => {
    expect(pinnedIdsFor('doc-1')).toEqual(['doc-1']);
    expect(pinnedIdsFor(null)).toEqual([]);
    expect(FOLDER_PIN_LIMIT).toBe(1);
  });

  it('reads back a parsed array', () => {
    expect(parsePinnedDocumentIds(['doc-1'])).toEqual(['doc-1']);
    expect(parsePinnedDocumentIds([])).toEqual([]);
  });

  it('reads back the raw JSON text a json column can hand over', () => {
    expect(parsePinnedDocumentIds('["doc-1"]')).toEqual(['doc-1']);
    expect(parsePinnedDocumentIds('[]')).toEqual([]);
  });

  it('keeps at most one id, because the official field is single-select', () => {
    expect(parsePinnedDocumentIds(['a', 'b', 'c'])).toEqual(['a']);
  });

  it('treats anything unrecognisable as "nothing pinned"', () => {
    expect(parsePinnedDocumentIds(null)).toEqual([]);
    expect(parsePinnedDocumentIds(undefined)).toEqual([]);
    expect(parsePinnedDocumentIds('not json')).toEqual([]);
    expect(parsePinnedDocumentIds({ 0: 'a' })).toEqual([]);
    expect(parsePinnedDocumentIds(['', '  ', 7, 'ok'])).toEqual(['ok']);
  });

  it('answers the "is this the pinned one" question from either shape', () => {
    expect(isFolderPinned(['doc-1'], 'doc-1')).toBe(true);
    expect(isFolderPinned('["doc-1"]', 'doc-2')).toBe(false);
    expect(isFolderPinned([], 'doc-1')).toBe(false);
  });

  it('carries the harvested official copy verbatim', () => {
    expect(FOLDER_PIN_COPY.dropHereToPin.key).toBe('browse.drop.here.to.pin.document');
    expect(FOLDER_PIN_COPY.dropHereToPin.label).toBe('拖放到此处以固定文档');
    expect(FOLDER_PIN_COPY.pinnedDoc.label).toBe('固定文档');
    expect(FOLDER_PIN_COPY.unpin.label).toBe('取消固定');
  });
});
