'use client';

import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Equal,
  MoveDown,
  MoveLeft,
  MoveRight,
  TableCellsMerge,
  TableCellsSplit,
} from 'lucide-react';
import { cn } from 'cn';
import { tableBubbleKey } from '../bubble-menu/keys';
import { clearCellContents, evalFormulas, moveTableAxis, resetColumnSizes, sortTable } from '@/lib/table-utils';

interface TableToolbarProps {
  editor: Editor;
}

function hasTableCellAncestor(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === 'tableCell' || name === 'tableHeader') return true;
  }
  return false;
}

function checkHeaderColumn(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') {
      const first = node.content.content[0];
      return first?.content.content[0]?.type.name === 'tableHeader';
    }
  }
  return false;
}

function isAlternating(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') return node.attrs.alternating === true;
  }
  return false;
}

function checkHeaderRow(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'tableRow') {
      return node.content.content[0]?.type.name === 'tableHeader';
    }
  }
  return false;
}

function applyCellAttr(editor: Editor, attr: string, value: string | null): void {
  editor.chain().focus().setCellAttribute(attr, value).run();
}

export function TableToolbar({ editor }: TableToolbarProps) {
  return (
    <TiptapBubbleMenu
      editor={editor}
      pluginKey={tableBubbleKey}
      options={{ placement: 'top' }}
      shouldShow={({ editor: ed }) => ed.isActive('table')}
    >
      <div className="flex flex-wrap items-center gap-0.5 rounded-md bg-[rgb(250,250,250)] p-1 shadow-md transition-colors duration-150 ease-craft dark:bg-[#242424]">
        <ToolButton
          title="左侧插入列"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          <MoveLeft className="size-4" />
        </ToolButton>
        <ToolButton
          title="右侧插入列"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <MoveRight className="size-4" />
        </ToolButton>
        <ToolButton
          title="删除所选列"
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 5v14" />
            <path d="M16 2h3a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-3" />
            <path d="M2 5v14a2 2 0 0 0 2 2h2" />
          </svg>
        </ToolButton>
        <ToolButton
          title="上方插入行"
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)' }}>
            <path d="M10 5v14" />
            <path d="M16 2h3a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-3" />
            <path d="M2 5v14a2 2 0 0 0 2 2h2" />
          </svg>
        </ToolButton>
        <ToolButton
          title="下方插入行"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <MoveDown className="size-4" />
        </ToolButton>
        <ToolButton title="上移行" onClick={() => moveTableAxis(editor, 'row', -1)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </ToolButton>
        <ToolButton title="下移行" onClick={() => moveTableAxis(editor, 'row', 1)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        </ToolButton>
        <ToolButton title="向左移动列" onClick={() => moveTableAxis(editor, 'col', -1)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </ToolButton>
        <ToolButton title="向右移动列" onClick={() => moveTableAxis(editor, 'col', 1)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </ToolButton>
        <ToolButton
          title="删除所选行"
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M5 5v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5" />
            <path d="M5 19v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
          </svg>
        </ToolButton>
        <div className="mx-0.5 h-5 w-px bg-foreground/8" />
        <ToolButton
          title="标题行"
          active={checkHeaderRow(editor)}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18" opacity="0.9" />
          </svg>
        </ToolButton>
        <ToolButton
          title="标题列"
          active={checkHeaderColumn(editor)}
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" opacity="0.9" />
          </svg>
        </ToolButton>
        <ToolButton
          title="隔行颜色"
          active={isAlternating(editor)}
          onClick={() =>
            editor
              .chain()
              .focus()
              .updateAttributes('table', { alternating: !isAlternating(editor) })
              .run()
          }
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        </ToolButton>
        <ToolButton
          title="合并单元格"
          onClick={() => editor.chain().focus().mergeCells().run()}
        >
          <TableCellsMerge className="size-4" />
        </ToolButton>
        <ToolButton
          title="拆分单元格"
          onClick={() => editor.chain().focus().splitCell().run()}
        >
          <TableCellsSplit className="size-4" />
        </ToolButton>
        <div className="mx-0.5 h-5 w-px bg-foreground/8" />
        <ToolButton
          title="按首列升序排序"
          onClick={() => sortTable(editor, 'asc')}
        >
          <ArrowUpAZ className="size-4" />
        </ToolButton>
        <ToolButton
          title="按首列降序排序"
          onClick={() => sortTable(editor, 'desc')}
        >
          <ArrowDownAZ className="size-4" />
        </ToolButton>
        <ToolButton title="清除单元格内容" onClick={() => clearCellContents(editor)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
        </ToolButton>
        <ToolButton title="重置列大小" onClick={() => resetColumnSizes(editor)}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16" />
            <path d="M8 8v8" />
            <path d="M16 8v8" />
          </svg>
        </ToolButton>
        <ToolButton
          title="计算公式(=SUM(A1:B3) 等)"
          onClick={() => evalFormulas(editor)}
        >
          <Equal className="size-4" />
        </ToolButton>
        <div className="mx-0.5 h-5 w-px bg-foreground/8" />
        <ColorSwatchPicker
          title="单元格背景色(双击取消)"
          onPick={(c) => applyCellAttr(editor, 'backgroundColor', c)}
        />
        <ColorSwatchPicker
          title="单元格文字色(双击取消)"
          onPick={(c) => applyCellAttr(editor, 'color', c)}
        />
      </div>
    </TiptapBubbleMenu>
  );
}

interface ToolButtonProps {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolButton({ title, active, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-md transition-colors duration-150 ease-craft',
        active
          ? 'bg-foreground/8 text-foreground'
          : 'text-foreground/55 hover:bg-foreground/4 hover:text-foreground/85'
      )}
    >
      {children}
    </button>
  );
}

function ColorSwatchPicker({
  title,
  onPick,
}: {
  title: string;
  onPick: (color: string | null) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        if (e.shiftKey) {
          onPick(null);
          return;
        }
        const input = document.createElement('input');
        input.type = 'color';
        input.oninput = () => onPick(input.value);
        input.click();
      }}
      className="flex size-7 items-center justify-center rounded-md text-foreground/55 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
        <circle cx="15" cy="9" r="1.2" fill="currentColor" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" />
      </svg>
    </button>
  );
}
