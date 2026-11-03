import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../components/document/TrashList.tsx', import.meta.url),
  'utf8',
);

/** G273：长回收站也走窗口渲染，行高固定、overscan 2、滚动 rAF + 150ms。 */
describe('the trash list virtualizes long lists (G273)', () => {
  it('uses the shared row-window helper with a fixed row height', () => {
    expect(source).toContain('visibleRowWindow({');
    expect(source).toContain('rowHeight: TRASH_ROW_HEIGHT');
    expect(source).toContain('overscan: 2');
    expect(source).toContain('TRASH_VIRTUAL_THRESHOLD = 60');
  });

  it('schedules scroll updates through the shared rAF + debounce helper', () => {
    expect(source).toContain('scheduleScrollUpdate(() => setScrollTop(top))');
  });

  it('renders spacer blocks and a fixed-height row', () => {
    expect(source).toContain('trashWindow.topPad');
    expect(source).toContain('trashWindow.bottomPad');
    expect(source).toContain('style={virtualized ? { height: TRASH_ROW_HEIGHT } : undefined}');
    expect(source).toContain('data-testid="trash-rows"');
  });
});
