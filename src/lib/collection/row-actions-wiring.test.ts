import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G289: the collection row can be opened and moved out (membership only, not deletion). */
describe('collection row actions (G289)', () => {
  const table = readFileSync(
    join(process.cwd(), 'src', 'app', '(app)', 'collections', '[id]', 'TableView.tsx'),
    'utf8',
  );

  it('opens the row document when it has one', () => {
    // G677 changed the label: every row now opens a page, creating one when absent.
    expect(table).toContain('aria-label="打开页面"');
    expect(table).toContain('/documents/${item.documentId}');
    expect(table).toContain('const openRowPage = async');
  });

  it('moves the row out through the membership action', () => {
    expect(table).toContain('removeItemFromCollection');
    expect(table).toContain('aria-label="移出行（测试版）"');
  });
});
