import { describe, expect, it } from 'vitest';
import { HEADING_SEMANTICS, TEXT_STYLE_LABELS, headingLabel } from './semantic-levels';

describe('semantic text levels (G51)', () => {
  it('uses the official style.text labels verbatim', () => {
    expect(TEXT_STYLE_LABELS).toEqual({
      title: '标题',
      subtitle: '副标题',
      heading: '中标题',
      strong: '小标题',
      body: '正文',
      caption: '说明',
    });
  });

  it('maps heading levels to semantic names', () => {
    expect(HEADING_SEMANTICS.map((item) => [item.level, item.key])).toEqual([
      [1, 'title'],
      [2, 'subtitle'],
      [3, 'heading'],
      [4, 'strong'],
    ]);
    expect([1, 2, 3, 4].map(headingLabel)).toEqual(['标题', '副标题', '中标题', '小标题']);
  });
});
