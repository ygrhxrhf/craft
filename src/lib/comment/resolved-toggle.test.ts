import { describe, expect, it } from 'vitest';

import {
  HIDE_RESOLVED,
  HIDE_RESOLVED_THREADS,
  SHOW_RESOLVED,
  SHOW_RESOLVED_THREADS,
  resolvedByText,
  resolvedToggleHint,
  resolvedToggleLabel,
} from './resolved-toggle';

/**
 * `gap.md` G74 —— 评论串「显示/隐藏已解决」的短标签＋长说明两套。官方逐字
 * （`i18n-zh.tsv:883-884,944-945`／`collab.md:26` 的 R26「两套文案」）。
 */
describe('已解决开关的两套文案（G74）', () => {
  it('官方四句逐字', () => {
    expect(SHOW_RESOLVED).toBe('显示已解决');
    expect(SHOW_RESOLVED_THREADS).toBe('显示已解决的主题');
    expect(HIDE_RESOLVED).toBe('隐藏已解决');
    expect(HIDE_RESOLVED_THREADS).toBe('隐藏已解决的评论串');
  });

  it('短标签随可见性翻转（分段控件那套）', () => {
    expect(resolvedToggleLabel(true)).toBe('隐藏已解决');
    expect(resolvedToggleLabel(false)).toBe('显示已解决');
  });

  it('长说明随可见性翻转（tooltip 那套，与短标签不同句）', () => {
    expect(resolvedToggleHint(true)).toBe('隐藏已解决的评论串');
    expect(resolvedToggleHint(false)).toBe('显示已解决的主题');
    expect(resolvedToggleHint(false)).not.toBe(SHOW_RESOLVED);
  });
});

describe('resolvedByText (G74)', () => {
  it('names who resolved the thread, verbatim from web.collab.x.resolved', () => {
    expect(resolvedByText('张三')).toBe('张三标记为已解决');
  });

  it('returns null when the name is unknown — never invents half a sentence', () => {
    expect(resolvedByText(null)).toBeNull();
    expect(resolvedByText(undefined)).toBeNull();
    expect(resolvedByText('   ')).toBeNull();
  });
});
