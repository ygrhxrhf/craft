import { describe, expect, it } from 'vitest';

import {
  STATS_LABELS,
  WORDS_PER_MINUTE,
  charactersExcludingSpaces,
  pageStats,
  readingMinutes,
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

describe('the four figures', () => {
  it('assembles words, characters, blocks and reading time', () => {
    expect(pageStats({ wordCount: 400, plainText: 'a b c', blockCount: 7 })).toEqual({
      words: 400,
      characters: 3,
      blocks: 7,
      readingMinutes: 2,
    });
  });

  it('names the four rows in order', () => {
    expect([...STATS_LABELS]).toEqual(['字数', '字符数', '区块', '阅读时间']);
  });
});

describe('the section title', () => {
  it('carries the page suffix by default', () => {
    expect(statsTitle()).toBe('统计 · 这一页');
  });

  it('drops the suffix for a whole-document reading', () => {
    expect(statsTitle('document')).toBe('统计');
  });
});
