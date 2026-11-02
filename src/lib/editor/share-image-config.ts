/**
 * G64 「导出为分享卡片图片」的版式配置。官方面板两段：字体大小（大 / 标准 / 小）与页面大小
 * （适应文档 / 横排 / 竖排 / 正方形）。标签逐字取自 `blockdetails.share.image.panel.config.*`。
 */

export type ShareImageFontSize = 'big' | 'regular' | 'small';
export type ShareImagePageSize = 'fit' | 'landscape' | 'portrait' | 'square';

export interface ShareImageOption<T extends string> {
  id: T;
  label: string;
  key: string;
}

export const SHARE_IMAGE_FONT_SECTION = {
  label: '字体大小',
  key: 'blockdetails.share.image.panel.config.section.font.title',
} as const;

export const SHARE_IMAGE_SIZE_SECTION = {
  label: '页面大小',
  key: 'blockdetails.share.image.panel.config.section.size.title',
} as const;

export const SHARE_IMAGE_FONT_OPTIONS: readonly ShareImageOption<ShareImageFontSize>[] = [
  { id: 'big', label: '大', key: 'blockdetails.share.image.panel.config.font.big' },
  { id: 'regular', label: '标准', key: 'blockdetails.share.image.panel.config.font.regular' },
  { id: 'small', label: '小', key: 'blockdetails.share.image.panel.config.font.small' },
];

export const SHARE_IMAGE_SIZE_OPTIONS: readonly ShareImageOption<ShareImagePageSize>[] = [
  { id: 'fit', label: '适应文档', key: 'blockdetails.share.image.panel.config.size.fit' },
  { id: 'landscape', label: '横排', key: 'blockdetails.share.image.panel.config.size.landscape' },
  { id: 'portrait', label: '竖排', key: 'blockdetails.share.image.panel.config.size.portrait' },
  { id: 'square', label: '正方形', key: 'blockdetails.share.image.panel.config.size.square' },
];

export const DEFAULT_SHARE_IMAGE_FONT: ShareImageFontSize = 'regular';
export const DEFAULT_SHARE_IMAGE_SIZE: ShareImagePageSize = 'fit';

/** Root font scale; prose sizes are rem-based, so the scale is applied to `<html>` during capture. */
export const SHARE_IMAGE_FONT_SCALE: Record<ShareImageFontSize, number> = {
  big: 1.25,
  regular: 1,
  small: 0.85,
};

/**
 * The canvas the export draws into. Width stays the document's own width; the three fixed pages
 * only add vertical room (white padding) so the content is never cropped.
 */
export function shareImageCanvas(
  size: ShareImagePageSize,
  width: number,
  contentHeight: number,
): { width: number; height: number } {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(contentHeight));
  switch (size) {
    case 'landscape':
      return { width: w, height: Math.max(h, Math.round((w * 9) / 16)) };
    case 'portrait':
      return { width: w, height: Math.max(h, Math.round((w * 4) / 3)) };
    case 'square':
      return { width: w, height: Math.max(h, w) };
    case 'fit':
    default:
      return { width: w, height: h };
  }
}
