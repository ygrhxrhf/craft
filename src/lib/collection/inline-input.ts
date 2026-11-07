/**
 * G457 —— 集合的四个行内文本兄弟（`text` / `email` / `phone` / `url`）**共用同一个基础输入
 * 组件**，彼此只差 `inputMode`：`text` / `email` / `tel` / `url`。`propertyType` 允许调用方
 * 从外部覆盖（官方 `i === void 0 ? 默认 : i`），所以一个编辑器能服务多类型。
 *
 * `placeholder` 默认空串，**只有 `url` 的默认 placeholder 是 i18n 键 `style.inline.link`**
 * （官方复用行内链接的文案，`feature-catalog.md:5921` ＝「链接」）。
 */
export type InlinePropertyType = 'text' | 'email' | 'phone' | 'url';

export type InlineInputMode = 'text' | 'email' | 'tel' | 'url';

/** 四个兄弟各自的移动端键盘类型。 */
export const INLINE_INPUT_MODES: Record<InlinePropertyType, InlineInputMode> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  url: 'url',
};

/** 外部可覆盖：`override ?? 类型默认`。 */
export function inlineInputMode(
  propertyType: InlinePropertyType = 'text',
  override?: InlineInputMode,
): InlineInputMode {
  return override ?? INLINE_INPUT_MODES[propertyType];
}

/** `style.inline.link` 的中文值（行内链接文案复用给 `url` 的 placeholder）。 */
export const INLINE_LINK_PLACEHOLDER = '链接';
export const INLINE_LINK_PLACEHOLDER_KEY = 'style.inline.link';

/** 默认 placeholder：只有 `url` 有，其余是空串。 */
export function inlinePlaceholder(propertyType: InlinePropertyType = 'text'): string {
  return propertyType === 'url' ? INLINE_LINK_PLACEHOLDER : '';
}