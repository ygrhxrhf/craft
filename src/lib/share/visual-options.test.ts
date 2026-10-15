import { describe, expect, it } from 'vitest';

import {
  FOOTER_OPTION,
  PRESENTATION_OPTION,
  TITLE_OPTION,
  TOC_OPTION,
  VISUAL_OPTIONS,
  visualOptionStatus,
} from './visual-options';

/**
 * `gap.md` G1534 —— 发布面板 `toolbar.visual.options` 其余四组。官方每组都是"开关名＋成对状态句"
 * （`publishing.md:58`），默认值见 `:17`；逐字取自 `i18n-zh.tsv:3692-3739`。
 */
describe('visual.options 其余四组（G1534）', () => {
  it('四组的开关名逐字', () => {
    expect(TITLE_OPTION.label).toBe('显示标题');
    expect(TOC_OPTION.label).toBe('显示目录');
    expect(PRESENTATION_OPTION.label).toBe('显示演示模式');
    expect(FOOTER_OPTION.label).toBe('显示"Created With Craft"');
  });

  it('成对状态句逐字（开／关两句不同）', () => {
    expect(TITLE_OPTION.onText).toBe('将显示页面标题');
    expect(TITLE_OPTION.offText).toBe('页面标题将被隐藏');
    expect(TOC_OPTION.onText).toBe('目录可见');
    expect(TOC_OPTION.offText).toBe('目录已隐藏');
    expect(PRESENTATION_OPTION.onText).toBe('演示模式可见');
    expect(PRESENTATION_OPTION.offText).toBe('演示模式已隐藏');
    expect(FOOTER_OPTION.onText).toBe('页脚将提及 Craft');
    expect(FOOTER_OPTION.offText).toBe('页脚将不提及 Craft');
    for (const o of VISUAL_OPTIONS) expect(o.onText).not.toBe(o.offText);
  });

  it('官方默认值：标题/目录/演示模式/页脚四组全默认显示', () => {
    for (const o of VISUAL_OPTIONS) expect(o.defaultOn).toBe(true);
  });

  it('状态句随开关两档切换', () => {
    expect(visualOptionStatus(TITLE_OPTION, true)).toBe('将显示页面标题');
    expect(visualOptionStatus(TITLE_OPTION, false)).toBe('页面标题将被隐藏');
  });

  it('四组按官方面板顺序排列，键名各不相同', () => {
    expect(VISUAL_OPTIONS.map((o) => o.labelKey)).toEqual([
      'toolbar.show.title',
      'toolbar.show.toc.title',
      'toolbar.show.presentation.mode',
      'toolbar.show.created.with.craft',
    ]);
  });
});
