/**
 * G105 —— 筛选/排序/分组的**芯片文案模板**：
 * - filter：`{字段名} {操作符} {值}`，空/非空两种操作符不带值段；
 * - sort：`{字段名} ↑|↓`；
 * - group：`按 {字段名} 分组`。
 *
 * 同时给出「标题列永远第一位」的字段排序：标题即第一个文本属性。
 */

export function chipValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  return String(value);
}

export function filterChipText(
  propertyName: string,
  operatorLabel: string,
  value: unknown,
  takesValue: boolean,
): string {
  if (!takesValue) return `${propertyName} ${operatorLabel}`;
  const text = chipValue(value);
  return text ? `${propertyName} ${operatorLabel} ${text}` : `${propertyName} ${operatorLabel}`;
}

export function sortChipText(propertyName: string, direction: 'asc' | 'desc'): string {
  return `${propertyName} ${direction === 'asc' ? '↑' : '↓'}`;
}

export function groupChipText(propertyName: string): string {
  return `按 ${propertyName} 分组`;
}

/** Hide/show merging keeps the title column first — the title is the first text property. */
export function withTitleFirst<T extends { id: string; type: string; order?: number }>(
  properties: readonly T[],
): T[] {
  // 标题列＝按属性行 order 找出的第一枚文本列（G105 的口径），但**展示顺序以入参为准**：
  // 入参是 `fieldsForView` 按视图 `customPropertyOrder` 排好的，这里再按 order 排一次
  // 会把视图列序整份抹掉（G397 实测：视图里把列拖换了位，刷新后永远退回属性行的顺序）。
  const titleId = [...properties]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .find((property) => property.type === 'text')?.id;
  if (!titleId) return [...properties];
  const titleIndex = properties.findIndex((property) => property.id === titleId);
  if (titleIndex <= 0) return [...properties];
  const title = properties[titleIndex];
  return [title, ...properties.filter((_, index) => index !== titleIndex)];
}
