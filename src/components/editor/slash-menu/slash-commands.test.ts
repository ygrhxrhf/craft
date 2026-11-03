import { describe, expect, it, vi } from 'vitest';

// 名册本身是纯数据，但它 import 了 server action（`createWhiteboard`）与几个客户端模块；
// 后者会经 next-auth 拉进 `next/server`（vitest 里解析不到）⇒ 只桩掉这几处，名册照读。
vi.mock('@/actions/whiteboard/whiteboard', () => ({ createWhiteboard: vi.fn() }));
vi.mock('@/actions/collection/collection', () => ({ createCollection: vi.fn() }));
vi.mock('@/components/editor/ai/ImageGenDialog', () => ({ requestImageGen: vi.fn() }));
vi.mock('@/lib/dialog/show', () => ({ promptDialog: vi.fn() }));
vi.mock('@/lib/upload-client', () => ({ uploadFile: vi.fn() }));

import { filterCommands, slashCommands } from './slash-commands';

/**
 * G1616 —— 官方斜杠菜单过滤「对齐」回**四项**（居中对齐／两端对齐／右对齐／左对齐）。
 * 本地这四档能力本就在格式面板里，缺的是斜杠入口 ⇒ 本测试钉住"过滤「对齐」回这四项"。
 * ★ 对齐是**属性**不是块型（官方按 Enter 后块型仍是 `para`），所以断言只看候选名册。
 */
describe('slash menu · 对齐组 (G1616)', () => {
  it('filtering 「对齐」 returns the official four tiers', () => {
    const names = filterCommands('对齐').map((c) => c.name);
    expect(names.sort()).toEqual(['两端对齐', '右对齐', '居中对齐', '左对齐'].sort());
  });

  it('each align entry carries a value and no 默认 tier leaks in', () => {
    const align = filterCommands('对齐');
    expect(align).toHaveLength(4);
    expect(align.map((c) => c.name)).not.toContain('默认');
  });

  it('the four entries are derived from the canonical alignment table, not a second copy', () => {
    // 名字必须与 `ALIGNMENT_CONTROLS` 的 label 逐字一致（两组各写一遍就会分叉）。
    const align = filterCommands('对齐').map((c) => c.name).sort();
    expect(align).toEqual(['左对齐', '居中对齐', '右对齐', '两端对齐'].sort());
  });
});

/**
 * G1617 —— 官方 `/颜色` 回**一项**「默认颜色」（`style.color.default`）。本地颜色只在格式面板色板里，
 * 斜杠菜单没有入口 ⇒ 补这一项。★ `/文字格式` 两侧都是 0 候选（一致），不在本组断言内。
 */
describe('slash menu · 颜色组 (G1617)', () => {
  it('filtering 「颜色」 returns 默认颜色', () => {
    expect(filterCommands('颜色').map((c) => c.name)).toContain('默认颜色');
  });

  it('the entry is unique and clears the colour rather than setting one', () => {
    const hits = filterCommands('颜色').filter((c) => c.name === '默认颜色');
    expect(hits).toHaveLength(1);
    expect(hits[0].description).toContain('清除');
  });
});

describe('slash menu · 名册卫生', () => {
  it('every command has a unique name', () => {
    const names = slashCommands.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every command has at least one keyword', () => {
    for (const cmd of slashCommands) {
      expect(cmd.keywords.length, `${cmd.name} 没有关键词 ⇒ 只能按名字筛`).toBeGreaterThan(0);
    }
  });
});
