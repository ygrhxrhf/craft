import { describe, expect, it } from 'vitest';
import { buildLibraryArchive } from './library-archive';

const paragraph = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const rows = [
  { id: 'root', title: '根页', parentId: null, content: paragraph('根正文') },
  { id: 'a', title: '子页 A', parentId: 'root', content: paragraph('A 正文') },
  { id: 'a1', title: '孙页', parentId: 'a', content: paragraph('孙正文') },
  { id: 'solo', title: '独立页', parentId: null, content: paragraph('独立正文') },
  { id: 'gone', title: '已删', parentId: null, content: paragraph('删掉'), isDeleted: true },
];

describe('library archive projection (G53)', () => {
  it('writes one file per top-level page and folds subpages into it', async () => {
    const zip = buildLibraryArchive(rows);
    const names = Object.keys(zip.files);
    expect(names).toHaveLength(2);
    expect(names.some((name) => name.startsWith('根页-'))).toBe(true);
    expect(names.some((name) => name.startsWith('独立页-'))).toBe(true);

    const rootFile = names.find((name) => name.startsWith('根页-'))!;
    const markdown = await zip.file(rootFile)!.async('string');
    expect(markdown).toContain('根正文');
    expect(markdown).toContain('## 子页 A');
    expect(markdown).toContain('## 孙页');
    expect(markdown).toContain('孙正文');
  });

  it('skips deleted documents and falls back to a README when empty', async () => {
    const zip = buildLibraryArchive([rows[4]!]);
    expect(Object.keys(zip.files)).toEqual(['README.md']);
  });
});
