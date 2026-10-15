import { describe, expect, it } from 'vitest';

import {
  STATS_LABELS,
  WORDS_PER_MINUTE,
  charactersExcludingSpaces,
  pageStats,
  readingMinutes,
  statsInputFor,
  statsTitle,
} from './page-stats';

/**
 * 「统计 · 这一页」 (G201): four derived figures.
 */
describe('the character count', () => {
  it('excludes whitespace, which the label says so under', () => {
    expect(charactersExcludingSpaces('a b\tc\nd')).toBe(4);
    expect(charactersExcludingSpaces('  ')).toBe(0);
    expect(charactersExcludingSpaces('中文 三字')).toBe(4);
  });
});

describe('the reading time', () => {
  it('is zero for an empty page', () => {
    expect(readingMinutes(0)).toBe(0);
  });

  it('rounds up to at least one minute for a short page', () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(50)).toBe(1);
  });

  it('follows the words-per-minute figure', () => {
    expect(WORDS_PER_MINUTE).toBe(200);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(400)).toBe(2);
    expect(readingMinutes(1000)).toBe(5);
  });
});

describe('the five figures (G377)', () => {
  it('assembles words, characters (with/without spaces), blocks and reading time', () => {
    expect(pageStats({ wordCount: 400, plainText: 'a b c', blockCount: 7 })).toEqual({
      words: 400,
      characters: 5, // 含空格
      charactersNoSpaces: 3,
      blocks: 7,
      readingMinutes: 2,
    });
  });

  it('names the five rows in order', () => {
    expect([...STATS_LABELS]).toEqual(['字数', '字符数', '不包括空格', '区块', '阅读时间']);
  });
});

describe('the section title', () => {
  it('carries the page suffix by default', () => {
    expect(statsTitle()).toBe('统计 · 这一页');
  });

  it('names the other two scopes the same way', () => {
    expect(statsTitle('selection')).toBe('统计 · 选择');
    expect(statsTitle('document')).toBe('统计 · 完整文档');
  });
});

describe('the scope a reading counts', () => {
  const page = { wordCount: 400, plainText: 'page ', blockCount: 7 };
  const selection = { wordCount: 2, plainText: 'ab', blockCount: 1 };
  const subpages = [{ wordCount: 100, plainText: 'sub', blockCount: 3 }];

  it('counts the open page on its own', () => {
    expect(statsInputFor('page', { page, selection, subpages })).toEqual(page);
  });

  it('counts only the selection, even when it is empty', () => {
    expect(statsInputFor('selection', { page, selection, subpages })).toEqual(selection);
    const empty = { wordCount: 0, plainText: '', blockCount: 0 };
    expect(statsInputFor('selection', { page, selection: empty, subpages })).toEqual(empty);
  });

  it('adds the subpages to the open page for the full document', () => {
    expect(statsInputFor('document', { page, selection, subpages })).toEqual({
      wordCount: 500,
      plainText: 'page sub',
      blockCount: 10,
    });
  });
});
