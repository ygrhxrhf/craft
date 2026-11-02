import { pageThemes, type PageThemeId } from '@/components/editor/themes/page-style';

/**
 * G510 隔行颜色：官方存的是**主题色 id**（`alternatingRowColor`，经 `bU` 查表解析），不是十六进制。
 * 本地同一张表就是 `pageThemes`（文档颜色那族），所以取色与文档颜色共用一份词表。
 */

/** 关闭态：属性不输出，CSS 也不命中。 */
export const ALT_OFF = null;

/** 打开时没有已选档的落点（`default` 是透明底，画不出隔行，故从第一档实色起）。 */
export const DEFAULT_ALT_COLOR_ID: PageThemeId = pageThemes.find(
  (theme) => theme.color !== 'transparent',
)!.id;

/** 可取的实色主题档，顺序与样式面板一致。 */
export const ALT_COLOR_IDS: readonly PageThemeId[] = pageThemes
  .filter((theme) => theme.color !== 'transparent')
  .map((theme) => theme.id);

export function isAltColorId(value: unknown): value is PageThemeId {
  return typeof value === 'string' && (ALT_COLOR_IDS as readonly string[]).includes(value);
}

/**
 * 旧行里 `data-alternating` 是 `"true"`（布尔时代的产物）；读侧把它当默认档，
 * 其他非法值一律视为关闭。
 */
export function readAlternating(raw: string | null): PageThemeId | null {
  if (raw === null || raw === '' || raw === 'false') return ALT_OFF;
  if (raw === 'true') return DEFAULT_ALT_COLOR_ID;
  return isAltColorId(raw) ? raw : ALT_OFF;
}

/** 取色按钮的下一档：到末尾回到第一档（关闭另有那枚开关，不掺进循环里）。 */
export function nextAltColorId(current: PageThemeId | null): PageThemeId {
  if (!isAltColorId(current)) return DEFAULT_ALT_COLOR_ID;
  const index = ALT_COLOR_IDS.indexOf(current);
  return ALT_COLOR_IDS[(index + 1) % ALT_COLOR_IDS.length];
}

/** 查表：id → 十六进制底色；未知 id 与关闭都回 `null`。 */
export function altColorValue(id: PageThemeId | null): string | null {
  if (!isAltColorId(id)) return null;
  return pageThemes.find((theme) => theme.id === id)!.color;
}
