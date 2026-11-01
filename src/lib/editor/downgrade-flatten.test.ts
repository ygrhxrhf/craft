import { describe, expect, it } from 'vitest';

import { flattenDowngrade, type FlattenRow } from './downgrade-flatten';

const row = (blockId: string, indent: number, downgraded = false): FlattenRow => ({
  blockId,
  indent,
  downgraded,
});

describe('flattenDowngrade (G278)', () => {
  it('lifts the children of a downgraded block up to its level', () => {
    // 标题(0) with two children(1,1) ⇒ all three end at level 0, order unchanged.
    const out = flattenDowngrade([row('h', 0, true), row('c1', 1), row('c2', 1)]);
    expect(out).toEqual([
      { blockId: 'h', indent: 0 },
      { blockId: 'c1', indent: 0 },
      { blockId: 'c2', indent: 0 },
    ]);
  });

  it('does not delete the children and does not keep them nested', () => {
    const out = flattenDowngrade([row('h', 0, true), row('c', 2)]);
    expect(out.map((r) => r.blockId)).toEqual(['h', 'c']);
    expect(out.every((r) => r.indent === 0)).toBe(true);
  });

  it('leaves untouched blocks alone', () => {
    const out = flattenDowngrade([row('a', 0), row('b', 1), row('c', 0)]);
    expect(out).toEqual([
      { blockId: 'a', indent: 0 },
      { blockId: 'b', indent: 1 },
      { blockId: 'c', indent: 0 },
    ]);
  });

  it('stops at the first sibling that is not deeper', () => {
    // 降级 a(0); b(1) is a child, c(0) is not ⇒ c keeps its own indent.
    const out = flattenDowngrade([row('a', 0, true), row('b', 1), row('c', 0), row('d', 1)]);
    expect(out).toEqual([
      { blockId: 'a', indent: 0 },
      { blockId: 'b', indent: 0 },
      { blockId: 'c', indent: 0 },
      { blockId: 'd', indent: 1 },
    ]);
  });

  it('nested grandchildren come up too, in order', () => {
    const out = flattenDowngrade([row('h', 0, true), row('c', 1), row('g', 2), row('s', 0)]);
    expect(out).toEqual([
      { blockId: 'h', indent: 0 },
      { blockId: 'c', indent: 0 },
      { blockId: 'g', indent: 0 },
      { blockId: 's', indent: 0 },
    ]);
  });

  it('a downgraded block with no children is a no-op', () => {
    expect(flattenDowngrade([row('a', 0, true), row('b', 0)])).toEqual([
      { blockId: 'a', indent: 0 },
      { blockId: 'b', indent: 0 },
    ]);
  });
});
