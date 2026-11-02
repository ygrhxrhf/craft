import { describe, expect, it } from 'vitest';

import { TOC_EMPTY_COPY, TOC_TITLE, extractToc } from './toc';

type FakeNode = {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent?: string;
  nodeSize: number;
  childCount: number;
  child: (index: number) => FakeNode;
};

function node(name: string, children: FakeNode[] = [], attrs: Record<string, unknown> = {}, text = ''): FakeNode {
  return {
    type: { name },
    attrs,
    textContent: text,
    nodeSize: 1 + children.reduce((sum, child) => sum + child.nodeSize, 0),
    childCount: children.length,
    child: (index: number) => children[index],
  };
}

describe('info panel TOC (G626)', () => {
  it('keeps the empty-state guide copy verbatim', () => {
    expect(TOC_TITLE).toBe('目录');
    expect(TOC_EMPTY_COPY).toBe('使用标题、页面或卡片创建目录。');
  });

  it('collects headings in document order with their level and position', () => {
    const doc = node('doc', [
      node('paragraph', [], {}, 'intro'),
      node('heading', [], { level: 2 }, '第一节'),
      node('paragraph', [], {}, 'body'),
      node('heading', [], { level: 3 }, '小节'),
    ]);
    const toc = extractToc(doc);
    expect(toc.map((entry) => [entry.level, entry.text])).toEqual([
      [2, '第一节'],
      [3, '小节'],
    ]);
    expect(toc[0].pos).toBeLessThan(toc[1].pos);
  });

  it('returns nothing for a doc without headings', () => {
    expect(extractToc(node('doc', [node('paragraph', [], {}, 'text')]))).toEqual([]);
    expect(extractToc(null)).toEqual([]);
  });
});
