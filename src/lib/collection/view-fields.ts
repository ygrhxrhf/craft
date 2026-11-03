/**
 * G81 —— 字段的可见性与顺序是**每个视图一套**（官方视图 config 的 `hiddenProperties` /
 * `customPropertyOrder`，20 键里的两枚）。本地此前把两者挂在属性行上（`isVisible`/`order`），
 * 全合集共用一份；这里把"视图那一套"做成纯核，表格视图读它来算要渲染哪些列。
 *
 * 兼容口径：属性行上的 `isVisible=false` 仍是**全局下线**（没有"按视图强行打开"的官方证据），
 * 视图只能在其之上再隐藏、以及重排。
 */

export interface ViewFields {
  /** 本视图额外隐藏的字段 id。 */
  hidden: readonly string[];
  /** 本视图的字段顺序；不在表里的字段按属性行 `order` 排在后面。 */
  order: readonly string[];
}

export const EMPTY_VIEW_FIELDS: ViewFields = { hidden: [], order: [] };

export interface FieldLike {
  id: string;
  order: number;
  isVisible: boolean;
}

/** 从视图 config（对象或 JSON 串）读出两枚键；读不懂就当空。 */
export function readViewFields(config: unknown): ViewFields {
  let value = config;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return EMPTY_VIEW_FIELDS;
    }
  }
  if (!value || typeof value !== 'object') return EMPTY_VIEW_FIELDS;
  const record = value as Record<string, unknown>;
  const ids = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((id): id is string => typeof id === 'string') : [];
  return {
    hidden: ids(record.hiddenProperties),
    order: ids(record.customPropertyOrder),
  };
}

/** 该视图实际渲染的字段：先按视图顺序、再按行 `order`，去掉全局下线与本视图隐藏的。 */
export function fieldsForView<T extends FieldLike>(properties: readonly T[], fields: ViewFields): T[] {
  const hidden = new Set(fields.hidden);
  const rank = new Map(fields.order.map((id, index) => [id, index]));
  return properties
    .filter((property) => property.isVisible && !hidden.has(property.id))
    .slice()
    .sort((left, right) => {
      const leftRank = rank.get(left.id);
      const rightRank = rank.get(right.id);
      if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
      if (leftRank !== undefined) return -1;
      if (rightRank !== undefined) return 1;
      return left.order - right.order;
    });
}

/** 隐藏/显示一枚字段（写进本视图的 `hiddenProperties`）。 */
export function toggleFieldHidden(fields: ViewFields, id: string): ViewFields {
  const hidden = fields.hidden.includes(id)
    ? fields.hidden.filter((entry) => entry !== id)
    : [...fields.hidden, id];
  return { ...fields, hidden };
}

/**
 * 在**当前可见顺序**里把一枚字段上/下移一格，并把整份顺序写进 `customPropertyOrder`。
 * `visibleIds` 是屏上此刻的列序（已含视图顺序与行 order 的合成结果）。
 */
export function moveField(fields: ViewFields, visibleIds: readonly string[], id: string, delta: -1 | 1): ViewFields {
  const order = [...visibleIds];
  const index = order.indexOf(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= order.length) return fields;
  [order[index], order[target]] = [order[target], order[index]];
  return { ...fields, order };
}
