import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DELETE_FIELD, DELETE_FIELD_DESC, HIDE_ORDER_FIELDS } from './field-menu-copy';

const menu = readFileSync(
  new URL('../../components/collection/FieldMenu.tsx', import.meta.url),
  'utf8',
);
const panel = readFileSync(
  new URL('../../components/collection/HideOrderFieldsMenu.tsx', import.meta.url),
  'utf8',
);
const table = readFileSync(
  new URL('../../app/(app)/collections/[id]/TableView.tsx', import.meta.url),
  'utf8',
);

/**
 * G1537 的接线闸。三件事各钉一条：
 * ① 官方串只有一处声明（`field-menu-copy.ts`），两个组件都消费常量、不手抄；
 * ② 写入走离线内核，不回退到 `properties.ts` 那三枚零调用的 server action；
 * ③ 两处承载面都真的挂上了（列头菜单 ＋ 视图工具条面板），不然"实现了但用户点不到"。
 */
describe('the collection field menu is wired to the official keys (G1537)', () => {
  it('declares the delete confirmation verbatim and consumes it from the constant', () => {
    expect(DELETE_FIELD_DESC).toBe('你确定要删除该字段吗？');
    expect(menu).toContain('message: DELETE_FIELD_DESC');
    expect(menu).not.toContain('你确定要删除该字段吗？');
  });

  it('keeps the non-official menu item name in the copy module, not in the component', () => {
    expect(DELETE_FIELD).toBe('删除字段');
    expect(menu).toContain('{DELETE_FIELD}');
  });

  it('writes through the offline kernel, not the superseded server actions', () => {
    expect(menu).toContain("table: 'collection_property'");
    expect(menu).toContain("table: 'collection_value'");
    expect(menu).toContain('await getSyncManager().flushNow()');
    expect(menu).not.toContain('updateProperty(');
    expect(menu).not.toContain('deleteProperty(');
    expect(panel).not.toContain('reorderProperties(');
  });

  it('deletes the column and its values together', () => {
    expect(menu).toContain("patch: { deletedAt: now }");
    expect(menu).toContain("row.data?.propertyId !== property.id");
  });

  it('mounts both surfaces on the table view', () => {
    expect(table).toContain('<FieldMenu property={property} />');
    expect(table).toContain('<HideOrderFieldsMenu properties={collection.properties as any} />');
    // 两处列头（分组/未分组）都要有，少一处就会有一半视图点不到
    expect(table.match(/<FieldMenu property=\{property\} \/>/g)).toHaveLength(2);
  });

  it('orders fields through the same kernel table, and says so with the official panel title', () => {
    expect(panel).toContain('{HIDE_ORDER_FIELDS}');
    expect(panel).toContain('patch: { order: row.order }');
    expect(panel).toContain('patch: { isVisible: nextVisible }');
    expect(HIDE_ORDER_FIELDS).toBe('隐藏和排序字段');
  });
});
