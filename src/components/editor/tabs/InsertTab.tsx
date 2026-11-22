'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { GripVertical, FileText } from 'lucide-react';
import { cn } from 'cn';
import { UnsplashDialog } from './UnsplashDialog';
import { slashCommands } from '../slash-menu/slash-commands';
import { SIDEBAR_SLASH_COMMAND_MIME } from '@/lib/dnd/sidebar-drag';
import { sidebarDragState } from '@/lib/dnd/sidebar-drag';
import type { SlashCommand } from '../slash-menu/slash-commands';
import {
  INSERT_PANEL_SUBTITLE,
  INSERT_SUBVIEW_IDS,
  INSERT_SUBVIEW_LABELS,
  MARKDOWN_SHORTCUTS,
  MARKDOWN_SHORTCUTS_TITLE,
  type InsertSubView,
} from '@/lib/editor/insert-panel';
import {
  TABLE_GRID_COLS,
  TABLE_GRID_ROWS,
  cellInPreview,
  tableSizeAtCell,
  type TableSize,
} from '@/lib/editor/table-grid-picker';

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
  /** Direct insert when the object has no slash command (the page block, G207). */
  onInsert?: (editor: Editor) => void;
  /** This build cannot create it yet. */
  missing?: boolean;
  /** Opens an inline picker instead of inserting directly (the official row/column grid). */
  picker?: 'tableGrid';
  /** Official-only note printed under the label. */
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const UNTITLED_ITEMS: PanelItem[] = [
  { label: '文本', command: '文本' },
  { label: '页面', icon: FileText, onInsert: (editor) => editor.chain().focus().setPageBlock().run() },
  { label: '卡片', command: '卡片' },
  { label: '文件附件', command: '文件附件' },
  { label: '图片', command: '图片' },
  { label: '插入 Unsplash 图片', missing: true },
  { label: '代码块', command: '代码块' },
  { label: '公式（TeX）', command: '公式' },
  { label: 'Mermaid 图表', command: 'Mermaid 图表' },
  { label: '白板', command: '白板' },
];

const COLLECTION_ITEMS: PanelItem[] = [
  // G214：官方「合集」组下这三条都是集合对象（表格／画廊／看板三种初始视图）。
  { label: '表格', command: '插入表格集合' },
  { label: '图库', command: '插入画廊集合' },
  { label: 'Kanban', command: '插入看板集合' },
];

const TAIL_ITEMS: PanelItem[] = [
  { label: '插入 线', command: '分隔线 - 常规' },
  { label: '插入分页符', command: '插入分页符' },
  // 官方末项带提示语且是**行列网格选择器**（V10 屏侧读回），不是固定 3×3。
  { label: '插入表格', picker: 'tableGrid', hint: '插入一个包含所选行数和列数的表格。' },
];

const PANEL_ITEMS: { title?: string; items: PanelItem[] }[] = [
  { items: UNTITLED_ITEMS },
  { title: '合集', items: COLLECTION_ITEMS },
  { items: TAIL_ITEMS },
];

