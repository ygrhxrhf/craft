/**
 * G451 —— 单元格值是**带类型的判别对象** `{type, theme, value}`（`model.md` §一之十三 2）。
 *
 * 本地 `CollectionValue.value` 是裸 `Json?`，读侧靠 `parseValue` 硬转（数字/布尔/数组各判一次）
 * ⇒ **空值读不出这是哪种类型的空**。本模块给出判别对象与"裸值 ↔ 判别对象"的双向换算：写侧
 * 把带类型的值存成判别对象，读侧从判别对象取回裸值，好让 `null` 也能说清"哪种类型的空"。
 *
 * 官方弹层统一吃 `propMeta={id,name,theme,options?,origSchema:{type,config}}` ⇒ `theme` 是
 * 与 `type` 并列的一格，不是从 type 推的。
 */

/** 判别对象的三种取值形状。`value` 的形状由 `type` 决定，故不在这里强约束。 */
export interface TypedCellValue {
  /** 官方列类型（本地名，如 `multi_select`／`file` 也照存）。 */
  type: string;
  /** 配色主题；`null`＝无主题（默认档）。 */
  theme: string | null;
  /** 裸值；`null` 也带上类型 ⇒ 读得出"哪种类型的空"。 */
  value: unknown;
}

const THEMES = new Set(['default', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink']);

/** 把任意输入归一成判别对象。已经带 `type` 的按原样补齐缺格；裸值则按 `type` 包起来。 */
export function toTypedValue(type: string, raw: unknown): TypedCellValue {
  if (isTypedValue(raw)) {
    return { type: typeof raw.type === 'string' ? raw.type : type, theme: normalizeTheme(raw.theme), value: raw.value ?? null };
  }
  return { type, theme: null, value: raw ?? null };
}

/** 从判别对象取回裸值；不是判别对象则原样返回（读兼容）。 */
export function rawValueOf(cell: unknown): unknown {
  return isTypedValue(cell) ? cell.value : cell;
}

/**
 * 读侧统一入口：把库里读回来的单元格解成裸值。
 *
 * `CollectionValue.value` 是 `Json?`，同一格可能以三种形态到达读侧——判别对象（`db.orm` 已解码）、
 * 判别对象的 JSON 字符串（未解码），或 G451 之前的裸值。三条路都得归到裸值，否则
 * `String(cell)` 落成 `[object Object]`、筛选/排序/分组/汇总全按对象比较。
 */
export function parseCellValue(raw: unknown): unknown {
  if (raw == null || raw === '') return null;
  if (isTypedValue(raw)) return raw.value ?? null;
  if (typeof raw !== 'string') return raw;
  try {
    return rawValueOf(JSON.parse(raw));
  } catch {
    return raw;
  }
}

/** 判别对象认出来了吗——`type` 与 `value` 两格都在（`value` 允许为 `null`）。 */
export function isTypedValue(input: unknown): input is { type: unknown; theme?: unknown; value?: unknown } {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    'value' in input
  );
}

function normalizeTheme(theme: unknown): string | null {
  return typeof theme === 'string' && THEMES.has(theme) ? theme : null;
}

/**
 * 空值的类型化：`null` 也带 `type`，于是"空文本"与"空日期"读得出区别（官方那条判据的本地形态）。
 */
export function emptyTypedValue(type: string, theme: string | null = null): TypedCellValue {
  return { type, theme: normalizeTheme(theme), value: null };
}
