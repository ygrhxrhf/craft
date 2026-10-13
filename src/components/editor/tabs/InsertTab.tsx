'use client';

import type { Editor } from '@tiptap/react';
import { GripVertical } from 'lucide-react';
import { cn } from 'cn';
import { slashCommands } from '../slash-menu/slash-commands';
import { SIDEBAR_SLASH_COMMAND_MIME } from '@/lib/dnd/sidebar-drag';
import { sidebarDragState } from '@/lib/dnd/sidebar-drag';
import type { SlashCommand } from '../slash-menu/slash-commands';

interface InsertTabProps {
  editor: Editor;
}

/**
 * The official panel structure, from `interactions.md:110` (V10 correction, captured twice at
 * byte-identical length): a flat untitled group, one 「合集」 group title, and three tail rows —
 * 16 entries in total, NOT this build's slash-command list grouped seven ways.
 *
 * `panels.md §一` claims three sections (插入/列表/媒体) off the language pack alone (`~` copy,
 * behaviour unverified), while V10 found those three Chinese strings at zero occurrences on
 * screen; the screen capture wins and the disagreement is left declared.
 *
 * `local: null` marks an entry this build cannot produce yet. They are drawn disabled rather than
 * hidden: the official structure is a collected fact, "we cannot build it" is local state, and
 * both should be visible — the same call the shortcuts panel made for its unbound groups.
 */
interface PanelItem {
  label: string;
  /** Slash command whose name differs from the official label. */
  command?: string;
  /** This build cannot create it yet. */
  missing?: boolean;
  /** Official-only note printed under the label. */
  hint?: string;
}

const UNTITLED_ITEMS: PanelItem[] = [
  { label: '文本', command: '文本' },
  { label: '页面', missing: true },
  { label: '卡片', command: '卡片' },
  { label: '文件附件', command: '文件附件' },
  { label: '图片', command: '图片' },
  { label: '插入 Unsplash 图片', missing: true },
  { label: '代码块', command: '代码块' },
  { label: '公式（TeX）', command: '公式' },
  { label: 'Mermaid 图表', missing: true },
  { label: '白板', command: '白板' },
];

const COLLECTION_ITEMS: PanelItem[] = [
  // Official 「合集」 组下是三种集合对象 (G214); the local 表格 slash command is a table *block*
  // and is deliberately not mapped onto this row — different object, same word.
  { label: '表格', missing: true },
  { label: '图库', missing: true },
  { label: 'Kanban', missing: true },
];

const TAIL_ITEMS: PanelItem[] = [
  { label: '插入 线', command: '分隔线' },
  { label: '插入分页符', missing: true },
  { label: '插入表格', missing: true, hint: '插入一个包含所选行数和列数的表格。' },
];

const PANEL_ITEMS: { title?: string; items: PanelItem[] }[] = [
  { items: UNTITLED_ITEMS },
  { title: '合集', items: COLLECTION_ITEMS },
  { items: TAIL_ITEMS },
];

export function InsertTab({ editor }: InsertTabProps) {
  const findCommand = (item: PanelItem): SlashCommand | undefined =>
    item.command ? slashCommands.find((c) => c.name === item.command) : undefined;

  const handleInsert = (cmd: SlashCommand) => {
    const { from, to } = editor.state.selection;
    const range = from === to ? { from, to: from } : { from, to };
    cmd.command(editor, range);
  };

  const handleDragStart = (e: React.DragEvent, cmd: SlashCommand) => {
    const payload = { kind: 'slash-command' as const, name: cmd.name, category: cmd.category };
    // sidebar-drop.tsx 的 window dragstart 捕获依赖此共享引用作为 pending 暂存,
    // 组件状态在原生 DnD 事件下不可靠,故直接改写模块级对象。
    // eslint-disable-next-line react-hooks/immutability
    sidebarDragState.payload = payload;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(SIDEBAR_SLASH_COMMAND_MIME, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', cmd.name);
  };

  const handleDragEnd = () => {
    sidebarDragState.payload = null;
  };

  return (
    <div className="p-3" data-testid="insert-panel">
      {/* `sidebar.insert.subtitle`, verbatim. */}
      <p className="mb-3 text-[11px] text-muted-foreground">将任何项目拖放到文档中</p>

      {PANEL_ITEMS.map((group) => (
        <div key={group.title ?? 'flat'} className="mb-3">
          {group.title && (
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </h4>
          )}
          <div className="space-y-2">
            {group.items.map((item) => {
              const cmd = findCommand(item);
              const unavailable = item.missing || !cmd;
              return (
                <button
                  key={item.label}
                  type="button"
                  draggable={!unavailable}
                  onDragStart={unavailable ? undefined : (e) => handleDragStart(e, cmd!)}
                  onDragEnd={unavailable ? undefined : handleDragEnd}
                  onClick={unavailable ? undefined : () => handleInsert(cmd!)}
                  disabled={unavailable}
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2',
                    'text-[13px] text-foreground shadow-xxs transition-colors',
                    unavailable
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-muted cursor-grab active:cursor-grabbing'
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                    {cmd ? (
                      <cmd.icon className="size-3.5 text-muted-foreground" />
                    ) : (
                      <GripVertical className="size-3.5 text-muted-foreground/40" />
                    )}
                  </span>
                  <span className="flex-1 truncate text-left leading-tight">
                    {/* Its own element: the label must be matchable verbatim on its own, not only
                        as a prefix of "label + 本地暂未实现". */}
                    <span>{item.label}</span>
                    {unavailable && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground/70">本地暂未实现</span>
                    )}
                    {item.hint && (
                      <span className="block text-[10px] text-muted-foreground/60">{item.hint}</span>
                    )}
                  </span>
                  {!unavailable && <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
