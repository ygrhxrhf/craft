import { describe, expect, it } from 'vitest';

import { addressesDivergeAt, resolveDropAddress, type AddressRow } from './drop-address';

/** A flat run of visible siblings, ids a…e. */
const flat = (...ids: string[]): AddressRow[] =>
  ids.map((blockId) => ({ blockId, visible: true, parentId: 'root' }));

/** The sibling index of a landing, or null when the address is a table cell. */
function sibling(address: Parameters<typeof resolveDropAddress>[0], rows: AddressRow[]): number | null {
  const landing = resolveDropAddress(address, rows);
  return landing?.at === 'sibling' ? landing.index : null;
}

describe('anchor addressing (G280)', () => {
  const rows = flat('a', 'b', 'c');

  it('afterAnchor lands after the anchor, beforeAnchor before it', () => {
    expect(sibling({ kind: 'afterAnchor', anchorBlockId: 'b' }, rows)).toBe(2);
    expect(sibling({ kind: 'beforeAnchor', anchorBlockId: 'b' }, rows)).toBe(1);
  });

  it('an unknown anchor resolves to nothing rather than a guess', () => {
    expect(resolveDropAddress({ kind: 'afterAnchor', anchorBlockId: 'zzz' }, rows)).toBeNull();
  });
});

describe('the *Visible twin (G280/G590)', () => {
  // b is a toggle block; c and d live inside it (hidden). e is the next visible sibling.
  const rows: AddressRow[] = [
    { blockId: 'a', visible: true, parentId: 'root' },
    { blockId: 'b', visible: true, parentId: 'root' },
    { blockId: 'c', visible: false, parentId: 'b' },
    { blockId: 'd', visible: false, parentId: 'b' },
    { blockId: 'e', visible: true, parentId: 'root' },
  ];

  it('the plain form counts hidden blocks in true sibling order', () => {
    expect(sibling({ kind: 'afterAnchor', anchorBlockId: 'b' }, rows)).toBe(2);
    expect(sibling({ kind: 'beforeAnchor', anchorBlockId: 'e' }, rows)).toBe(4);
  });

  it('the Visible form skips folded blocks so the drop clears the collapse', () => {
    expect(sibling({ kind: 'afterAnchorVisible', anchorBlockId: 'b' }, rows)).toBe(4);
    expect(sibling({ kind: 'beforeAnchorVisible', anchorBlockId: 'e' }, rows)).toBe(2);
  });

  it('the two forms agree when nothing is folded', () => {
    const open = flat('a', 'b', 'c');
    expect(sibling({ kind: 'afterAnchor', anchorBlockId: 'b' }, open)).toBe(
      sibling({ kind: 'afterAnchorVisible', anchorBlockId: 'b' }, open),
    );
    expect(addressesDivergeAt(open, 'b')).toBe(false);
  });

  it('divergence is exactly the folded case', () => {
    expect(addressesDivergeAt(rows, 'b')).toBe(true);
  });
});

describe('parent-relative and container addressing', () => {
  const rows: AddressRow[] = [
    { blockId: 'a', visible: true, parentId: 'root' },
    { blockId: 'b', visible: true, parentId: 'root' },
    { blockId: 'x', visible: true, parentId: 'b' },
    { blockId: 'y', visible: true, parentId: 'b' },
  ];

  it('indexInParent clamps into the sibling run', () => {
    expect(sibling({ kind: 'indexInParent', index: 1, parentId: 'b' }, rows)).toBe(1);
    expect(sibling({ kind: 'indexInParent', index: 99, parentId: 'b' }, rows)).toBe(2);
    expect(sibling({ kind: 'indexInParent', index: -3, parentId: 'b' }, rows)).toBe(0);
    expect(resolveDropAddress({ kind: 'indexInParent', index: 0, parentId: 'nope' }, rows)).toBeNull();
  });

  it('intoObjectList lands just after the container', () => {
    expect(sibling({ kind: 'intoObjectList', objectListId: 'b' }, rows)).toBe(2);
    expect(resolveDropAddress({ kind: 'intoObjectList', objectListId: 'nope' }, rows)).toBeNull();
  });
});

describe('table addressing clamps at construction time (G590)', () => {
  const rows = flat('t', 'u');

  it('row addresses clamp to maxRow', () => {
    expect(resolveDropAddress({ kind: 'aboveTableRow', tableId: 't', row: 5, maxRow: 3 }, rows)).toEqual({
      at: 'tableCell',
      tableId: 't',
      row: 3,
      column: 0,
    });
    expect(resolveDropAddress({ kind: 'belowTableRow', tableId: 't', row: 99, maxRow: 3 }, rows)).toEqual({
      at: 'tableCell',
      tableId: 't',
      row: 3,
      column: 1,
    });
    expect(resolveDropAddress({ kind: 'belowTableRow', tableId: 't', row: 2, maxRow: 3 }, rows)).toEqual({
      at: 'tableCell',
      tableId: 't',
      row: 2,
      column: 1,
    });
  });

  it('column addresses clamp to maxCol', () => {
    expect(resolveDropAddress({ kind: 'beforeTableColumn', tableId: 't', column: 1, maxCol: 4 }, rows)).toEqual({
      at: 'tableCell',
      tableId: 't',
      row: 0,
      column: 1,
    });
    expect(resolveDropAddress({ kind: 'afterTableColumn', tableId: 't', column: 9, maxCol: 4 }, rows)).toEqual({
      at: 'tableCell',
      tableId: 't',
      row: 1,
      column: 4,
    });
  });

  it('an unknown table resolves to nothing', () => {
    expect(resolveDropAddress({ kind: 'aboveTableRow', tableId: 'zzz', row: 0, maxRow: 1 }, rows)).toBeNull();
  });
});
