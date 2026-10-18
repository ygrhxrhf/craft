import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DELETE_FIELD_DESC,
  DELETE_FIELD_DESC_KEY,
  EDIT_FIELD,
  EDIT_FIELD_KEY,
  FIELD_NAME,
  FIELD_NAME_KEY,
  HIDE_FIELDS,
  HIDE_FIELDS_KEY,
  HIDE_ORDER_FIELDS,
  HIDE_ORDER_FIELDS_KEY,
  ONE_HIDDEN_FIELD,
  ONE_HIDDEN_FIELD_KEY,
  SHOW_HIDE_FIELDS,
  SHOW_HIDE_FIELDS_KEY,
  X_HIDDEN_FIELDS,
  X_HIDDEN_FIELDS_KEY,
  formatHiddenFields,
} from './field-menu-copy';

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

const PAIRS: [string, string][] = [
  [EDIT_FIELD_KEY, EDIT_FIELD],
  [FIELD_NAME_KEY, FIELD_NAME],
  [HIDE_FIELDS_KEY, HIDE_FIELDS],
  [SHOW_HIDE_FIELDS_KEY, SHOW_HIDE_FIELDS],
  [HIDE_ORDER_FIELDS_KEY, HIDE_ORDER_FIELDS],
  [DELETE_FIELD_DESC_KEY, DELETE_FIELD_DESC],
  [ONE_HIDDEN_FIELD_KEY, ONE_HIDDEN_FIELD],
  [X_HIDDEN_FIELDS_KEY, X_HIDDEN_FIELDS],
];

describe('the collection field menu copy is the collected official text (G1537)', () => {
  it.each(PAIRS)('%s matches the ledger', (key, local) => {
    expect(ledgerValue(key)).toBe(local);
  });

  it('declares each key once', () => {
    expect(PAIRS.length).toBe(8);
    expect(new Set(PAIRS.map(([key]) => key)).size).toBe(8);
  });

  it('switches singular/plural the way the ledger keeps two keys', () => {
    expect(formatHiddenFields(1)).toBe('1 个隐藏字段');
    expect(formatHiddenFields(3)).toBe('3 隐藏字段');
  });
});
