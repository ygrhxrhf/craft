import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const list = readFileSync(
  new URL('../../components/browse/TagTreeList.tsx', import.meta.url),
  'utf8',
);
const page = readFileSync(new URL('../../app/(app)/tags/page.tsx', import.meta.url), 'utf8');
const tables = readFileSync(new URL('../sync/tables.ts', import.meta.url), 'utf8');

/** G94 `tag_reorder`：拖顶层标签，整批写 0…n-1 到 `tag.order`。 */
describe('the tag reorder wiring (G94)', () => {
  it('writes one batch of order patches through the sync kernel', () => {
    expect(list).toContain("applyLocal({ table: 'tag'");
    expect(list).toContain('orderPatches(next.map((group) => group.id))');
    expect(list).toContain('orderAfterDrop(');
  });

  it('pins and unpins a tag through the same table', () => {
    expect(list).toContain("patch: { pinned: !group.pinned }");
    // G173：按钮文案换成官方成对句「固定标签 / 取消固定标签」。
    expect(list).toContain('pinToggleLabel(Boolean(group.pinned)).label');
  });

  it('renders the tree through the client list', () => {
    expect(page).toContain('<TagTreeList groups={tree.groups} />');
  });

  it('keeps the order column in the tag sync whitelist', () => {
    expect(tables).toContain("'color','order','pinned','userId'");
  });
});
