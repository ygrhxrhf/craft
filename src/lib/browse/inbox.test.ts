import { describe, expect, it } from 'vitest';
import { folderOptions, unsortedDocuments, type FolderLike, type LocatableDocument } from './inbox';

const DOC = (
  id: string,
  over: Partial<LocatableDocument> = {}
): LocatableDocument => ({
  id,
  parentId: null,
  folderId: null,
  isDeleted: false,
  isDailyNote: false,
  order: 0,
  ...over,
});

const FOLDER = (id: string, over: Partial<FolderLike> = {}): FolderLike => ({
  id,
  name: id,
  parentId: null,
  order: 0,
  isDeleted: false,
  ...over,
});

describe('unsortedDocuments', () => {
  it('keeps only documents that sit in no folder and no page', () => {
    const rows = [DOC('a'), DOC('b', { folderId: 'f1' }), DOC('c', { parentId: 'p1' })];
    expect(unsortedDocuments(rows).map((d) => d.id)).toEqual(['a']);
  });

  it('leaves trashed documents and daily notes out', () => {
    const rows = [DOC('a', { isDeleted: true }), DOC('b', { isDailyNote: true })];
    expect(unsortedDocuments(rows)).toEqual([]);
  });

  it('orders by the stored sidebar order', () => {
    const rows = [DOC('a', { order: 2 }), DOC('b', { order: 1 })];
    expect(unsortedDocuments(rows).map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('folderOptions', () => {
  it('lists the tree depth-first in sidebar order', () => {
    const options = folderOptions([
      FOLDER('work', { order: 1 }),
      FOLDER('root', { order: 0 }),
      FOLDER('deep', { parentId: 'work', order: 0 }),
    ]);
    expect(options).toEqual([
      { id: 'root', name: 'root', depth: 0 },
      { id: 'work', name: 'work', depth: 0 },
      { id: 'deep', name: 'deep', depth: 1 },
    ]);
  });

  it('drops deleted folders', () => {
    expect(folderOptions([FOLDER('gone', { isDeleted: true })])).toEqual([]);
  });

  it('terminates on a folder cycle', () => {
    const options = folderOptions([FOLDER('a', { parentId: 'b' }), FOLDER('b', { parentId: 'a' })]);
    // Neither is a root, so both surface as orphans rather than looping the walk forever.
    expect(options.map((o) => o.id).sort()).toEqual(['a', 'b']);
  });
});
