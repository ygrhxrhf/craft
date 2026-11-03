import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const menu = readFileSync(
  join(process.cwd(), 'src/components/editor/drag-handle/DragHandle.tsx'),
  'utf8',
);

/** G1470/G1467：块菜单逐项图标＋aria-label，且内容超出时滚动而不是裁高度。 */
describe('the block menu chrome (G1470 / G1467)', () => {
  it('gives every entry an icon and an accessible name', () => {
    expect(menu).toContain('const BLOCK_ACTION_ICONS');
    expect(menu).toContain('function BlockActionIcon');
    expect(menu).toContain('aria-label={item.label}');
    expect(menu).toContain('<BlockActionIcon id={item.id} />');
  });

  it('scrolls instead of cropping when the list is long', () => {
    expect(menu).toContain('className="max-h-[70vh] overflow-y-auto"');
  });
});
