import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  KANBAN_NO_GROUP_PROPERTY,
  KANBAN_NO_GROUP_PROPERTY_KEY,
  canGroupKanban,
} from './kanban-copy';

/**
 * The Kanban guard (G232). The sentence is compared against the ledger, and the view is checked
 * to actually consume it.
 */
const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('the Kanban guard sentence', () => {
  it('matches kanban_no_group_property in the ledger', () => {
    expect(ledgerValue(KANBAN_NO_GROUP_PROPERTY_KEY)).toBe(KANBAN_NO_GROUP_PROPERTY);
  });

  it('keeps the wording verbatim, including the trailing period', () => {
    expect(KANBAN_NO_GROUP_PROPERTY).toBe('添加一个支持的属性并按其分组以使用 Kanban 视图。');
  });

  it('lets only a select property group a board', () => {
    expect(canGroupKanban('select')).toBe(true);
    expect(canGroupKanban('text')).toBe(false);
    expect(canGroupKanban('number')).toBe(false);
  });
});
