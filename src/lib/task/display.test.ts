import { describe, expect, it } from 'vitest';
import { listsTaskFromDocument } from './display';

describe('listsTaskFromDocument', () => {
  it('drops a task whose document is in the trash', () => {
    expect(listsTaskFromDocument('doc-1', { isDeleted: true })).toBe(false);
  });

  it('keeps a task whose document is live', () => {
    expect(listsTaskFromDocument('doc-1', { isDeleted: false })).toBe(true);
  });

  it('keeps an inbox task that belongs to no document', () => {
    expect(listsTaskFromDocument(null, null)).toBe(true);
  });

  it('keeps a task when the document row cannot be read', () => {
    expect(listsTaskFromDocument('doc-1', null)).toBe(true);
  });
});
