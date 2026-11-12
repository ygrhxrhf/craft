import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./DragHandle.tsx', import.meta.url), 'utf8');

/**
 * G1472：官方的块 `⋯` 浮标不是恒 1 枚——每个「曾激活」（把手出现过）的行各留一枚 sticky，
 * 新行激活后旧的不撤（官方上限未测）。判据落在 DragHandle 的三处接线上：
 * 名册状态、渲染按 targets 展开、以及位置重算/清理。
 */
describe('sticky block handles (G1472)', () => {
  it('records every row whose handle has appeared into a sticky roster', () => {
    expect(source).toContain('const [sticky, setSticky] = useState<HandlePosition[]>([])');
    expect(source).toContain('setSticky((prev) => [...prev.filter((s) => s.blockEl !== blockEl), next])');
  });

  it('renders the live handle plus the sticky ones instead of a single handle', () => {
    expect(source).toContain('targets.map((target) => (');
    // 鼠标离开只清 live 态，不碰名册。
    expect(source).toContain('setHandle(null)');
    expect(source).not.toContain('setSticky([])');
  });

  it('re-anchors sticky tops on edits and prunes rows that left the DOM', () => {
    expect(source).toContain("editor.on('update', refreshSticky)");
    // 第 530 批：live 那枚也走同一套重算（否则插入区块后菜单动作落到隔壁块），
    // 失效判定收敛进 followBlock，返回 null 的行由 flatMap 清掉。
    expect(source).toContain('if (!s.blockEl.isConnected) return null;');
    // 折叠/隐藏的行（高度 0）也不再留浮标。
    expect(source).toContain('if (rect.height === 0) return null;');
    expect(source).toContain('setHandle((prev) => (prev ? followBlock(prev) : prev))');
    expect(source).toContain('const next = followBlock(s);');
  });
});
