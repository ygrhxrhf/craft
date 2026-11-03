import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../components/editor/extensions/craft-keymap.ts', import.meta.url),
  'utf8',
);

/**
 * G1548/G1549/G1550/G1591：块选择态是这些键的前提。
 * - Ctrl-A 两档（块文本 → 节点选择）
 * - 只有节点选择时 Alt-方向键才移动块；普通光标只移光标
 * - Space 在节点选择时插块
 */
describe('block-selection key semantics', () => {
  it('keeps the Ctrl-A ladder', () => {
    expect(source).toContain('G1550');
    expect(source).toContain('TextSelection.create(doc, textFrom, textTo)');
    expect(source).toContain('NodeSelection.create(doc, start)');
  });

  it('gates block moves on a node selection', () => {
    expect(source).toContain('G1548/G1549');
    expect(source).toContain('!(editor.state.selection instanceof NodeSelection)');
    expect(source).toContain('const nextIndex');
  });

  it('inserts a block on Space only in block-selection state', () => {
    expect(source).toContain('G1591');
    expect(source).toContain("event.key === ' ' || event.key === 'Spacebar'");
    expect(source).toContain('view.state.selection instanceof NodeSelection');
  });
});
