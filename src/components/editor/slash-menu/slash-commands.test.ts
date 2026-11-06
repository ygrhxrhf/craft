import { describe, expect, it, vi } from 'vitest';

// 名册本身是纯数据，但它 import 了 server action（`createWhiteboard`）与几个客户端模块；
// 后者会经 next-auth 拉进 `next/server`（vitest 里解析不到）⇒ 只桩掉这几处，名册照读。
vi.mock('@/actions/whiteboard/whiteboard', () => ({ createWhiteboard: vi.fn() }));
vi.mock('@/actions/collection/collection', () => ({ createCollection: vi.fn() }));
vi.mock('@/components/editor/ai/ImageGenDialog', () => ({ requestImageGen: vi.fn() }));
vi.mock('@/lib/dialog/show', () => ({ promptDialog: vi.fn() }));
vi.mock('@/lib/upload-client', () => ({ uploadFile: vi.fn() }));

import { consumedCommandNames } from '@/lib/editor/slash-roster';
import { extraSlashCommands, sizeShortcutCommand, slashCommands } from './slash-commands';

/**
 * G1544 / G1613：斜杠菜单改成官方两段形制后，本地命令名册是**映射层**——
 * 名册里指到本地命令的子项必须真的存在（否则菜单一点就空转）；名册没覆盖的本地命令
 * 进「更多」桶，保证本地能力一条不丢。
 */
describe('斜杠名册接线（G1544 / G1613）', () => {
  it('every mapped roster command exists in the local inventory', () => {
    const names = new Set(slashCommands.map((command) => command.name));
    for (const name of consumedCommandNames()) {
      expect(names.has(name), `名册指向了不存在的命令：${name}`).toBe(true);
    }
  });

  it('keeps the local-only commands reachable through the 「更多」 bucket', () => {
    const extras = extraSlashCommands().map((command) => command.name);
    expect(extras.length).toBeGreaterThan(0);
    // 本地独有能力（官方 20 入口里没有）仍在桶里。
    expect(extras).toContain('引用');
    expect(extras).toContain('全部展开');
    expect(extras).toContain('标签');
  });

  it('the four alignment tiers keep their official labels (G1616)', () => {
    const labels = slashCommands.map((command) => command.name);
    for (const label of ['左对齐', '居中对齐', '右对齐', '两端对齐']) {
      expect(labels).toContain(label);
    }
    expect(labels).toContain('默认颜色');
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

/**
 * G336：`12x3` 这类输入本身就是一条候选。官方抑制的那些（≤9 的正方形、任一边为 0）
 * 在解析层就回 `null`（正方形由名册的 2x2–9x9 八条承担），这里对齐同一口径。
 */
describe('表格尺寸快捷（G336）', () => {
  it('derives a candidate for non-square sizes only', () => {
    const wide = sizeShortcutCommand('12x3');
    expect(wide?.name).toBe('12x3');
    expect(sizeShortcutCommand('3x3')).toBeNull();
    expect(sizeShortcutCommand('随便')).toBeNull();
  });
});