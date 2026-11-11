// src/components/editor/document-editor-persist.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * G956 接线：右侧栏「开没开 ＋ 在哪个标签」是空间级持久态（官方跨文档保持）。
 * G988 接线：一次拖拽＝一步撤销（`closeHistory`），且拖完不抢焦点（官方 `rangeCount:0`）。
 */
const EDITOR = join(process.cwd(), 'src', 'components', 'editor', 'DocumentEditor.tsx');
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

  it('挂载时从 localStorage 读回「在哪个标签」', () => {
    expect(src, '没有持久键').toContain("const RIGHT_TAB_STORAGE_KEY = 'craft.editor.right-tab'");
    expect(
      /useState<RightTabId \| null>\(\(\) => \{[\s\S]*?localStorage\.getItem\(RIGHT_TAB_STORAGE_KEY\)/.exec(src)?.[0],
      '初始值没有读 localStorage ⇒ 换文档后标签复位',
    ).toBeTruthy();
  });

  it('「关着」也写进持久态（否则关掉的面板在下一篇文档自己打开）', () => {
    expect(src, '没有「关着」的哨兵值').toContain("const RIGHT_TAB_CLOSED = 'closed'");
    expect(
      /localStorage\.setItem\(RIGHT_TAB_STORAGE_KEY,\s*activeTab \?\? RIGHT_TAB_CLOSED\)/.exec(src)?.[0],
      '只在 activeTab 非空时才写 ⇒ 关闭动作没被记住',
    ).toBeTruthy();
  });

  it('四个标签名逐字与官方一致', () => {
    for (const label of ['插入', '格式', '样式', '信息']) {
      expect(src, `标签名少了「${label}」`).toContain(`'${label}'`);
    }
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
