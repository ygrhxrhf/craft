import { describe, expect, it } from 'vitest';

import { applyReplacement, buildIndex, docPosition, findMatches, formatResultCount, type TextSlice } from './matcher';

/** Two paragraphs whose positions are what the assertions are written against. */
const slices: TextSlice[] = [
  { text: 'Craft 的编辑器很轻', from: 10, to: 10 + 'Craft 的编辑器很轻'.length },
  { text: '，而且 craft 很快', from: 40, to: 40 + '，而且 craft 很快'.length },
];

describe('findMatches — 文本 mode', () => {
  it('finds every hit in the document, in document coordinates', () => {
    const { matches, invalid } = findMatches(slices, 'craft', 'text');

    expect(invalid).toBe(false);
    expect(matches).toEqual([
      { from: 10, to: 15 },
      { from: 40 + '，而且 '.length, to: 40 + '，而且 '.length + 5 },
    ]);
  });

  it('treats text search as case-insensitive', () => {
    expect(findMatches(slices, 'CRAFT', 'text').matches).toHaveLength(2);
    expect(findMatches(slices, 'Craft', 'text').matches).toHaveLength(2);
  });

  it('honours the caseSensitive toggle for both modes', () => {
    // text: 'Craft' at 10, 'craft' at 40+4. With case sensitive on, lower-case queries skip the
    // mixed-case hit and only match the lower-case one; with it off, the panel behaves as before.
    expect(findMatches(slices, 'craft', 'text', true).matches).toHaveLength(1);
    expect(findMatches(slices, 'Craft', 'text', true).matches).toHaveLength(1);
    expect(findMatches(slices, 'CRAFT', 'text', true).matches).toHaveLength(0);
    // regex: same opt-in, just route the flag to RegExp.
    expect(findMatches(slices, 'craft', 'regex', true).matches).toHaveLength(1);
  });

  it('reports no match rather than a partial one', () => {
    expect(findMatches(slices, 'crafting', 'text').matches).toEqual([]);
  });

  it('takes no interest in an empty query', () => {
    expect(findMatches(slices, '', 'text')).toEqual({ matches: [], invalid: false });
  });

  it('escapes regular-expression punctuation in text mode', () => {
    const bracketed: TextSlice[] = [{ text: 'a(b)c', from: 0, to: 5 }];
    expect(findMatches(bracketed, '(b)', 'text').matches).toEqual([{ from: 1, to: 4 }]);
    expect(findMatches(bracketed, 'a(b)', 'text').matches).toEqual([{ from: 0, to: 4 }]);
  });
});

