import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/** G94：收藏区有自己的整批顺序，拖拽写 favorite.order（0…n-1）。 */
describe('the starred area keeps its own order (G94)', () => {
  const grid = read('components/document/StarredGrid.tsx');

  it('writes the whole favorite order through the batch patches', () => {
    expect(grid).toContain("orderPatches(next.map((doc) => doc.favoriteId))");
    expect(grid).toContain("table: 'favorite'");
    expect(grid).toContain("patch: { order: patch.order }");
    expect(grid).toContain('await manager.flushNow()');
  });

  it('drops before/after by the card midpoint, like the sidebar tree', () => {
    expect(grid).toContain("after ? 'after' : 'before'");
    expect(grid).toContain('data-testid={`starred-card-');
  });

  it('is mounted on the favorites page with favoriteId in the payload', () => {
    // G216：页面在挂载前给每行补签名预览 URL（spread 保留 favoriteId）。
    const page = read('app/(app)/favorites/page.tsx');
    expect(page).toContain('<StarredGrid');
    expect(page).toContain('documents={favoriteDocs.map((doc) => ({ ...doc, previewSrc: buildPreviewSrc(doc) }))}');
    // 卡片副行的时钟基准在服务端取一次，避免 SSR/hydration 各取一次撞 Hydration failed。
    expect(page).toContain('now={requestNow()}');
    expect(read('actions/document/get.ts')).toContain('favoriteId: String(');
  });
});
