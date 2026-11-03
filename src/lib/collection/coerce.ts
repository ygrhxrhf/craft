/**
 * G92 —— 单元格文本 → 值的**逐类型强转**。官方规范里这一层只做三件事，宁缺毋滥：
 *
 * - `checkbox` 走 **true/false 白名单**：别的字面串不算布尔，整格判否；
 * - `date`/`datetime` 非法时**静默丢弃**（不写、不报错）——与"未知类型不写"同一条线；
 * - 其余类型原样交给后续编码（数字/百分比/货币的语义在 `cell-edit` 与 `property-types`）。
 */

export type CoerceResult = { ok: true; value: unknown } | { ok: false };

/** 官方只认这两枚字面量（大小写不敏感），不做 `yes/1/✓` 之类的本地扩展。 */
export function parseCheckboxText(text: string): boolean | null {
  const value = text.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` 或可解析的 ISO 时间串才收；非法日期（如 2026-02-31）也判否。 */
export function parseDateText(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
      return null;
    }
    return value;
  }
  const stamp = Date.parse(value);
  if (Number.isNaN(stamp)) return null;
  return new Date(stamp).toISOString();
}

/**
 * 按列类型强转一格的文本。`ok:false` 表示"这一格不落值"（静默丢弃），
 * 其余类型一律原样通过——这里不做类型推断，也不猜用户想写什么。
 */
export function coerceTextForType(type: string, text: string): CoerceResult {
  if (type === 'checkbox') {
    const value = parseCheckboxText(text);
    return value === null ? { ok: false } : { ok: true, value };
  }
  if (type === 'date' || type === 'datetime') {
    const value = parseDateText(text);
    return value === null ? { ok: false } : { ok: true, value };
  }
  return { ok: true, value: text };
}
