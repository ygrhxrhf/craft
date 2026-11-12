import { describe, expect, it } from 'vitest';

import { HIT_COUNT_DISPLAY_CAP, countOccurrences, documentHitCount, hitCountLabel } from './hit-count';

describe('hitCountLabel (G1419)', () => {
  it('shows small counts verbatim, matching the sampled screen', () => {
    expect(hitCountLabel(1)).toBe('1');
    expect(hitCountLabel(3)).toBe('3');
    expect(hitCountLabel(9)).toBe('9');
    expect(hitCountLabel(22)).toBe('22');
  });

  it('caps past the display bound at 50+ — the sampled `Craft Handbook 50+` face', () => {
    expect(hitCountLabel(49)).toBe('49');
    expect(hitCountLabel(HIT_COUNT_DISPLAY_CAP)).toBe('50');
    expect(hitCountLabel(51)).toBe('50+');
    expect(hitCountLabel(400)).toBe('50+');
  });

  it('never prints a negative, fractional or non-finite count', () => {
    expect(hitCountLabel(0)).toBe('0');
    expect(hitCountLabel(-3)).toBe('0');
    expect(hitCountLabel(2.7)).toBe('2');
    expect(hitCountLabel(NaN)).toBe('0');
    // A non-finite count can only come from a counting bug; it reads as 0, not as a fake `50+`.
    expect(hitCountLabel(Infinity)).toBe('0');
  });
});

describe('countOccurrences', () => {
  it('counts case-insensitively and never overlaps', () => {
    expect(countOccurrences('Craft Handbook Craft craft', 'craft')).toBe(3);
    expect(countOccurrences('aaaa', 'aa')).toBe(2);
  });

  it('treats the query literally, not as a pattern', () => {
    expect(countOccurrences('a.b and aXb', 'a.b')).toBe(1);
  });

  it('answers zero for empty inputs', () => {
    expect(countOccurrences('', 'x')).toBe(0);
    expect(countOccurrences('text', '')).toBe(0);
    expect(countOccurrences('', '')).toBe(0);
  });
});

describe('documentHitCount', () => {
  const content = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Craft 是一款文档工具' }] },
      { type: 'callout', content: [{ type: 'text', text: 'craft 里再提一次' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '没有命中的一段' }] },
    ],
  };

  it('adds title occurrences and block occurrences', () => {
    expect(documentHitCount(content, '我的 Craft 手册', 'craft')).toBe(3);
  });

  it('reads the same top-level text the block search reads', () => {
    // extractBlocks 只数顶层带字的块，callout 的嵌套文字也在其中——和块搜索同一套投影。
    expect(documentHitCount(content, '无关标题', 'craft')).toBe(2);
  });

  it('answers zero without a query', () => {
    expect(documentHitCount(content, '标题', '  ')).toBe(0);
  });
});
