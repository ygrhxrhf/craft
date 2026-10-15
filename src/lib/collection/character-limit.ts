/**
 * `gap.md` G89 / G1532 —— **单字段文本长度上限 10000 字符**（官方 `dialogs.md:9` 的
 * 「单字段文本长度｜10000 字符」）。官方两句逐字（`_harvest/i18n-zh.tsv:52-53`）：
 *   `alert.character.limit.reached`「已达到字符限制」
 *   `alert.character.limit.reached.subtitle`「最多只能输入 10000 个字符」
 *
 * ☆ 这是**硬编码**的那一枚（官方明说 10000 是常量）；同一节里"表格尺寸／合集字段数／提醒数／
 *   白板元素数"那几枚是**远端配置下发**的，本仓从未采集 ⇒ 那半边留在 G1532 不动。
 */

export const CHARACTER_LIMIT = 10000;

export const CHARACTER_LIMIT_TITLE = '已达到字符限制';
export const CHARACTER_LIMIT_TITLE_KEY = 'alert.character.limit.reached';
export const CHARACTER_LIMIT_SUBTITLE = '最多只能输入 10000 个字符';
export const CHARACTER_LIMIT_SUBTITLE_KEY = 'alert.character.limit.reached.subtitle';

/** 超限时把值截到上限；未超限原样返回（纯函数，调用方据此决定要不要提示）。 */
export function clampToCharacterLimit(value: string): string {
  return value.length > CHARACTER_LIMIT ? value.slice(0, CHARACTER_LIMIT) : value;
}

/** 这次输入是否**触到了上限**（＝应当给出那两句提示）。 */
export function exceedsCharacterLimit(value: string): boolean {
  return value.length > CHARACTER_LIMIT;
}
