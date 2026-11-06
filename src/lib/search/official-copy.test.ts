import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BLOCKS_HEADING,
  CREATE_DOC_KEY,
  CREATE_DOC_TEMPLATE,
  DOCS_HEADING,
  DOCS_HEADING_KEY,
  NO_RESULTS_FOUND_FOR_KEY,
  NO_RESULTS_FOUND_FOR_TEMPLATE,
  ROWS_HEADING,
  SEE_MORE_RESULTS,
  SEE_MORE_RESULTS_KEY,
  SEARCHING_OTHER_MATCHES,
  SEARCHING_OTHER_MATCHES_KEY,
  SHOW_X_MORE_TEMPLATE,
  SHOW_X_MORE_KEY,
  createDocLabel,
  noResultsFor,
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

  it('quotes the query into the official no-results line (G235)', () => {
    expect(NO_RESULTS_FOUND_FOR_TEMPLATE).toBe(ledgerValue(NO_RESULTS_FOUND_FOR_KEY));
    expect(noResultsFor('季度复盘')).toBe('未找到 季度复盘 的结果');
  });

  it('renders the no-results line as its own branch, not through CommandEmpty', () => {
    // 结果项里永远有一条「创建 [0]」，它自己命中自己 ⇒ 列表从不"空"、CommandEmpty 永不渲染。
    const source = readFileSync(
      join(process.cwd(), 'src/components/search/CommandPalette.tsx'),
      'utf8',
    );
    expect(source).toContain('noResultsFor');
    expect(source).not.toMatch(/<CommandEmpty/);
  });

  it('keeps the official commands out of the jump palette (第 1 批)', () => {
    // 第 1 批裁决：Ctrl-K 是「跳转到」面板，操作项（含 `commands.open.shortcuts`）
    // 移出面板，入口沿用帮助菜单与设置页本身。
    const source = readFileSync(
      join(process.cwd(), 'src/components/search/CommandPalette.tsx'),
      'utf8',
    );
    expect(source).not.toContain('查看所有快捷键');
    expect(source).not.toMatch(/openSettings\('shortcuts'\)/);
    const help = readFileSync(join(process.cwd(), 'src/components/app/HelpMenu.tsx'), 'utf8');
    expect(help).toContain("openSettings('shortcuts')");
  });
});
