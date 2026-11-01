import { describe, expect, it } from 'vitest';

import { planTableInsert, planTableInsertAt } from './table-landing';
import type { AddressRow } from './drop-address';

/**
 * G590: the four table drop families fold into one insert plan, with maxRow/maxCol clamped at
 * construction time.
 */
describe('the table insert plan (G590)', () => {
  it('maps the four families to row/column before/after', () => {
    expect(planTableInsert({ kind: 'aboveTableRow', tableId: 't', row: 2, maxRow: 5 })).toEqual({
      axis: 'row',
      side: 'before',
      index: 2,
    });
    expect(planTableInsert({ kind: 'belowTableRow', tableId: 't', row: 2, maxRow: 5 })).toEqual({
      axis: 'row',
      side: 'after',
      index: 2,
    });
    expect(planTableInsert({ kind: 'beforeTableColumn', tableId: 't', column: 1, maxCol: 4 })).toEqual({
      axis: 'column',
      side: 'before',
      index: 1,
    });
    expect(planTableInsert({ kind: 'afterTableColumn', tableId: 't', column: 1, maxCol: 4 })).toEqual({
      axis: 'column',
      side: 'after',
      index: 1,
    });
  });

  it('clamps an out-of-range row or column at construction time', () => {
    expect(planTableInsert({ kind: 'belowTableRow', tableId: 't', row: 99, maxRow: 3 })?.index).toBe(3);
    expect(planTableInsert({ kind: 'afterTableColumn', tableId: 't', column: 99, maxCol: 4 })?.index).toBe(4);
    expect(planTableInsert({ kind: 'aboveTableRow', tableId: 't', row: -5, maxRow: 3 })?.index).toBe(0);
  });

  it('ignores a non-table address', () => {
    expect(planTableInsert({ kind: 'afterAnchor', anchorBlockId: 'b' })).toBeNull();
  });

  it('resolves through the address layer and refuses when the table is not in the rows', () => {
    const rows: AddressRow[] = [{ blockId: 't', visible: true, parentId: 'root' }];
    expect(planTableInsertAt({ kind: 'belowTableRow', tableId: 't', row: 0, maxRow: 2 }, rows)).toEqual({
      axis: 'row',
      side: 'after',
      index: 0,
    });
    expect(planTableInsertAt({ kind: 'belowTableRow', tableId: 'zzz', row: 0, maxRow: 2 }, rows)).toBeNull();
  });
});