describe('findMatches — 正则 mode', () => {
  it('applies the pattern as a regular expression', () => {
    expect(findMatches(slices, 'cr[a]ft', 'regex').matches).toHaveLength(2);
    expect(findMatches(slices, '^Craft', 'regex').matches).toHaveLength(1);
  });

  it('reports an uncompilable pattern as invalid instead of throwing', () => {
    const result = findMatches(slices, 'cr(', 'regex');
    expect(result).toEqual({ matches: [], invalid: true });
  });

  it('skips a zero-length match so the count cannot disagree with the marks', () => {
    const result = findMatches(slices, 'cr*', 'regex');
    expect(result.invalid).toBe(false);
    for (const match of result.matches) {
      expect(match.to).toBeGreaterThan(match.from);
    }
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

describe('a match that spans two inline nodes', () => {
  it('reports the whole document range, not two fragments', () => {
    // 「很轻」 is split across a mark boundary inside one paragraph — the replacement needs one range.
    const split: TextSlice[] = [
      { text: '很', from: 100, to: 101 },
      { text: '轻', from: 101, to: 102 },
    ];
    const result = findMatches(split, '很轻', 'text');
    expect(result.matches).toEqual([{ from: 100, to: 102 }]);
  });
});

describe('the gap where one block ends and the next begins', () => {
  const acrossBlocks: TextSlice[] = [
    { text: '结尾是 abc', from: 30, to: 30 + '结尾是 abc'.length },
    { text: 'def 开头', from: 200, to: 200 + 'def 开头'.length },
  ];

  it('does not let a run bridge two blocks', () => {
    // Each side alone is a normal hit. 「cd」 is the pair that straddles the boundary, and it is
    // the only one the gap placeholder exists to reject — without it the range would run from
    // one block into the next, which is not a range a replacement can write.
    expect(findMatches(acrossBlocks, 'abc', 'text').matches).toHaveLength(1);
    expect(findMatches(acrossBlocks, 'def', 'text').matches).toHaveLength(1);
    expect(findMatches(acrossBlocks, 'cd', 'text').matches).toEqual([]);
    expect(findMatches(acrossBlocks, 'c[\\s\\S]d', 'regex').matches).toEqual([]);
  });

  it('keeps a regex from spanning the boundary either', () => {
    const result = findMatches(acrossBlocks, 'abc[\\s\\S]*def', 'regex');
    expect(result).toEqual({ matches: [], invalid: false });
  });
});

describe('docPosition', () => {
  it('walks the joined text back to each run, clamping the gap placeholder to the run before it', () => {
    const index = buildIndex(slices);
    expect(docPosition(index, 0)).toBe(slices[0].from);
    // The gap placeholder itself belongs to no run: it clamps to the end of the preceding one.
    expect(docPosition(index, slices[0].text.length)).toBe(slices[0].to);
    expect(docPosition(index, slices[0].text.length + 1)).toBe(slices[1].from);
    expect(docPosition(index, slices[0].text.length + 2)).toBe(slices[1].from + 1);
  });

  it('stays at the first run for an offset inside it', () => {
    const index = buildIndex([{ text: 'abc', from: 7, to: 10 }]);
    expect(docPosition(index, 2)).toBe(9);
    expect(docPosition(index, 0)).toBe(7);
  });
});

describe('findMatches — 忽略变音符号 (G1418)', () => {
  const accented: TextSlice[] = [{ text: 'Café crème ä', from: 0, to: 12 }];

  it('matches an unaccented query against accented text when folding is on', () => {
    // 「Café」 at 0, 「crème」 at 5, and the lone 「ä」 at 11 all answer to their base letters.
    const folded = findMatches(accented, 'cafe', 'text', false, true);
    expect(folded.matches).toEqual([{ from: 0, to: 4 }]);
    expect(findMatches(accented, 'creme', 'text', false, true).matches).toEqual([{ from: 5, to: 10 }]);
    expect(findMatches(accented, 'a', 'text', false, true).matches).toEqual([
      { from: 1, to: 2 },
      { from: 11, to: 12 },
    ]);
  });

  it('reports the source range, not the folded one, when a fold changes length', () => {
    // A decomposed 「ä」 is two source units (`a` + U+0308) but one folded character, so the
    // hit must still cover both units of the source rather than stopping at the base letter.
    const decomposed: TextSlice[] = [{ text: 'a\u0308b', from: 0, to: 3 }];
    expect(findMatches(decomposed, 'a', 'text', false, true).matches).toEqual([{ from: 0, to: 2 }]);
    expect(findMatches(decomposed, 'ab', 'text', false, true).matches).toEqual([{ from: 0, to: 3 }]);
  });

  it('treats the toggle as a real switch — off, an unaccented query misses', () => {
    expect(findMatches(accented, 'cafe', 'text', false, false).matches).toEqual([]);
    expect(findMatches(accented, 'café', 'text', false, false).matches).toEqual([{ from: 0, to: 4 }]);
  });

  it('composes with case sensitivity instead of replacing it', () => {
    expect(findMatches(accented, 'CAFE', 'text', false, true).matches).toHaveLength(1);
    expect(findMatches(accented, 'CAFE', 'text', true, true).matches).toHaveLength(0);
  });

  it('folds the pattern too, so an accented query still hits plain text', () => {
    const plain: TextSlice[] = [{ text: 'cafe', from: 0, to: 4 }];
    expect(findMatches(plain, 'café', 'text', false, true).matches).toEqual([{ from: 0, to: 4 }]);
  });
});

describe('applyReplacement', () => {
  it('writes the replacement verbatim in text mode, groups included', () => {
    expect(applyReplacement('abc', 'abc', 'X$1', 'text', false)).toBe('X$1');
  });

  it('expands groups in regex mode and follows the case flag', () => {
    expect(applyReplacement('ABC', '(abc)', '[$1]', 'regex', false)).toBe('[ABC]');
    expect(applyReplacement('ABC', '(abc)', '[$1]', 'regex', true)).toBe('ABC');
    expect(applyReplacement('abc', '(abc)', '[$1]', 'regex', true)).toBe('[abc]');
  });
});

describe('formatResultCount', () => {
  it('follows the official three branches, with the scope in the [1] slot', () => {
    // no.result =「暂无结果 [0]」called with [0] empty; one.result =「1 个结果 [0]」;
    // find.replace.search =「[0] 结果 [1]」where [1] is in.doc / on.page.
    expect(formatResultCount(0)).toBe('暂无结果');
    expect(formatResultCount(1)).toBe('1 个结果 在页面上');
    expect(formatResultCount(12)).toBe('12 结果 在页面上');
    expect(formatResultCount(1, 'doc')).toBe('1 个结果 在文档中');
    expect(formatResultCount(12, 'doc')).toBe('12 结果 在文档中');
    expect(formatResultCount(0, 'doc')).toBe('暂无结果');
  });
});
