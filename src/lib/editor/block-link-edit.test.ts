import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const view = readFileSync(
  join(process.cwd(), 'src/components/editor/extensions/block-link-view.tsx'),
  'utf8',
);

/** G453：区块链接的编辑通路（改名 / 移除）。存储形态仍刻意用活引用，见 gap.md。 */
describe('editing an inserted block link (G453)', () => {
  it('renames through updateAttributes and removes through deleteNode', () => {
    expect(view).toContain('data-testid="block-link-edit"');
    expect(view).toContain('updateAttributes({ title: draft.trim() || title })');
    expect(view).toContain('deleteNode()');
  });

  it('closes on Enter/Escape without escaping the node', () => {
    expect(view).toContain("if (event.key === 'Enter')");
    expect(view).toContain("if (event.key === 'Escape')");
    expect(view).toContain('event.stopPropagation();');
  });
});
