import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  TRASH_DISCLAIMER,
  TRASH_DISCLAIMER_KEY,
  TRASH_EMPTY,
  TRASH_EMPTY_KEY,
} from './trash-copy';

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

describe('the trash copy is the collected official text', () => {
  it('the empty state matches browse.doc.you.deleted.will.appear.here', () => {
    expect(ledgerValue(TRASH_EMPTY_KEY)).toBe(TRASH_EMPTY);
  });

  it('the disclaimer matches browse.trash.disclaimer', () => {
    expect(ledgerValue(TRASH_DISCLAIMER_KEY)).toBe(TRASH_DISCLAIMER);
  });

  it('reads a missing key as null', () => {
    expect(ledgerValue('browse.trash.definitely.not.a.key')).toBeNull();
  });
});
