import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COLUMN_DROP_MIME,
  afterTableColumnLocation,
  columnLocationAt,
  columnOrderAfterLocation,
} from './column-drop';

/** G397：列拖拽落点是独立于块寻址的第二套协议。 */
describe('the column drop location protocol (G397)', () => {
  it('carries the official shape verbatim', () => {
    const location = afterTableColumnLocation({ tableId: 'v1', column: 1, maxCol: 4 });
    expect(location).toEqual({ type: 'afterTableColumnLocation', tableId: 'v1', column: 1, maxCol: 4 });
    expect(COLUMN_DROP_MIME).toBe('application/x-crafty-collection-column');
  });

  it('clamps the column against maxCol at construction time', () => {
    expect(afterTableColumnLocation({ tableId: 'v1', column: 99, maxCol: 4 })?.column).toBe(3);
    expect(afterTableColumnLocation({ tableId: 'v1', column: -7, maxCol: 4 })?.column).toBe(0);
  });

  it('has no location at all in an empty table', () => {
    expect(afterTableColumnLocation({ tableId: 'v1', column: 0, maxCol: 0 })).toBeNull();
  });

  it('turns a header hit into an after-the-column location', () => {
    const ids = ['a', 'b', 'c'];
    expect(columnLocationAt({ tableId: 'v1', visibleIds: ids, index: 1, side: 'after' })?.column).toBe(1);
    // 左半＝插到前一列之后，也就是插到这一列之前。
    expect(columnLocationAt({ tableId: 'v1', visibleIds: ids, index: 1, side: 'before' })?.column).toBe(0);
  });

  it('refuses the left half of the first column, because there is no "after" there', () => {
    expect(columnLocationAt({ tableId: 'v1', visibleIds: ['a', 'b'], index: 0, side: 'before' })).toBeNull();
  });

  it('refuses an index outside the table', () => {
    expect(columnLocationAt({ tableId: 'v1', visibleIds: ['a'], index: 5, side: 'after' })).toBeNull();
    expect(columnLocationAt({ tableId: 'v1', visibleIds: ['a'], index: -1, side: 'after' })).toBeNull();
    expect(columnLocationAt({ tableId: 'v1', visibleIds: [], index: 0, side: 'after' })).toBeNull();
  });

  it('moves the dragged column behind the target and keeps the rest in order', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const location = afterTableColumnLocation({ tableId: 'v1', column: 0, maxCol: ids.length })!;
    expect(columnOrderAfterLocation(ids, 'c', location)).toEqual(['a', 'c', 'b', 'd']);
    // 往回拖：落点的 column 是**原表**下标，先删后插不会把下标算错（落点列仍是 'b'）。
    const back = afterTableColumnLocation({ tableId: 'v1', column: 1, maxCol: ids.length })!;
    expect(columnOrderAfterLocation(ids, 'd', back)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('is a no-op when the drop lands on the dragged column itself', () => {
    const ids = ['a', 'b', 'c'];
    const location = afterTableColumnLocation({ tableId: 'v1', column: 1, maxCol: 3 })!;
    expect(columnOrderAfterLocation(ids, 'b', location)).toEqual(['a', 'b', 'c']);
  });

  it('leaves the order alone when the dragged id is not on screen', () => {
    const ids = ['a', 'b'];
    const location = afterTableColumnLocation({ tableId: 'v1', column: 0, maxCol: 2 })!;
    expect(columnOrderAfterLocation(ids, 'zzz', location)).toEqual(['a', 'b']);
  });
});

/**
 * 协议本身再对，没有表头接线就只是一份没人读的表 ⇒ 两处表头（分组／未分组）都要挂上，
 * 且写回走的是**视图**的 `customPropertyOrder`（列序按视图存，G81），不是属性行的 order。
 */
describe('the table headers wire the column protocol (G397)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/app/(app)/collections/[id]/TableView.tsx'),
    'utf8',
  );
  const columnDrop = readFileSync(join(process.cwd(), 'src/lib/collection/column-drop.ts'), 'utf8');

  it('gives both header rows the drag props', () => {
    expect(source.match(/\{\.\.\.columnHeaderProps\(property, index\)\}/g)).toHaveLength(2);
  });

  it('drags only when the view allows reordering, and never the title column', () => {
    expect(source).toContain('draggable: reorderEnabled && index > 0');
    expect(source).toContain('if (!columnDragState.payload || !reorderEnabled) return;');
  });

  it('builds the official location and writes the new order back into the view config', () => {
    expect(source).toContain('columnLocationAt({ tableId: view.id, visibleIds, index, side: sideAtPointer(event) })');
    expect(source).toContain('columnOrderAfterLocation(visibleIds, sourceId, location)');
    expect(source).toContain('persistConfig({ filters, sorts, groupBy, fields: next })');
    expect(source).toContain('columnDragState.payload = { tableId: view.id, column: String(property.id) }');
  });

  it('carries the payload the way the sidebar does: a module-level slot plus the MIME', () => {
    // `dragover` 读不到 dataTransfer，React state 又要等一轮渲染 ⇒ 落点判定必须走内存载荷。
    expect(source).toContain('columnDragState.payload = null;');
    expect(source.replace(/\r\n/g, '\n')).toContain("event.dataTransfer.setData(\n          COLUMN_DROP_MIME,");
    expect(columnDrop).toContain('export const columnDragState');
  });
});
