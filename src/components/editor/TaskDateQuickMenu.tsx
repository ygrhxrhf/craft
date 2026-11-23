'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Flag } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useTaskDateMenuStore } from '@/lib/store/use-task-date-menu-store';
import { useActiveEditorStore } from '@/lib/store/use-active-editor-store';
import { localDayInstant } from '@/lib/task/wall-clock';
import { parseDateExpression } from '@/lib/task/date-parse';
import { taskDateCustomLabel, taskDateMenuTitle, taskDateOptions } from '@/lib/task/task-date-menu';
import { promptDialog } from '@/lib/dialog/show';

/** G1597/G1598: the slash command opens the official four-option date panel for the task. */
export function TaskDateQuickMenu() {
  const { kind, close } = useTaskDateMenuStore();
  const [custom, setCustom] = useState(false);
  const editor = useActiveEditorStore((state) => state.editor);

  // 面板关掉后自选日期收起；渲染期跟随 `kind` 调整，不留一帧陈旧状态。
  const [lastKind, setLastKind] = useState(kind);
  if (lastKind !== kind) {
    setLastKind(kind);
    if (!kind) setCustom(false);
  }

  if (!kind) return null;

  const apply = (date: Date) => {
    const value = localDayInstant(date);
    editor?.chain().focus().updateAttributes('taskItem', kind === 'deadline' ? { dueDate: value } : { scheduleDate: value }).run();
    close();
  };

  const askCustom = async () => {
    setCustom(true);
    const raw = await promptDialog({
      title: taskDateCustomLabel(kind),
      placeholder: '明天 / 10月9日 / 2026-10-09',
      confirmLabel: '确定',
    });
    setCustom(false);
    if (raw == null || !raw.trim()) return;
    const parsed = parseDateExpression(raw.trim());
    if (parsed.ok) apply(parsed.date);
    close();
  };

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="sm:max-w-xs" data-testid="task-date-quick-menu">
        <DialogTitle className="flex items-center gap-2 text-sm font-medium">
          {kind === 'deadline' ? <Flag className="size-4" /> : <CalendarDays className="size-4" />}
          {taskDateMenuTitle(kind)}
        </DialogTitle>
        <div className="mt-1 flex flex-col">
          {taskDateOptions(kind).map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={custom}
              onClick={() => apply(option.date)}
              className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-foreground/4"
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            disabled={custom}
            onClick={() => void askCustom()}
            className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-foreground/4"
          >
            {taskDateCustomLabel(kind)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
