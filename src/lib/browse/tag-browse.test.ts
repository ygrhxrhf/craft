import { describe, expect, it } from 'vitest';

import {
  TAG_CASE_STORAGE_KEY,
  buildTagTree,
  formatTagLabel,
  readTagCaseMode,
  tagLevel,
  writeTagCaseMode,
} from './tag-browse';

const doc = (id: string, updatedAt: string, title = id) => ({
  id,
  title,
  icon: null,
  updatedAt,
});

describe('tagLevel reads the two-level name', () => {
  it('splits a child from its parent', () => {
    expect(tagLevel('工作/紧急')).toEqual({ parent: '工作', leaf: '紧急' });
  });

  it('treats a flat name, and a malformed slash, as one level', () => {
    expect(tagLevel('工作')).toEqual({ parent: null, leaf: '工作' });
    expect(tagLevel('工作/')).toEqual({ parent: null, leaf: '工作/' });
    expect(tagLevel('/工作')).toEqual({ parent: null, leaf: '/工作' });
  });
});

describe('buildTagTree', () => {
  it('counts the documents that carry each tag', () => {
    const tree = buildTagTree(
      [{ id: 't1', name: '工作', color: '#6366f1' }],
      [
        { tagId: 't1', documentId: 'd1' },
        { tagId: 't1', documentId: 'd2' },
      ],
      [doc('d1', '2026-01-01'), doc('d2', '2026-01-02')],
    );
    expect(tree.groups[0].documentCount).toBe(2);
    expect(tree.tagCount).toBe(1);
  });

  it('ignores a link whose document the caller did not hand over', () => {
    // The page passes `getDocuments()`, which already drops deleted/daily/template pages.
    const tree = buildTagTree(
      [{ id: 't1', name: '工作', color: '#6366f1' }],
      [
        { tagId: 't1', documentId: 'd1' },
        { tagId: 't1', documentId: 'deleted' },
      ],
      [doc('d1', '2026-01-01')],
    );
    expect(tree.groups[0].documents.map((row) => row.id)).toEqual(['d1']);
    expect(tree.groups[0].documentCount).toBe(1);
  });

  it('nests a child under its parent and keeps the parent count its own', () => {
    const tree = buildTagTree(
      [
        { id: 'p', name: '工作', color: '#6366f1' },
        { id: 'c', name: '工作/紧急', color: '#e0596b' },
      ],
      [
        { tagId: 'p', documentId: 'd1' },
        { tagId: 'c', documentId: 'd2' },
      ],
      [doc('d1', '2026-01-01'), doc('d2', '2026-01-02')],
    );
    expect(tree.groups).toHaveLength(1);
    expect(tree.groups[0].children.map((child) => child.name)).toEqual(['工作/紧急']);
    expect(tree.groups[0].documentCount).toBe(1);
    // The child is reachable by id from the same map the detail page uses.
    expect(tree.byId.get('c')?.documents.map((row) => row.id)).toEqual(['d2']);
  });

  it('leaves a child alone when its parent is not a tag', () => {
    const tree = buildTagTree(
      [{ id: 'c', name: '未知/紧急', color: '#e0596b' }],
      [{ tagId: 'c', documentId: 'd1' }],
      [doc('d1', '2026-01-01')],
    );
    expect(tree.groups.map((group) => group.name)).toEqual(['未知/紧急']);
    expect(tree.groups[0].children).toEqual([]);
  });

  it('orders by count then name, newest document first inside a row', () => {
    const tree = buildTagTree(
      [
        { id: 'a', name: '想法', color: '#6366f1' },
        { id: 'b', name: '学校', color: '#6366f1' },
        { id: 'c', name: '工作', color: '#6366f1' },
      ],
      [
        { tagId: 'a', documentId: 'd1' },
        { tagId: 'b', documentId: 'd1' },
        { tagId: 'b', documentId: 'd2' },
      ],
      [doc('d1', '2026-01-01'), doc('d2', '2026-02-01')],
    );
    expect(tree.groups.map((group) => group.name)).toEqual(['学校', '想法', '工作']);
    expect(tree.byId.get('b')?.documents.map((row) => row.id)).toEqual(['d2', 'd1']);
  });

  it('returns an empty tree for a space with no tags', () => {
    const tree = buildTagTree([], [], []);
    expect(tree.groups).toEqual([]);
    expect(tree.tagCount).toBe(0);
  });
});

describe('the tag order (G94 tag_reorder)', () => {
  it('sorts roots by their stored order before the count/name tiebreak', () => {
    const tree = buildTagTree(
      [
        { id: 'a', name: '甲', color: '#111111', order: 2 },
        { id: 'b', name: '乙', color: '#222222', order: 0 },
        { id: 'c', name: '丙', color: '#333333', order: 1 },
      ],
      [
        { tagId: 'a', documentId: 'd1' },
        { tagId: 'a', documentId: 'd2' },
        { tagId: 'a', documentId: 'd3' },
      ],
      [doc('d1', '2026-01-01'), doc('d2', '2026-01-02'), doc('d3', '2026-01-03')],
    );
    expect(tree.groups.map((group) => group.name)).toEqual(['乙', '丙', '甲']);
  });

  it('keeps the old count order while every order is the default 0', () => {
    const tree = buildTagTree(
      [
        { id: 'a', name: '甲', color: '#111111' },
        { id: 'b', name: '乙', color: '#222222' },
      ],
      [
        { tagId: 'b', documentId: 'd1' },
        { tagId: 'b', documentId: 'd2' },
        { tagId: 'a', documentId: 'd3' },
      ],
      [doc('d1', '2026-01-01'), doc('d2', '2026-01-02'), doc('d3', '2026-01-03')],
    );
    expect(tree.groups.map((group) => group.name)).toEqual(['乙', '甲']);
  });
});

describe('pinned tags (G607)', () => {
  it('puts a pinned tag ahead of a lower order', () => {
    const tree = buildTagTree(
      [
        { id: 'a', name: '甲', color: '#111111', order: 0 },
        { id: 'b', name: '乙', color: '#222222', order: 5, pinned: true },
      ],
      [],
      [],
    );
    expect(tree.groups.map((group) => group.name)).toEqual(['乙', '甲']);
  });
});

/** G175：标签名大小写两档只换显示，不换存下来的名字；档位存本机。 */
describe('tag label case is a display-only two-state preference', () => {
  const storage = () => {
    const box = new Map<string, string>();
    return {
      getItem: (key: string) => box.get(key) ?? null,
      setItem: (key: string, value: string) => void box.set(key, value),
      box,
    };
  };

  it('keeps the typed name or lowercases it', () => {
    expect(formatTagLabel('Work/Idea', 'asTyped')).toBe('Work/Idea');
    expect(formatTagLabel('Work/Idea', 'lowercase')).toBe('work/idea');
    // 中文没有大小写，两档读出同一串。
    expect(formatTagLabel('工作', 'lowercase')).toBe('工作');
  });

  it('defaults to as-typed and survives a round-trip under its own key', () => {
    const box = storage();
    expect(readTagCaseMode(box)).toBe('asTyped');
    expect(writeTagCaseMode(box, 'lowercase')).toBe(true);
    expect(box.box.get(TAG_CASE_STORAGE_KEY)).toBe('lowercase');
    expect(readTagCaseMode(box)).toBe('lowercase');
  });

  it('reports a failed write instead of pretending it saved', () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(writeTagCaseMode(failing, 'lowercase')).toBe(false);
  });
});
