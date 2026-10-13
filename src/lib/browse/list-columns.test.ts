import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  COLUMN_WIDTH_FALLBACK,
  COLUMN_WIDTH_VARS,
  LIST_COLUMN_CLASSES,
  LIST_COLUMN_KEYS,
  LIST_COLUMN_LABELS,
  LIST_HEADER_TYPOGRAPHY,
  LIST_TITLE_TYPOGRAPHY,
  LIST_CELL_TYPOGRAPHY,
  columnWidthValue,
} from './list-columns';

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

describe('the list headers are the collected official text', () => {
  it.each(Object.entries(LIST_COLUMN_KEYS))('%s matches %s', (column, key) => {
    expect(ledgerValue(key)).toBe(LIST_COLUMN_LABELS[column as keyof typeof LIST_COLUMN_LABELS]);
  });

  it('uses the bare keys the build uses, not the browse.sort twins', () => {
    // The official code reads `name`/`updated`/`created` while `browse.sort.name` and friends
    // hold the same text — the bare key is what the header actually renders (G1115).
    expect(LIST_COLUMN_KEYS.name).toBe('name');
    expect(LIST_COLUMN_KEYS.updated).toBe('updated');
    expect(LIST_COLUMN_KEYS.created).toBe('created');
    expect(LIST_COLUMN_KEYS.lastViewed).toBe('browse.sort.last.viewed');
  });
});

describe('the three data columns are slots, not identities', () => {
  it('names the slots by position, the way the class table does', () => {
    expect(Object.values(LIST_COLUMN_CLASSES)).toEqual([
      'app-col-last-viewed',
      'app-col-updated',
      'app-col-created',
    ]);
  });

  it('gives each slot its own width variable', () => {
    expect(Object.values(COLUMN_WIDTH_VARS)).toEqual([
      '--col-last-viewed-width',
      '--col-updated-width',
      '--col-created-width',
    ]);
    expect(COLUMN_WIDTH_FALLBACK).toBe('8rem');
  });

  it('writes a hidden column as 0px so the fallback never fires', () => {
    expect(columnWidthValue(0)).toBe('0px');
    expect(columnWidthValue(112.4)).toBe('112px');
  });
});

describe('the list typography classes are the four real consumers', () => {
  it('pins header, title and cell to the collected class names', () => {
    expect(LIST_HEADER_TYPOGRAPHY).toBe('typography-caption-md-500');
    expect(LIST_TITLE_TYPOGRAPHY).toBe('typography-ui-md-600');
    expect(LIST_CELL_TYPOGRAPHY).toBe('typography-ui-sm-500');
  });
});
