import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BLOCKS_HEADING,
  CREATE_DOC_KEY,
  CREATE_DOC_TEMPLATE,
  DOCS_HEADING,
  DOCS_HEADING_KEY,
  ROWS_HEADING,
  SEE_MORE_RESULTS,
  SEE_MORE_RESULTS_KEY,
  SEARCHING_OTHER_MATCHES,
  SEARCHING_OTHER_MATCHES_KEY,
  SHOW_X_MORE_TEMPLATE,
  SHOW_X_MORE_KEY,
  createDocLabel,
  showMoreLabel,
} from './official-copy';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('search palette official group headings (G1419)', () => {
  it('document matches browse.docs in the ledger', () => {
    expect(DOCS_HEADING).toBe(ledgerValue(DOCS_HEADING_KEY));
  });

  it('blocks and rows stay local wording, since the catalog has no key for them', () => {
    expect(BLOCKS_HEADING).toBe('块内容');
    expect(ROWS_HEADING).toBe('行');
  });

  it('create-doc template matches browse.search.create.doc in the ledger', () => {
    expect(CREATE_DOC_TEMPLATE).toBe(ledgerValue(CREATE_DOC_KEY));
  });

  it('substitutes the query into the [0] slot verbatim', () => {
    expect(createDocLabel('季度复盘')).toBe('创建 季度复盘');
    expect(createDocLabel('a b')).toBe('创建 a b');
  });

  it('matches the two-stage search copy in the ledger (G235)', () => {
    expect(SEARCHING_OTHER_MATCHES).toBe(ledgerValue(SEARCHING_OTHER_MATCHES_KEY));
    expect(SEE_MORE_RESULTS).toBe(ledgerValue(SEE_MORE_RESULTS_KEY));
    expect(SHOW_X_MORE_TEMPLATE).toBe(ledgerValue(SHOW_X_MORE_KEY));
  });

  it('fills the count into the next-page row', () => {
    expect(showMoreLabel(20)).toBe('再显示 20 项');
  });
});
