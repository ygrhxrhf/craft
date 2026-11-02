import { describe, expect, it } from 'vitest';

import { orderAfterDrop, orderPatches } from './sibling-order';

// G607: a same-layer drop rewrites the whole sibling order list.
describe('sidebar sibling reorder (G607)', () => {
  const siblings = [
    { id: 'a', order: 0 },
    { id: 'b', order: 1 },
    { id: 'c', order: 2 },
  ];

  it('inserts the dragged row before or after the target', () => {
    expect(orderAfterDrop(siblings, 'c', 'a', 'before')).toEqual(['c', 'a', 'b']);
    expect(orderAfterDrop(siblings, 'a', 'b', 'after')).toEqual(['b', 'a', 'c']);
  });

  it('returns an empty list when the target is not a sibling', () => {
    expect(orderAfterDrop(siblings, 'a', 'zzz', 'before')).toEqual([]);
  });

  it('turns the final order into 0-based order patches', () => {
    expect(orderPatches(['b', 'c', 'a'])).toEqual([
      { id: 'b', order: 0 },
      { id: 'c', order: 1 },
      { id: 'a', order: 2 },
    ]);
  });
});
