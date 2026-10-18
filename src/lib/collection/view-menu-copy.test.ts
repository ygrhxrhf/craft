import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DELETE_VIEW, DELETE_VIEW_KEY } from './view-menu-copy';

/**
 * Ledger-as-source（与 `src/lib/tag/official-copy.test.ts` 同一手法）：`feature-catalog.md` 把每个 key
 * 记成 `- 中文串 \`key\`  _English_`，断言从收集到的原文读回，而不是再手打一遍。
 */
const catalog = readFileSync(
  join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'),
  'utf8',
);

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

const PAIRS: [string, string][] = [[DELETE_VIEW_KEY, DELETE_VIEW]];

describe('the collection view menu copy is the collected official text (G1538)', () => {
  it.each(PAIRS)('%s matches the ledger', (key, local) => {
    expect(ledgerValue(key)).toBe(local);
  });

  it('declares the delete entry only — rename/reorder are a different gap', () => {
    expect(PAIRS.map(([key]) => key)).toEqual(['collections.delete.view']);
  });
});
