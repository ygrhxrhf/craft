/**
 * G148 代码块详情的两枚视图开关：拆分视图与关闭预览。标签逐字取自
 * `blockdetails.code.split.view` / `blockdetails.code.close.preview`。
 * 本地只有 mermaid 有独立的预览面，其余语言没有可拆的预览。
 */

export const CODE_SPLIT_VIEW = { label: '拆分视图', key: 'blockdetails.code.split.view' } as const;
export const CODE_CLOSE_PREVIEW = { label: '关闭预览', key: 'blockdetails.code.close.preview' } as const;

export function hasCodePreview(language: string | null | undefined): boolean {
  return language === 'mermaid';
}
