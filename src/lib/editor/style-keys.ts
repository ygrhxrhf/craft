/**
 * G1584：表 A 里四枚独立键位（PAGE / CARD / FOCUS_DECOR / BLOCK_DECOR）的本地落点。
 *
 * 官方 `Ctrl-Shift-P` 是真的插出一枚页面块；本地页面由子文档表示，正文里没有页中页块
 *（G1408／G1572 的「本地根本没有」），所以键位插的是「页面预览」原子块：按下先出一个
 * 占位预览，点它才创建子页并跳过去。其余三枚都落在已有命令上。
 */

import type { DecorationColorName } from './format-commands';

export const PAGE_PREVIEW_COPY = '页面预览将显示在此处。单击以添加内容。';

/** 官方卡片配置面板逐字采集到的五条文案（第 326 批）。 */
export const CARD_CONFIG = {
  title: '配置卡片',
  style: '套用样式',
  preview: '预览',
  customBackground: '自定义背景',
  custom: '自定义',
} as const;

export interface CardBackgroundPreset {
  id: string;
  label: string;
  color: string;
}

/** 「套用样式」的色名没有采集到，本地按面板现有的七色语汇取名。 */
export const CARD_BACKGROUND_PRESETS: readonly CardBackgroundPreset[] = [
  { id: 'white', label: '白色', color: '#ffffff' },
  { id: 'yellow', label: '黄色', color: '#fef3c7' },
  { id: 'green', label: '绿色', color: '#dcfce7' },
  { id: 'blue', label: '蓝色', color: '#dbeafe' },
  { id: 'purple', label: '紫色', color: '#ede9fe' },
  { id: 'pink', label: '粉色', color: '#fce7f3' },
];

/** 两枚装饰键只在「无装饰」与第一档颜色之间切换：再按一次清除。 */
export const STYLE_KEY_DECORATION: DecorationColorName = 'red';

export function toggledDecoration(current: string | null): DecorationColorName | null {
  return current ? null : STYLE_KEY_DECORATION;
}

export function cardPresetColor(id: string): string | null {
  return CARD_BACKGROUND_PRESETS.find((preset) => preset.id === id)?.color ?? null;
}