export function InsertTab({ editor }: InsertTabProps) {
  const [subView, setSubView] = useState<InsertSubView>('insert');
  const [gridOpen, setGridOpen] = useState(false);
  const [gridHover, setGridHover] = useState<TableSize | null>(null);
  // G1675：这一格能不能用取决于服务端有没有配 `UNSPLASH_ACCESS_KEY`（未配回 501）。
  const [unsplashReady, setUnsplashReady] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/unsplash/search?q=probe')
      .then((response) => {
        if (alive) setUnsplashReady(response.status !== 501);
      })
      .catch(() => {
        if (alive) setUnsplashReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);
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
      {/* G67：官方插入面板有**两个子视图**（`插入` 与 `快捷方式`）——`sidebar.insert.shortcuts`
          「快捷方式」＋`blockdetails.shortcuts.markdown`「Markdown 快捷方式」。此前本地只有一档。 */}
      <div className="mb-3 flex gap-1" role="tablist" aria-label="插入面板视图">
        {INSERT_SUBVIEW_IDS.map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={view === subView}
            data-testid={`insert-subview-${view}`}
            onClick={() => setSubView(view)}
            className={cn(
              'rounded-md px-2.5 py-1 text-[12px] transition-colors',
              view === subView
                ? 'bg-foreground/8 font-medium text-foreground'
                : 'text-muted-foreground hover:bg-foreground/4',
            )}
          >
            {INSERT_SUBVIEW_LABELS[view]}
          </button>
        ))}
      </div>

      {subView === 'shortcuts' ? (
        <div data-testid="insert-shortcuts-view">
          <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {MARKDOWN_SHORTCUTS_TITLE}
          </h4>
          {/* 只列本地**真的会触发**的规则（源自 `markdown-shortcuts.ts` 的输入规则表）。 */}
          <ul className="space-y-1">
            {MARKDOWN_SHORTCUTS.map((rule) => (
              <li
                key={rule.syntax}
                className="flex items-center justify-between gap-3 rounded-lg bg-foreground/4 px-2.5 py-1.5 text-[12px]"
              >
                <span>{rule.label}</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground/70">
                  {rule.syntax}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {/* `sidebar.insert.subtitle`, verbatim. */}
          <p className="mb-3 text-[11px] text-muted-foreground">{INSERT_PANEL_SUBTITLE}</p>
          {PANEL_ITEMS.map((group, i) => (
        <div key={group.title ?? `flat-${i}`} className="mb-3">
          {group.title && (
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </h4>
          )}
          <div className="space-y-2">
            {group.items.map((item) => {
              const cmd = findCommand(item);
              // G1675：Unsplash 那一格接上了图库服务（`/api/unsplash/search`）；只有配置了
              // `UNSPLASH_ACCESS_KEY` 才换成选择器，否则仍是原来的禁用占位。
              if (item.label === '插入 Unsplash 图片' && unsplashReady) {
                return (
                  <UnsplashDialog
                    key={item.label}
                    onPick={(url, alt) =>
                      editor
                        .chain()
                        .focus()
                        .insertContent({ type: 'imageBlock', attrs: { src: url, alt } })
                        .run()
                    }
                  />
                );
              }
              const unavailable = item.missing || (!cmd && !item.onInsert && !item.picker);
              const draggable = !unavailable && !!cmd;
              const Icon = item.icon ?? cmd?.icon;
              const isGrid = item.picker === 'tableGrid';
              const insertAt = (size: TableSize) => {
                const { from, to } = editor.state.selection;
                const range = from === to ? { from, to: from } : { from, to };
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true })
                  .run();
                setGridOpen(false);
                setGridHover(null);
              };
              return (
                <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  draggable={draggable}
                  onDragStart={draggable ? (e) => handleDragStart(e, cmd!) : undefined}
                  onDragEnd={draggable ? handleDragEnd : undefined}
                  onClick={
                    unavailable
                      ? undefined
                      : isGrid
                        ? () => {
                            setGridOpen((open) => !open);
                            setGridHover(null);
                          }
                        : cmd
                          ? () => handleInsert(cmd)
                          : () => item.onInsert!(editor)
                  }
                  disabled={unavailable}
                  data-disabled={unavailable || undefined}
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2',
                    'text-[13px] text-foreground shadow-xxs transition-colors',
                    unavailable
                      ? ''
                      : draggable
                        ? 'hover:bg-muted cursor-grab active:cursor-grabbing'
                        : 'hover:bg-muted'
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                    {Icon ? (
                      <Icon className="size-3.5 text-muted-foreground" />
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
                  {draggable && <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />}
                </button>
                  {isGrid && gridOpen && (
                    <div
                      data-testid="table-grid-picker"
                      onMouseLeave={() => setGridHover(null)}
                      className="rounded-lg border border-border bg-background p-2"
                    >
                      <p className="mb-1.5 text-[10px] text-muted-foreground/60">
                        {gridHover ? `${gridHover.rows} × ${gridHover.cols}` : '选择行数和列数'}
                      </p>
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${TABLE_GRID_COLS}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: TABLE_GRID_ROWS }, (_, row) =>
                          Array.from({ length: TABLE_GRID_COLS }, (_, col) => {
                            const size = tableSizeAtCell(row, col);
                            const active = cellInPreview({ row, col }, gridHover);
                            return (
                              <button
                                key={`${row}-${col}`}
                                type="button"
                                aria-label={`${size.rows} 行 ${size.cols} 列`}
                                data-active={active ? 'true' : undefined}
                                onMouseEnter={() => setGridHover(size)}
                                onClick={() => insertAt(size)}
                                className={cn(
                                  'size-4 rounded-sm border transition-colors',
                                  active
                                    ? 'border-ring bg-primary/30'
                                    : 'border-border bg-muted/30 hover:bg-muted'
                                )}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}
