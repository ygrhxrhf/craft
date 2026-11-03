'use client';

import { useReducer, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { CheckSquare, ListTree, Paperclip, Search, X } from 'lucide-react';

import {
  LEFT_TOOL_TABS,
  collectAttachments,
  collectTasks,
  type LeftToolTabId,
} from '@/lib/editor/left-tools';
import { extractToc } from '@/lib/editor/toc';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
import { cn } from 'cn';

const ICONS: Record<LeftToolTabId, React.ComponentType<{ className?: string }>> = {
  attachments: Paperclip,
  findReplace: Search,
  toc: ListTree,
  tasks: CheckSquare,
};

/**
 * G100：编辑器左侧的常驻工具栏（附件 / 查找和替换 / 目录 / 任务）。桌面常显，窄屏隐藏
 * （官方窄屏把这些收进抽屉）。「查找和替换」不在这里重复一份面板，而是打开已有的查找条
 * ——它本来就是 `FIND_IN_PAGE` 的落点。
 */
export function LeftToolRail({ editor }: { editor: Editor | null }) {
  const [version, bump] = useReducer((count: number) => count + 1, 0);
  const [active, setActive] = useReducer(
    (current: LeftToolTabId | null, next: LeftToolTabId | null) => (current === next ? null : next),
    null,
  );

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => bump();
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor]);

  const doc = editor?.state.doc;
  const attachments = collectAttachments(doc);
  const tasks = collectTasks(doc);
  const toc = extractToc(doc);

  const jump = (pos: number) => {
    editor?.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  };

  return (
    <div data-testid="left-tool-rail" data-version={version} className="hidden xl:block">
      <div className="absolute -left-12 top-16 z-20 flex flex-col gap-1">
        {LEFT_TOOL_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              aria-pressed={active === tab.id}
              data-testid={`left-tool-${tab.id}`}
              onClick={() => {
                if (tab.id === 'findReplace') {
                  useFindReplaceStore.getState().openWith(false);
                  return;
                }
                setActive(tab.id);
              }}
              className={cn(
                'flex size-8 items-center justify-center rounded-md border transition-colors',
                active === tab.id
                  ? 'border-craft-accent bg-craft-accent/10 text-foreground'
                  : 'border-foreground/8 bg-card text-foreground/55 hover:bg-foreground/4 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>

      {active && active !== 'findReplace' && (
        <div
          data-testid={`left-tool-panel-${active}`}
          className="absolute -left-2 top-16 z-30 flex max-h-[60vh] w-64 flex-col rounded-xl border border-border bg-background shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="flex-1 text-xs font-medium text-foreground/70">
              {LEFT_TOOL_TABS.find((tab) => tab.id === active)?.label}
            </span>
            <button
              type="button"
              aria-label="关闭工具面板"
              onClick={() => setActive(active)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {active === 'attachments' && (
              attachments.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">没有附件。</p>
              ) : (
                <ul className="space-y-0.5">
                  {attachments.map((entry) => (
                    <li key={`${entry.kind}-${entry.pos}`}>
                      <button
                        type="button"
                        onClick={() => jump(entry.pos)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/80 hover:bg-foreground/4"
                      >
                        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{entry.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}

            {active === 'toc' && (
              toc.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">使用标题、页面或卡片创建目录。</p>
              ) : (
                <ul className="space-y-0.5">
                  {toc.map((entry) => (
                    <li key={`${entry.pos}-${entry.text}`}>
                      <button
                        type="button"
                        onClick={() => jump(entry.pos)}
                        style={{ paddingLeft: 8 + (entry.level - 1) * 12 }}
                        className="block w-full truncate rounded-md py-1.5 pr-2 text-left text-[13px] text-foreground/80 hover:bg-foreground/4"
                      >
                        {entry.text}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}

            {active === 'tasks' && (
              tasks.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">此文档没有任务。</p>
              ) : (
                <ul className="space-y-0.5">
                  {tasks.map((entry) => (
                    <li key={`task-${entry.pos}`}>
                      <button
                        type="button"
                        onClick={() => jump(entry.pos)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/80 hover:bg-foreground/4"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'flex size-3.5 shrink-0 items-center justify-center rounded-sm border',
                            entry.checked ? 'border-craft-accent bg-craft-accent text-white' : 'border-foreground/25',
                          )}
                        >
                          {entry.checked ? '✓' : ''}
                        </span>
                        <span className={cn('truncate', entry.checked && 'text-foreground/45 line-through')}>
                          {entry.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
