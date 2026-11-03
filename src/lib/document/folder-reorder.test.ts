import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const item = readFileSync(
  join(process.cwd(), 'src/components/sidebar/FolderTreeItem.tsx'),
  'utf8',
);

/** G607/G338：文件夹同层重排按整批顺序落库，与文档树同一口径。 */
describe('folder reorder writes the whole order (G607)', () => {
  it('uses the shared batch helpers against the folder table', () => {
    expect(item).toContain('orderAfterDrop(');
    expect(item).toContain('orderPatches(ids)');
    expect(item).toContain("table: 'folder'");
    expect(item).toContain('patch: { parentId: folder.parentId, order: patch.order }');
  });

  it('no longer computes a midpoint for the dragged row', () => {
    expect(item).not.toContain('(folder.order + siblings[idx + 1].order) / 2');
    expect(item).not.toContain('(siblings[idx - 1].order + folder.order) / 2');
  });
});
