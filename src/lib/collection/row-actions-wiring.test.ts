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
    expect(table).toContain('aria-label="导航至区块"');
    expect(table).toContain('/documents/${item.documentId}');
  });

  it('moves the row out through the membership action', () => {
    expect(table).toContain('removeItemFromCollection');
    expect(table).toContain('aria-label="移出行（测试版）"');
  });
});
