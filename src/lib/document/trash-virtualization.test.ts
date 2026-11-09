import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../components/document/TrashList.tsx', import.meta.url),
  'utf8',
);

/** G273：长回收站也走窗口渲染，行高固定、overscan 2、滚动 rAF + 150ms。 */
describe('the trash list virtualizes long lists (G273)', () => {
  it('uses the shared row-window helper with a fixed row step', () => {
    expect(source).toContain('visibleRowWindow({');
    expect(source).toContain('rowHeight: TRASH_ROW_STEP');
    expect(source).toContain('overscan: 2');
    expect(source).toContain('TRASH_VIRTUAL_THRESHOLD = 60');
  });

  it('schedules scroll updates through the shared rAF + debounce helper', () => {
    expect(source).toContain('scheduleScrollUpdate(() => setScrollTop(top))');
  });

  it('renders spacer blocks and rows whose height plus gap match the step', () => {
    expect(source).toContain('trashWindow.topPad');
    expect(source).toContain('trashWindow.bottomPad');
    expect(source).toContain('data-testid="trash-rows"');
    // 行高 40（h-10）+ 间距 2（gap-0.5）= 步长 42，虚拟窗口的占位高度按步长算
    expect(source).toContain('const TRASH_ROW_STEP = 42');
    expect(source).toMatch(/className="flex h-10 items-center gap-3 rounded-md px-2/);
    expect(source).toContain('flex flex-col gap-0.5');
  });
});
