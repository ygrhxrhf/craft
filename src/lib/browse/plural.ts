/**
 * G291 —— **单复数双键是系统性的**：官方状态回显文案按数量分档（`...one...` / `...x...`），
 * 不是把数字套进同一句模板。英文下这一差别可见（"1 field" / "2 fields"），中文多数两档同字，
 * 但键仍然分开，所以这里按家族给出成对的纯函数，调用方只报数量。
 *
 * 七个家族（键与官方中文逐字）：
 * 1. `collections.filtered.by.one.field` / `…x.fields`
 * 2. `collections.sorted.by.one.field` / `…x.fields`
 * 3. `collections.grouped.by.one.field` / `…x.fields`（另有裸计数档 `collections.grouped.by.x`）
 * 4. `table.delete.one.row` / `table.delete.rows`
 * 5. `table.move.one.column.left` / `table.move.columns.left`
 * 6. `collections.x.change.applied` / `collections.x.changes.applied`
 * 7. `collections.one.hidden.field` / `collections.x.hidden.fields`
 */

function isOne(count: number): boolean {
  return count === 1;
}

/** 负数/NaN/小数一律落到 0 —— 状态行不出现 "NaN 个字段"。 */
function countOf(count: number): number {
  const n = Math.trunc(count);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const FILTERED_BY_ONE_FIELD_KEY = 'collections.filtered.by.one.field';
export const FILTERED_BY_ONE_FIELD = '按 1 个字段筛选';
export const FILTERED_BY_X_FIELDS_KEY = 'collections.filtered.by.x.fields';
export const FILTERED_BY_X_FIELDS = '按 [0] 个字段筛选';

export function filteredByLabel(count: number): string {
  const n = countOf(count);
  return isOne(n) ? FILTERED_BY_ONE_FIELD : FILTERED_BY_X_FIELDS.replace('[0]', String(n));
}

export const SORTED_BY_ONE_FIELD_KEY = 'collections.sorted.by.one.field';
export const SORTED_BY_ONE_FIELD = '按 1 个字段排序';
export const SORTED_BY_X_FIELDS_KEY = 'collections.sorted.by.x.fields';
export const SORTED_BY_X_FIELDS = '按 [0] 个字段排序';

export function sortedByLabel(count: number): string {
  const n = countOf(count);
  return isOne(n) ? SORTED_BY_ONE_FIELD : SORTED_BY_X_FIELDS.replace('[0]', String(n));
}

export const GROUPED_BY_ONE_FIELD_KEY = 'collections.grouped.by.one.field';
export const GROUPED_BY_ONE_FIELD = '按 1 个字段分组';
export const GROUPED_BY_X_FIELDS_KEY = 'collections.grouped.by.x.fields';
export const GROUPED_BY_X_FIELDS = '按 [0] 个字段分组';
/** 裸计数档（`collections.grouped.by.x`「按 [0] 分组」）——没有 the field 这个词。 */
export const GROUPED_BY_X_KEY = 'collections.grouped.by.x';
export const GROUPED_BY_X = '按 [0] 分组';

export function groupedByLabel(count: number): string {
  const n = countOf(count);
  return isOne(n) ? GROUPED_BY_ONE_FIELD : GROUPED_BY_X_FIELDS.replace('[0]', String(n));
}

export const DELETE_ONE_ROW_KEY = 'table.delete.one.row';
export const DELETE_ONE_ROW = '删除行';
export const DELETE_ROWS_KEY = 'table.delete.rows';
export const DELETE_ROWS = '删除行';

export function deleteRowsLabel(count: number): string {
  return isOne(countOf(count)) ? DELETE_ONE_ROW : DELETE_ROWS;
}

export const MOVE_ONE_COLUMN_LEFT_KEY = 'table.move.one.column.left';
export const MOVE_ONE_COLUMN_LEFT = '向左移动列';
export const MOVE_COLUMNS_LEFT_KEY = 'table.move.columns.left';
export const MOVE_COLUMNS_LEFT = '向左移动列';

export function moveColumnsLeftLabel(count: number): string {
  return isOne(countOf(count)) ? MOVE_ONE_COLUMN_LEFT : MOVE_COLUMNS_LEFT;
}

export const CHANGE_APPLIED_KEY = 'collections.x.change.applied';
export const CHANGE_APPLIED = '已应用 [0] 项更改';
export const CHANGES_APPLIED_KEY = 'collections.x.changes.applied';
export const CHANGES_APPLIED = '已应用 [0] 项更改';

export function changeAppliedLabel(count: number): string {
  const n = countOf(count);
  return isOne(n) ? CHANGE_APPLIED.replace('[0]', '1') : CHANGES_APPLIED.replace('[0]', String(n));
}

export const ONE_HIDDEN_FIELD_KEY = 'collections.one.hidden.field';
export const ONE_HIDDEN_FIELD = '1 个隐藏字段';
export const X_HIDDEN_FIELDS_KEY = 'collections.x.hidden.fields';
export const X_HIDDEN_FIELDS = '[0] 隐藏字段';

export function hiddenFieldsLabel(count: number): string {
  const n = countOf(count);
  return isOne(n) ? ONE_HIDDEN_FIELD : X_HIDDEN_FIELDS.replace('[0]', String(n));
}

/**
 * 集合视图的**状态行**：只有真的存在的档才出现，用 ` · ` 串起来（官方那行就是这几段的拼接）。
 * 三档都空时返回空串 —— 状态行整行不渲染。
 */
export function collectionStatusLabel(input: {
  filters: number;
  sorts: number;
  grouped: boolean;
}): string {
  return [
    input.filters > 0 ? filteredByLabel(input.filters) : '',
    input.sorts > 0 ? sortedByLabel(input.sorts) : '',
    input.grouped ? groupedByLabel(1) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}