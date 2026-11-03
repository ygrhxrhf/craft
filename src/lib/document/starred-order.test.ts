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
    expect(read('app/(app)/favorites/page.tsx')).toContain('<StarredGrid documents={favoriteDocs} />');
    expect(read('actions/document/get.ts')).toContain('favoriteId: String(');
  });
});
