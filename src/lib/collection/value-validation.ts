/**
 * G395 —— `multiSelect` 的校验是"**每个元素都必须是字符串且都在该字段选项集内**"⇒
 * **一个越界值就把整格判否**（不是"过滤掉坏值留下好值"）。`select` 同理，只是单值版。
 *
 * 这条容易写错成"逐个过滤"——那样脏值会被静默吞掉、屏幕上看起来"存成功了"，而官方的行为是
 * **整格拒绝**（用户能看出自己选的东西没存上）。
 */

export interface SelectValidationInput {
  /** 字段配置里的选项 id 集（`config.options[].id`）。 */
  optionIds: readonly string[];
  /** 待校验的值（`select` 是字符串，`multiSelect` 是字符串数组）。 */
  value: unknown;
}

export type SelectValidation =
  | { ok: true; value: string | string[] }
  | { ok: false; reason: 'not-a-string' | 'unknown-option' | 'not-an-array' };

/** 单值 `select`：必须是字符串且在该字段选项集内。空值（null/''）视为"清空"，合法。 */
export function validateSelect(input: SelectValidationInput): SelectValidation {
  const { value } = input;
  if (value === null || value === undefined || value === '') return { ok: true, value: '' };
  if (typeof value !== 'string') return { ok: false, reason: 'not-a-string' };
  if (!input.optionIds.includes(value)) return { ok: false, reason: 'unknown-option' };
  return { ok: true, value };
}

/**
 * `multiSelect`：必须是数组、每个元素都是字符串、且**每个**都在选项集内。
 * 空数组合法（清空）。
 */
export function validateMultiSelect(input: SelectValidationInput): SelectValidation {
  const { value } = input;
  if (value === null || value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, reason: 'not-an-array' };
  for (const item of value) {
    if (typeof item !== 'string') return { ok: false, reason: 'not-a-string' };
    if (!input.optionIds.includes(item)) return { ok: false, reason: 'unknown-option' };
  }
  return { ok: true, value: value as string[] };
}
