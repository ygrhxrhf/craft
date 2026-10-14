import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ALL_TAGS,
  ALL_TAGS_KEY,
  DOC_COUNT_MANY,
  DOC_COUNT_MANY_KEY,
  DOC_COUNT_ONE,
  DOC_COUNT_ONE_KEY,
  FOLDER_EMPTY,
  FOLDER_EMPTY_KEY,
  formatDocCount,
  formatTagCount,
  NO_DOCS_FOUND,
  NO_DOCS_FOUND_KEY,
  GET_CRAFT_PLUS,
  GET_CRAFT_PLUS_KEY,
  INBOX_DESC,
  INBOX_DESC_KEY,
  INBOX_EMPTY,
  INBOX_EMPTY_KEY,
  LOADING,
  LOADING_KEY,
  MOVE_TO,
  MOVE_TO_KEY,
  NO_DOCUMENTS,
  NO_DOCUMENTS_KEY,
  SIDEBAR_INBOX,
  SIDEBAR_INBOX_KEY,
  STARRED_EMPTY,
  STARRED_PRIVACY,
  STARRED_PRIVACY_KEY,
  TAGS_TITLE,
  TAGS_TITLE_KEY,
  TAG_COUNT_MANY,
  TAG_COUNT_MANY_KEY,
  STARRED_EMPTY_KEY,
  TAGS_EMPTY,
  TAGS_EMPTY_KEY,
  UNSORTED_TITLE,
  UNSORTED_TITLE_KEY,
} from './official-copy';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

const PAIRS: [string, string][] = [
  [DOC_COUNT_ONE_KEY, DOC_COUNT_ONE],
  [DOC_COUNT_MANY_KEY, DOC_COUNT_MANY],
  [FOLDER_EMPTY_KEY, FOLDER_EMPTY],
  [STARRED_EMPTY_KEY, STARRED_EMPTY],
  [STARRED_PRIVACY_KEY, STARRED_PRIVACY],
  [SIDEBAR_INBOX_KEY, SIDEBAR_INBOX],
  [NO_DOCUMENTS_KEY, NO_DOCUMENTS],
  [TAGS_EMPTY_KEY, TAGS_EMPTY],
  [GET_CRAFT_PLUS_KEY, GET_CRAFT_PLUS],
  [UNSORTED_TITLE_KEY, UNSORTED_TITLE],
  [INBOX_DESC_KEY, INBOX_DESC],
  [INBOX_EMPTY_KEY, INBOX_EMPTY],
  [MOVE_TO_KEY, MOVE_TO],
  [LOADING_KEY, LOADING],
  [TAGS_TITLE_KEY, TAGS_TITLE],
  [ALL_TAGS_KEY, ALL_TAGS],
  [TAG_COUNT_MANY_KEY, TAG_COUNT_MANY],
  [NO_DOCS_FOUND_KEY, NO_DOCS_FOUND],
];

describe('browse copy is the collected official text', () => {
  it.each(PAIRS)('%s matches the ledger', (key, local) => {
    expect(ledgerValue(key)).toBe(local);
  });

  it('reads a missing key as null instead of some other line', () => {
    expect(ledgerValue('browse.definitely.not.a.key')).toBeNull();
  });
});

describe('formatDocCount', () => {
  it('uses the singular line for exactly one and the slotted line otherwise', () => {
    expect(formatDocCount(1)).toBe('1 个文档');
    expect(formatDocCount(0)).toBe('0 个文档');
    expect(formatDocCount(5)).toBe('5 个文档');
  });
});

describe('formatTagCount', () => {
  it('has no singular line in the ledger, so 1 fills the slot too', () => {
    expect(formatTagCount(1)).toBe('1 个标签');
    expect(formatTagCount(12)).toBe('12 个标签');
  });
});
