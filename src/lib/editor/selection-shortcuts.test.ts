import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G1578 / G1581: comment-on-selection and equation-on-selection shortcuts. */
describe('selection shortcuts (G1578/G1581)', () => {
  const keymap = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'craft-keymap.ts'),
    'utf8',
  );

  it('opens the comment composer for Ctrl-Shift-M', () => {
    expect(keymap).toContain('useCommentRequestStore.getState().ask');
    expect(keymap).toContain("useRightPanelStore.getState().open('info')");
    expect(keymap).toMatch(/event\.shiftKey[\s\S]{0,400}selected\.slice/);
  });

  it('turns the selection into an inline equation for Ctrl-Shift-E', () => {
    expect(keymap).toContain('setInlineMath');
    expect(keymap).toContain('输入方程');
  });
});
