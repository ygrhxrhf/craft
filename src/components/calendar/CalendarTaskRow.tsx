'use client';

import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { isOverdue, overdueLabel } from '@/lib/task/overdue';
import { CancelledBadge } from '@/components/task/cancelled-badge';
import { useCompletedTaskAppearance } from '@/components/task/use-completed-appearance';
import { completedTaskClasses } from '@/lib/task/completed-appearance';
import type { TaskItem } from '@/actions/task/task';
import { cn } from 'cn';

/**
 * One task line in the calendar. The month grid and the timeline list the same rows, and the
 * toggle still goes through the `toggleTask` action because that is what rolls a repeating task
 * forward (`src/app/(app)/tasks/tasks-local.ts` 裁决 2).
 */
export function CalendarTaskRow({
  task,
  onToggle,
}: {
  task: TaskItem;
  onToggle: (id: string) => void;
}) {
  const appearance = useCompletedTaskAppearance();
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
      <Checkbox checked={task.isCompleted} onCheckedChange={() => onToggle(task.id)} />
      <span
        className={cn(
          'flex-1 truncate text-sm',
          (task.isCompleted || task.status === 'cancelled') && completedTaskClasses(appearance)
        )}
      >
        {task.title}
        {task.dueDate && isOverdue(task.dueDate, task.isCompleted || task.status === 'cancelled') && (
          <span className="ml-2 text-xs text-destructive">{overdueLabel(task.dueDate)}</span>
        )}
      </span>
      {task.status === 'cancelled' && <CancelledBadge cancelledAt={task.cancelledAt} />}
      {task.documentId && (
        <Link
          href={`/documents/${task.documentId}`}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <CheckSquare className="size-4" />
        </Link>
      )}
    </div>
  );
}
