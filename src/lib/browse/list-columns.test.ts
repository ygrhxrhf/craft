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
  SHARED_COLUMN_WIDTH_VARS,
  SHARED_LIST_COLUMN_CLASSES,
  SHARED_LIST_COLUMN_KEYS,
  SHARED_LIST_COLUMN_LABELS,
  SHARED_LIST_COLUMNS,
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
    // The official container carries all three at 112px inline; a different fallback would be
    // measured and frozen at that other number (G246).
    expect(COLUMN_WIDTH_FALLBACK).toBe('112px');
  });

  it('keeps the view\'s literal fallbacks in step with the constant', () => {
    // Tailwind's JIT cannot see a class built from a variable, so `w-[var(--col-…,112px)]` has to
    // stay a literal in the view — which means the constant and the literals can drift apart
    // silently. Pin them together. The literals now live in one map (`WIDTH_CLASSES`), and both
    // the header and the row resolve through it, so there is one literal per slot variable.
    const source = readFileSync(
      join(process.cwd(), 'src/components/document/DocumentListView.tsx'),
      'utf8',
    );
    const literals = source.match(/w-\[var\((--col-[a-z-]+width),(\d+px)\)\]/g) ?? [];
    expect(
      literals.map((literal) => literal.match(/--col-[a-z-]+width/)?.[0]).sort(),
    ).toEqual([...Object.values(COLUMN_WIDTH_VARS)].sort());
    for (const literal of literals) {
      expect(literal).toContain(`,${COLUMN_WIDTH_FALLBACK})`);
    }
  });

  it('writes a hidden column as 0px so the fallback never fires', () => {
    expect(columnWidthValue(0)).toBe('0px');
    expect(columnWidthValue(112.4)).toBe('112px');
  });
});

describe('variant C: the 与我共享 list reuses the same slots', () => {
  it('renders 名称/共享/共享者/上次浏览 from the collected keys', () => {
    expect(SHARED_LIST_COLUMNS).toEqual(['name', 'shared', 'sharedBy', 'lastViewed']);
    for (const column of SHARED_LIST_COLUMNS) {
      expect(ledgerValue(SHARED_LIST_COLUMN_KEYS[column])).toBe(
        SHARED_LIST_COLUMN_LABELS[column],
      );
    }
    // The variant's own bare `name`, and the two shared-screen keys the catalog holds.
    expect(SHARED_LIST_COLUMN_KEYS.name).toBe('name');
    expect(SHARED_LIST_COLUMN_KEYS.shared).toBe('shared');
    expect(SHARED_LIST_COLUMN_KEYS.sharedBy).toBe('shared.by');
    expect(SHARED_LIST_COLUMN_KEYS.lastViewed).toBe('browse.sort.last.viewed');
  });

  it('hangs colLastViewed on the 共享 column — classes follow position, not content', () => {
    // G1115: the official header passes `rn.colLastViewed` for the 共享 column.
    expect(SHARED_LIST_COLUMN_CLASSES.shared).toBe('app-col-last-viewed');
    expect(SHARED_LIST_COLUMN_CLASSES.sharedBy).toBe('app-col-updated');
    expect(SHARED_LIST_COLUMN_CLASSES.lastViewed).toBe('app-col-created');
    expect(SHARED_COLUMN_WIDTH_VARS.shared).toBe('--col-last-viewed-width');
    expect(SHARED_COLUMN_WIDTH_VARS.sharedBy).toBe('--col-updated-width');
    expect(SHARED_COLUMN_WIDTH_VARS.lastViewed).toBe('--col-created-width');
  });
});

describe('the list typography classes are the four real consumers', () => {
  it('pins header, title and cell to the collected class names', () => {
    expect(LIST_HEADER_TYPOGRAPHY).toBe('typography-caption-md-500');
    expect(LIST_TITLE_TYPOGRAPHY).toBe('typography-ui-md-600');
    expect(LIST_CELL_TYPOGRAPHY).toBe('typography-ui-sm-500');
  });
});
