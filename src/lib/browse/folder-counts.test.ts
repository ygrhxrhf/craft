import { describe, expect, it } from 'vitest';
import { folderDocumentCounts, type CountableDocument, type CountableFolder } from './folder-counts';
import { formatDocCount } from './official-copy';

const F = (id: string, parentId: string | null = null): CountableFolder => ({ id, parentId });
const D = (folderId: string | null, parentId: string | null = null): CountableDocument => ({
  folderId,
  parentId,
});

describe('folderDocumentCounts', () => {
  it('counts the documents directly inside a folder', () => {
    const counts = folderDocumentCounts([F('a')], [D('a'), D('a'), D('b')]);
    expect(counts.get('a')).toBe(2);
  });

  it('rolls subfolder documents up into the parent', () => {
    const counts = folderDocumentCounts(
      [F('root'), F('child', 'root'), F('grand', 'child')],
      [D('root'), D('child'), D('child'), D('grand')],
    );
    expect(counts.get('root')).toBe(4);
    expect(counts.get('child')).toBe(3);
    expect(counts.get('grand')).toBe(1);
  });

  it('reads 0 for an empty folder', () => {
    expect(folderDocumentCounts([F('a')], []).get('a')).toBe(0);
  });

  it('leaves subpages to their parent document instead of the folder', () => {
    const counts = folderDocumentCounts([F('a')], [D('a'), D('a', 'some-page')]);
    expect(counts.get('a')).toBe(1);
  });

  it('terminates when the folder tree contains a cycle', () => {
    const counts = folderDocumentCounts([F('a', 'b'), F('b', 'a')], [D('a'), D('b')]);
    // 环里谁先被遍历决定了谁能看到对方，两个方向不对称是预期内的；只要求收敛且不漏自身
    expect(counts.get('a')).toBeGreaterThanOrEqual(1);
    expect(counts.get('b')).toBeGreaterThanOrEqual(1);
  });
});

describe('document count badge copy', () => {
  it('uses the official singular line for one document', () => {
    const counts = folderDocumentCounts([F('a')], [D('a')]);
    expect(formatDocCount(counts.get('a') ?? 0)).toBe('1 个文档');
  });

  it('fills the plural slot otherwise', () => {
    const counts = folderDocumentCounts([F('a')], [D('a'), D('a'), D('a'), D('a'), D('a')]);
    expect(formatDocCount(counts.get('a') ?? 0)).toBe('5 个文档');
  });
});
