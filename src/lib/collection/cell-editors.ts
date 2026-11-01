/**
 * G41 —— 集合列类型各有**专用编辑组件**（`model.md` §一之七）。官方那套名册：
 * `TextEditor`/`NumberEditor`/`SelectEditor`/`MultiSelectEditor`/`DateEditor`/`PersonEditor`/
 * `PhoneEditor`/`EmailEditor`/`UrlEditor`/`RelationEditor`/`FormulaInput`/`CalculationsRow`/
 * `SidebarAttachments`。
 *
 * 本地 `PropertyCell` 是**一枚大 switch**，把每种类型内联成一个 `XxxCell` 组件；名册没有单一出处，
 * 于是"某类型有没有专用编辑器"要读 switch 才知道。本模块把名册与本地组件的对应写出来，
 * 供 UI 与测试共读。
 */

import { OFFICIAL_COLUMN_TYPES, type OfficialColumnType } from './property-types';

/** 官方的专用编辑器名册（逐字，含汇总行与侧栏附件两枚非单元格项）。 */
export const OFFICIAL_CELL_EDITORS = [
  'TextEditor',
  'NumberEditor',
  'SelectEditor',
  'MultiSelectEditor',
  'DateEditor',
  'PersonEditor',
  'PhoneEditor',
  'EmailEditor',
  'UrlEditor',
  'RelationEditor',
  'FormulaInput',
  'CalculationsRow',
  'SidebarAttachments',
] as const;

export type OfficialCellEditor = (typeof OFFICIAL_CELL_EDITORS)[number];

/**
 * 官方列类型 → 它的专用编辑器。`media` 与 `linkToBlock` 是官方 13 类里本地各用一枚现有编辑器
 * 顶上的（媒体→附件、区块链接→文本），故映射到本地实际渲染器而非发明一个官方没有的名字。
 */
export const EDITOR_BY_COLUMN_TYPE: Record<OfficialColumnType, OfficialCellEditor> = {
  text: 'TextEditor',
  number: 'NumberEditor',
  checkbox: 'SelectEditor', // 勾选框走一枚两态选择器
  date: 'DateEditor',
  url: 'UrlEditor',
  person: 'PersonEditor',
  select: 'SelectEditor',
  multiSelect: 'MultiSelectEditor',
  media: 'SidebarAttachments',
  relation: 'RelationEditor',
  linkToBlock: 'TextEditor',
  email: 'EmailEditor',
  phone: 'PhoneEditor',
};

/** 该列类型有没有专用编辑器（13 类全有）。 */
export function editorForColumnType(type: string): OfficialCellEditor | null {
  return (EDITOR_BY_COLUMN_TYPE as Record<string, OfficialCellEditor>)[type] ?? null;
}

/** 官方名册里、本地是**另一处渲染**的两枚非单元格项。 */
export const NON_CELL_EDITORS: OfficialCellEditor[] = ['CalculationsRow', 'SidebarAttachments'];

/**
 * `FormulaInput` 对应的是本地**派生列** `formula`（官方 13 类里没有它，它是本地那一枚）——
 * 记在这里，好让名册里的 13 个名字都有归属，不出现孤儿。
 */
export const LOCAL_ONLY_EDITORS: Record<string, OfficialCellEditor> = {
  formula: 'FormulaInput',
};

/** 名册里每个名字都在 13 类映射、本地派生映射或非单元格项里出现过（没有孤儿名）。 */
export function orphanEditorNames(): OfficialCellEditor[] {
  const used = new Set<string>([
    ...Object.values(EDITOR_BY_COLUMN_TYPE),
    ...Object.values(LOCAL_ONLY_EDITORS),
    ...NON_CELL_EDITORS,
  ]);
  return OFFICIAL_CELL_EDITORS.filter((name) => !used.has(name));
}

/** 13 个官方列类型都映射到了某个编辑器（判据不空转）。 */
export function everyColumnTypeHasEditor(): boolean {
  return OFFICIAL_COLUMN_TYPES.every((type) => editorForColumnType(type) !== null);
}
