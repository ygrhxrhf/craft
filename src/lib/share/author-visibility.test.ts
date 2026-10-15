import { describe, expect, it } from 'vitest';

import {
  AUTHOR_HIDDEN_LABEL,
  AUTHOR_SHOWN_LABEL,
  BY_AUTHOR_TEMPLATE,
  DEFAULT_SHOW_AUTHOR,
  SHOW_AUTHOR_LABEL,
  authorByline,
  authorStatusLabel,
  showsAuthor,
} from './author-visibility';

/**
 * `gap.md` G38 —— 发布页「显示作者」一组。官方逐字（`i18n-zh.tsv:3669-3670,3726,854`）：
 * 开关「显示作者」／状态句「作者将显示」·「不显示作者」／署名模板「来自 [0]」。
 */
describe('发布页作者可见性（G38）', () => {
  it('官方文案逐字', () => {
    expect(SHOW_AUTHOR_LABEL).toBe('显示作者');
    expect(AUTHOR_SHOWN_LABEL).toBe('作者将显示');
    expect(AUTHOR_HIDDEN_LABEL).toBe('不显示作者');
    expect(BY_AUTHOR_TEMPLATE).toBe('来自 [0]');
  });

  it('默认显示作者（官方 showAuthor: true）', () => {
    expect(DEFAULT_SHOW_AUTHOR).toBe(true);
  });

  it('只有显式 false 才隐藏：undefined／null／旧行缺列都按默认显示', () => {
    expect(showsAuthor(undefined)).toBe(true);
    expect(showsAuthor(null)).toBe(true);
    expect(showsAuthor('strike')).toBe(true);
    expect(showsAuthor(0)).toBe(true);
    expect(showsAuthor(false)).toBe(false);
    expect(showsAuthor(true)).toBe(true);
  });

  it('状态句随开关两档切换（成对句）', () => {
    expect(authorStatusLabel(true)).toBe('作者将显示');
    expect(authorStatusLabel(false)).toBe('不显示作者');
  });

  it('署名把作者名填进模板；作者名为空则不产署名', () => {
    expect(authorByline('张三')).toBe('来自 张三');
    expect(authorByline('  ')).toBe('');
    expect(authorByline(null)).toBe('');
    expect(authorByline(undefined)).toBe('');
  });
});
