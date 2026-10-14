import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONTINUE_TYPING,
  CONTINUE_TYPING_KEY,
  CONTINUE_TYPING_VALID,
  CONTINUE_TYPING_VALID_KEY,
  DELIMITER_KEY,
  DELIMITER_RULE,
  EMOJI_KEY,
  EMOJI_RULE,
  ENTERED_CURRENT_TAG,
  ENTERED_CURRENT_TAG_KEY,
  ENTERED_INVALID_TAG,
  ENTERED_INVALID_TAG_KEY,
  ENTER_VALID_TAG,
  ENTER_VALID_TAG_KEY,
  HEX_COLOR_DESC,
  HEX_COLOR_DESC_KEY,
  HEX_COLOR_TITLE,
  HEX_COLOR_TITLE_KEY,
  INVALID_TAG_X,
  INVALID_TAG_X_KEY,
  NUMBERS_DESC,
  NUMBERS_DESC_KEY,
  NUMBERS_TITLE,
  NUMBERS_TITLE_KEY,
  ONLY_ONE_CHILD,
  ONLY_ONE_CHILD_KEY,
  SPACE_AND_PUNCTUATION,
  SPACE_AND_PUNCTUATION_KEY,
  TAG_IS_VALID,
  TAG_IS_VALID_KEY,
  formatInvalidTag,
} from './official-copy';

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
  [ENTER_VALID_TAG_KEY, ENTER_VALID_TAG],
  [SPACE_AND_PUNCTUATION_KEY, SPACE_AND_PUNCTUATION],
  [EMOJI_KEY, EMOJI_RULE],
  [DELIMITER_KEY, DELIMITER_RULE],
  [ONLY_ONE_CHILD_KEY, ONLY_ONE_CHILD],
  [NUMBERS_TITLE_KEY, NUMBERS_TITLE],
  [NUMBERS_DESC_KEY, NUMBERS_DESC],
  [HEX_COLOR_TITLE_KEY, HEX_COLOR_TITLE],
  [HEX_COLOR_DESC_KEY, HEX_COLOR_DESC],
  [TAG_IS_VALID_KEY, TAG_IS_VALID],
  [INVALID_TAG_X_KEY, INVALID_TAG_X],
  [ENTERED_CURRENT_TAG_KEY, ENTERED_CURRENT_TAG],
  [ENTERED_INVALID_TAG_KEY, ENTERED_INVALID_TAG],
  [CONTINUE_TYPING_VALID_KEY, CONTINUE_TYPING_VALID],
  [CONTINUE_TYPING_KEY, CONTINUE_TYPING],
];

describe('tag copy is the collected official text', () => {
  it.each(PAIRS)('%s matches the ledger', (key, local) => {
    expect(ledgerValue(key)).toBe(local);
  });

  it('covers all twelve rule/feedback keys from tags-browse.md §二', () => {
    expect(PAIRS.length).toBe(15);
    expect(new Set(PAIRS.map(([key]) => key)).size).toBe(15);
  });

  it('fills the invalid-tag slot where the ledger puts [0]', () => {
    expect(formatInvalidTag('#ff0000')).toBe('无效标签：#ff0000');
  });
});
