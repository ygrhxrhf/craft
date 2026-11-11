import type { PageStyle } from '@/components/editor/themes/page-style';

/**
 * G151：自定义样式保存的字段子集——「保存当前样式」捕获的就是这些可观察外观位。
 * 套用与脏态判定都走这张键表（键序固定 ⇒ 两个补丁可以直接按 JSON 比对）。
 */
export const CUSTOM_STYLE_KEYS = [
  'theme',
  'themeColor',
  'textColor',
  'backgroundColor',
  'fontPack',
  'washi',
  'separatorStyleRaw',
  'backdrop',
] as const;

export function stylePatchOf(pageStyle: Partial<PageStyle> | null | undefined): Record<string, string> {
  const patch: Record<string, string> = {};
  const source = pageStyle as Record<string, unknown> | null | undefined;
  for (const key of CUSTOM_STYLE_KEYS) {
    const value = source?.[key];
    if (typeof value === 'string' && value) patch[key] = value;
  }
  return patch;
}

/**
 * 未保存脏态：已套用某条样式之后，当前页的可观察外观又与它不一致（官方面板在套用行上
 * 点一枚小圆点）。没有套用过样式（`saved` 为空）就没有脏态概念。
 */
export function isStyleDirty(
  saved: Record<string, unknown> | null | undefined,
  current: Partial<PageStyle> | null | undefined,
): boolean {
  if (!saved) return false;
  return JSON.stringify(stylePatchOf(saved as Partial<PageStyle>)) !== JSON.stringify(stylePatchOf(current));
}