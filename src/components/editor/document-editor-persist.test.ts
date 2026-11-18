// src/components/editor/document-editor-persist.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * G956 接线：右侧栏「开没开 ＋ 在哪个标签」是空间级持久态（官方跨文档保持）。
 * G988 接线：一次拖拽＝一步撤销（`closeHistory`），且拖完不抢焦点（官方 `rangeCount:0`）。
 */
const EDITOR = join(process.cwd(), 'src', 'components', 'editor', 'DocumentEditor.tsx');
const PANEL = join(process.cwd(), 'src', 'components', 'editor', 'tabs', 'RightPanel.tsx');
const DRAG = join(process.cwd(), 'src', 'components', 'editor', 'drag-handle', 'DragHandle.tsx');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function fnBody(src: string, name: string): string {
  const start = new RegExp(`(export async function ${name}\\(|const ${name} = )`).exec(src);
  expect(start, `找不到 ${name}＝接线闸的判据失效（被判的对象不存在）`).not.toBeNull();
  const open = src.indexOf('{', src.indexOf(')', start!.index));
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`${name} 的大括号没闭合`);
}

describe('右侧栏跨文档持久态（G956）', () => {
  const src = read(EDITOR);

  it('挂载后从 localStorage 读回「在哪个标签」，首帧不读（否则 hydration 失配）', () => {
    expect(src, '没有持久键').toContain("const RIGHT_TAB_STORAGE_KEY = 'craft.editor.right-tab'");
    // 初值必须与服务端一致：服务端没有 localStorage。G1486 的教训——render/初始化器里读
    // 存储，服务端与客户端首帧就会印出不同的树，重载任何开过面板的文档都报 hydration 错。
    expect(
      /useState<RightTabId \| null>\(null\)/.exec(src)?.[0],
      'activeTab 初值不是常量 null ⇒ 首帧与服务端不一致',
    ).toBeTruthy();
    // 存读取值走外部快照：服务端快照是「不可能等于真实标签」的哨兵，hydrate 后才换成
    // localStorage 里的真值（effect 里 setState 会被 react-hooks/set-state-in-effect 拦下）。
    expect(
      /useSyncExternalStore\(subscribeStoredTab, storedTabSnapshot, storedTabServerSnapshot\)/.exec(src)?.[0],
      '读回没有走服务端/客户端两套快照 ⇒ 首帧就会读出真值，hydration 失配',
    ).toBeTruthy();
    expect(
      /if \(!tabRestored && storedTab !== RIGHT_TAB_UNKNOWN\) \{[\s\S]*?setActiveTab\(storedTab as RightTabId\)/.exec(src)?.[0],
      '真值到手后没有按它调整 activeTab ⇒ 换文档后标签复位',
    ).toBeTruthy();
  });

  it('「关着」也写进持久态（否则关掉的面板在下一篇文档自己打开）', () => {
    expect(src, '没有「关着」的哨兵值').toContain("const RIGHT_TAB_CLOSED = 'closed'");
    expect(
      /localStorage\.setItem\(RIGHT_TAB_STORAGE_KEY,\s*activeTab \?\? RIGHT_TAB_CLOSED\)/.exec(src)?.[0],
      '只在 activeTab 非空时才写 ⇒ 关闭动作没被记住',
    ).toBeTruthy();
    // 读回之前不许写：首帧的 null 会先把持久值覆盖成 closed，读回就成了「永远关着」。
    expect(
      /if \(!tabRestored\) return;[\s\S]*?localStorage\.setItem\(RIGHT_TAB_STORAGE_KEY/.exec(src)?.[0],
      '写回没等读回完成 ⇒ 首帧把持久值冲掉',
    ).toBeTruthy();
  });

  it('四个标签名逐字与官方一致（G1660 后归右栏自己的 tablist）', () => {
    const panel = read(PANEL);
    for (const label of ['插入', '格式', '样式', '信息']) {
      expect(panel, `右栏 tablist 少了「${label}」`).toContain(`label: '${label}'`);
    }
    // 顶栏那排 tab 图标撤掉，入口收成一枚面板开关——标签归面板自己管，不再两处各画一遍。
    expect(src, '顶栏没有面板开关').toContain('aria-label="编辑器工具面板"');
  });

  it('面板开关关掉再开，回到上次那一档（G1660）', () => {
    // 开关管的是「开没开」，不该把「刚才停在哪一档」一起忘掉。
    expect(
      /const lastTabRef = useRef<RightTabId>\('insert'\);[\s\S]*?if \(activeTab\) lastTabRef\.current = activeTab;/.exec(src)?.[0],
      '没有记住上一档 ⇒ 关掉再开只能回默认档',
    ).toBeTruthy();
    expect(
      /setActiveTab\(\(prev\) => \(prev === null \? lastTabRef\.current : null\)\)/.exec(src)?.[0],
      '开关没按「关着就开回上一档、开着就关」工作',
    ).toBeTruthy();
  });
});

describe('拖拽的撤销与焦点（G988）', () => {
  const src = read(DRAG);
  const body = fnBody(src, 'performMove');

  it('拖拽提交前先切一次历史组，一次拖拽＝一步撤销', () => {
    expect(src, '没有引 closeHistory').toContain("import { closeHistory } from '@tiptap/pm/history'");
    expect(body, '提交没有经 closeHistory ⇒ 500ms 内两次拖拽会被并成一步').toContain('view.dispatch(closeHistory(tr))');
  });

  it('拖完不抢焦点（官方落点 rangeCount:0）', () => {
    expect(body, 'performMove 仍主动抢焦点 ⇒ 拖完选区落点与官方不同').not.toContain('view.focus()');
  });
});
