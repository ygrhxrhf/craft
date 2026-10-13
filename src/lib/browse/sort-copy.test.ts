import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  SORT_BY_KEY,
  SORT_BY_LABEL,
  SORT_DIMENSION_KEYS,
  SORT_DIMENSION_LABELS,
  SORT_DIRECTION_KEYS,
  SORT_DIRECTION_LABELS,
} from './sort-copy';

/**
 * Ledger-as-source: every string is compared against the value the catalog holds for its key, so
 * a mistranscription is caught by the ledger rather than by a second hand-typed copy.
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

describe('the sort menu copy is the collected official text', () => {
  it.each(Object.entries(SORT_DIMENSION_KEYS))('%s matches %s', (dimension, key) => {
    expect(ledgerValue(key)).toBe(SORT_DIMENSION_LABELS[dimension as keyof typeof SORT_DIMENSION_LABELS]);
  });

  it.each(Object.entries(SORT_DIRECTION_KEYS))('%s matches %s', (direction, key) => {
    expect(ledgerValue(key)).toBe(SORT_DIRECTION_LABELS[direction as keyof typeof SORT_DIRECTION_LABELS]);
  });

  it('the menu title matches browse.sort.by', () => {
    expect(ledgerValue(SORT_BY_KEY)).toBe(SORT_BY_LABEL);
  });

  it('reads a missing key as null', () => {
    expect(ledgerValue('browse.sort.definitely.not.a.key')).toBeNull();
  });
});
