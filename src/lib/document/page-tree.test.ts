import { describe, expect, it } from 'vitest';
import {
  blockChildCount,
  buildPageTree,
  childCount,
  isPageNode,
  pageContentMarkdown,
} from './page-tree';

const paragraph = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const rows = [
  { id: 'root', title: '根', parentId: null, content: paragraph('正文') },
  { id: 'a', title: '子页 A', parentId: 'root', content: paragraph('A 的内容') },
  { id: 'b', title: '子页 B', parentId: 'root', content: { type: 'doc', content: [] } },
  { id: 'a1', title: '孙页', parentId: 'a', content: paragraph('孙页内容') },
  { id: 'other', title: '别处', parentId: null, content: paragraph('不相关') },
];

describe('page tree projection (G53)', () => {
  it('builds children from parentId', () => {
    const root = buildPageTree(rows, 'root')!;
    expect(root.children.map((child) => child.id)).toEqual(['a', 'b']);
    expect(root.children[0]!.children.map((child) => child.id)).toEqual(['a1']);
    expect(childCount(root)).toBe(2);
  });

  it('projects the subtree to markdown with child page sections', () => {
    const root = buildPageTree(rows, 'root')!;
    const markdown = pageContentMarkdown(root);
    expect(markdown).toContain('正文');
    expect(markdown).toContain('## 子页 A');
    expect(markdown).toContain('A 的内容');
    expect(markdown).toContain('## 孙页');
    expect(markdown).not.toContain('不相关');
  });

  it('returns null for a missing root and tolerates a cycle', () => {
    expect(buildPageTree(rows, 'missing')).toBeNull();
    const cyclic = [
      { id: 'x', title: 'X', parentId: 'y', content: paragraph('x') },
      { id: 'y', title: 'Y', parentId: 'x', content: paragraph('y') },
    ];
    expect(() => buildPageTree(cyclic, 'x')).not.toThrow();
  });
});

describe('isPage / children projection (G53)', () => {
  it('treats a block with children as a page', () => {
    expect(isPageNode(paragraph('正文'))).toBe(true);
    expect(blockChildCount(paragraph('正文'))).toBe(1);
  });

  it('treats a styled empty page as a page even with no children', () => {
    expect(isPageNode({ type: 'paragraph', attrs: { textStyle: 'PageRegular' }, content: [] })).toBe(true);
    expect(isPageNode({ type: 'paragraph', attrs: { textStyle: 'PageCard' } })).toBe(true);
  });

  it('treats a childless, unstyled block as a normal block', () => {
    expect(isPageNode({ type: 'paragraph', content: [] })).toBe(false);
    expect(isPageNode({ type: 'paragraph' })).toBe(false);
    expect(isPageNode(null)).toBe(false);
    expect(blockChildCount(undefined)).toBe(0);
  });
});
