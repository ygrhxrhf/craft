import { describe, expect, it } from 'vitest';
import { appendTextBlock, listBlocks } from './blocks';

const content = {
  type: 'doc',
  content: [
    { type: 'heading', content: [{ type: 'text', text: '标题' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
  ],
};

describe('AI block tools (G49)', () => {
  it('lists ordered top-level blocks with their text', () => {
    expect(listBlocks(content)).toEqual([
      { index: 0, type: 'heading', text: '标题', isPage: true, children: 1 },
      { index: 1, type: 'paragraph', text: '正文', isPage: true, children: 1 },
    ]);
  });

  it('exposes the G53 page/children projection on each block', () => {
    const tree = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textStyle: 'PageRegular' }, content: [] },
        { type: 'paragraph', content: [] },
      ],
    };
    expect(listBlocks(tree)).toEqual([
      { index: 0, type: 'paragraph', text: '', isPage: true, children: 0 },
      { index: 1, type: 'paragraph', text: '', isPage: false, children: 0 },
    ]);
  });

  it('appends one paragraph without touching existing blocks', () => {
    const next = appendTextBlock(content, '新增') as { content: unknown[] };
    expect(next.content).toHaveLength(3);
    expect(next.content[2]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: '新增' }] });
    expect(listBlocks(next)[1]).toEqual({
      index: 1,
      type: 'paragraph',
      text: '正文',
      isPage: true,
      children: 1,
    });
  });
});
