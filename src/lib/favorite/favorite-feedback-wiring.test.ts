import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * G1446 —— 反馈是收藏这条动作的契约，不是某一个面板的装饰。官方每处换星都
 * `flashMessage(info, 1500)`，所以本地每个能点星的面都必须走同一个出口
 * （`components/ui/favorite-feedback`），否则同一个动作在四个地方三种回显。
 *
 * 这条闸读承载面本身：某处新写一条 `toggleFavoriteLocal(` 而没接反馈，这里就红。
 * 断言的是**调用行**而不是出现次数——只看标识符会被 `import` 那一行骗过。
 */
const STAR_SURFACES = [
  'src/components/editor/tabs/InfoTab.tsx',
  'src/components/sidebar/DocumentTreeItem.tsx',
  'src/components/document/DocumentCardMenu.tsx',
  'src/components/document/SortableDocGrid.tsx',
] as const;

const CALLS_FAVORITE_FEEDBACK = /^\s*showFavoriteFeedback\(/m;

describe('every star surface reports the toggle (G1446)', () => {
  it.each(STAR_SURFACES)('%s calls showFavoriteFeedback', (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
    expect(source).toContain('toggleFavoriteLocal(');
    expect(source).toMatch(CALLS_FAVORITE_FEEDBACK);
  });

  it('keeps pinning out of it, because pinning is not starring', () => {
    // TasksView 借 `favorite` 行存固定区的顺序；那里用户看到的是「固定/取消固定」，
    // 官方对应动作也没有收藏 toast，所以它只调写路径、不调反馈。
    const tasksView = readFileSync(
      join(process.cwd(), 'src/app/(app)/tasks/TasksView.tsx'),
      'utf8',
    );
    expect(tasksView).toContain('toggleFavoriteLocal(');
    expect(tasksView).not.toMatch(CALLS_FAVORITE_FEEDBACK);
  });
});
