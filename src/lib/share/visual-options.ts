/**
 * `gap.md` G1534 —— 发布面板 `toolbar.visual.options` 的**其余四组**（G38 已落「作者」那组）。
 * 官方每组都是"开关名＋成对状态句"（`publishing.md:58`），默认值见 `:17` 的 `Pa` 表。
 * 逐字取自 `_harvest/i18n-zh.tsv`：
 *
 *   标题   `toolbar.show.title`「显示标题」／`toolbar.page.title.shown`「将显示页面标题」
 *          ／`toolbar.page.title.hidden`「页面标题将被隐藏」（默认显示）
 *   目录   `toolbar.show.toc.title`「显示目录」／`toolbar.toc.visible`「目录可见」
 *          ／`toolbar.toc.hidden`「目录已隐藏」（默认显示，`hideTableOfContents:false`）
 *   演示模式 `toolbar.show.presentation.mode`「显示演示模式」／`toolbar.presentation.mode.visible`「演示模式可见」
 *          ／`toolbar.presentation.mode.hidden`「演示模式已隐藏」（默认显示）
 *   页脚   `toolbar.show.created.with.craft`「显示"Created With Craft"」／`toolbar.footer.refers.craft`
 *          「页脚将提及 Craft」／`toolbar.footer.refers.not.craft`「页脚将不提及 Craft」（默认显示）
 */

export interface VisualOptionCopy {
  /** 开关名（行标签）。 */
  label: string;
  labelKey: string;
  /** 开着的状态句。 */
  onText: string;
  onKey: string;
  /** 关着的状态句。 */
  offText: string;
  offKey: string;
  /** 官方默认值（`publishing.md:17`）。 */
  defaultOn: boolean;
}

export const TITLE_OPTION: VisualOptionCopy = {
  label: '显示标题',
  labelKey: 'toolbar.show.title',
  onText: '将显示页面标题',
  onKey: 'toolbar.page.title.shown',
  offText: '页面标题将被隐藏',
  offKey: 'toolbar.page.title.hidden',
  defaultOn: true,
};

export const TOC_OPTION: VisualOptionCopy = {
  label: '显示目录',
  labelKey: 'toolbar.show.toc.title',
  onText: '目录可见',
  onKey: 'toolbar.toc.visible',
  offText: '目录已隐藏',
  offKey: 'toolbar.toc.hidden',
  defaultOn: true,
};

export const PRESENTATION_OPTION: VisualOptionCopy = {
  label: '显示演示模式',
  labelKey: 'toolbar.show.presentation.mode',
  onText: '演示模式可见',
  onKey: 'toolbar.presentation.mode.visible',
  offText: '演示模式已隐藏',
  offKey: 'toolbar.presentation.mode.hidden',
  defaultOn: true,
};

export const FOOTER_OPTION: VisualOptionCopy = {
  label: '显示"Created With Craft"',
  labelKey: 'toolbar.show.created.with.craft',
  onText: '页脚将提及 Craft',
  onKey: 'toolbar.footer.refers.craft',
  offText: '页脚将不提及 Craft',
  offKey: 'toolbar.footer.refers.not.craft',
  defaultOn: true,
};

/** 四组的固定顺序（与官方 `visual.options` 面板同序）。 */
export const VISUAL_OPTIONS: readonly VisualOptionCopy[] = [
  TITLE_OPTION,
  TOC_OPTION,
  PRESENTATION_OPTION,
  FOOTER_OPTION,
];

/** 开关右侧那句状态文案（成对句）。 */
export function visualOptionStatus(option: VisualOptionCopy, on: boolean): string {
  return on ? option.onText : option.offText;
}
