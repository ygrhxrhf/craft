'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, CalendarClock, CheckSquare, FileText, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';
import { RECURRENCE_PRESETS } from '@/lib/task/recurrence';
import {
  createTask,
  deleteTask,
  getTasks,
  setTaskSchedule,
  toggleTask,
} from '@/actions/task/task';
import type { TaskItem, TaskSchedule } from '@/actions/task/task';
import { getSyncManager } from '@/lib/sync-core';
import { currentUserId } from '@/lib/sync-core/current-user';
import { taskPatchFor } from './tasks-local';
import { applyCompletedFilter, tasksForGroup, withinUpcoming, type TaskGroup, type UpcomingWindow } from '@/lib/task/grouping';
import { upcomingSections } from '@/lib/task/upcoming-groups';
import { ShowCompletedToggle } from '@/components/task/ShowCompletedToggle';
import { TASK_GROUP_LABELS, TASKS_ADD_TASK, TASK_VIEW_EMPTY } from '@/lib/task/official-copy';
import {
  SET_AS_DEFAULT_VIEW,
  defaultViewRedirect,
  readDefaultTaskGroup,
  storeDefaultTaskGroup,
  taskGroupHref,
  type TaskGroupId,
} from '@/lib/task/default-view';
import { isOverdue, overdueLabel } from '@/lib/task/overdue';
import { CANCELLED_LABEL } from '@/lib/editor/task-status';
import { completedTaskClasses } from '@/lib/task/completed-appearance';
import { toast } from '@/components/ui/toast';
import { useCompletedTaskAppearance } from '@/components/task/use-completed-appearance';
import { CancelledBadge } from '@/components/task/cancelled-badge';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';

/** `/tasks` is the inbox view. `/tasks/today` and `/tasks/upcoming` are local paths —
 *  the ledger only records `/tasks/inbox` and `/tasks/all`. */
const GROUPS: { group: TaskGroup; href: string; label: string }[] = [
  { group: 'inbox', href: '/tasks', label: TASK_GROUP_LABELS.inbox },
  { group: 'today', href: '/tasks/today', label: TASK_GROUP_LABELS.today },
  { group: 'upcoming', href: '/tasks/upcoming', label: TASK_GROUP_LABELS.upcoming },
  { group: 'all', href: '/tasks/all', label: TASK_GROUP_LABELS.all },
];

export function TasksView({ group, entryRoute = false }: { group: TaskGroup; entryRoute?: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [window, setWindow] = useState<UpcomingWindow>('all');

  /**
   * G262「设置为默认视图」：把当前视图记为默认。`/tasks`（收件箱路由）落地时若不是默认档，
   *   就把读者送去那一档——已在默认档时不跳，否则会自己重定向自己。只在**入口路由**生效：
   *   其余档是用户主动点进去的，不该被弹回。
   */
  const handleSetDefaultView = () => {
    storeDefaultTaskGroup(group as TaskGroupId);
    toast.add({ id: 'default-view', type: 'success', title: SET_AS_DEFAULT_VIEW });
  };

  useEffect(() => {
    if (!entryRoute) return;
    const redirectTo = defaultViewRedirect(group as TaskGroupId, readDefaultTaskGroup());
    if (redirectTo) router.replace(taskGroupHref(redirectTo));
  }, [entryRoute, group, router]);

  const load = useCallback(async () => {
    const data = await getTasks();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // G160：已完成任务的外观走本机 user 镜像（改设置页 → applyLocal → onStoreChanged('user') 即时生效）
  const appearance = useCompletedTaskAppearance();

  /**
   * 离线优先写：applyLocal 只落本地 store + 入队，**不等 flush**（去抖 2s）。
   * 而本页读路径是 getTasks（服务端权威行）⇒ 必须紧跟 flushNow，
   * 否则紧随其后的 load() 读回的仍是旧数据，这次改动看起来像没发生。
   * flushNow 内部吞错（离线时按退避阶梯留在队列里重试），不会 reject。
   * userId 先走 `currentUserId`：`useSession` 的 data 是异步到位的，登录后立刻点新建会退到
   * 旧 Server Action（与 SettingsPanels 同一处置），而 Server Action 的 createdAt 用的是真实时钟。
   */
  const writeTask = async (
    id: string,
    patchFor: (userId: string) => Record<string, unknown> | null,
    legacy: () => Promise<unknown>,
  ) => {
    const userId = await currentUserId(session?.user?.id);
    if (!userId) {
      await legacy();
      return;
    }
    const manager = getSyncManager();
    // G1514：开库闸门已在内核门面里，这里不必再拿 boot() 当就绪闸门——那一等把一趟
    // 网络往返（pull + flush）塞进了「新建任务」的点击路径。
    await manager.applyLocal({ table: 'task', id, patch: patchFor(userId) });
    await manager.flushNow();
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await writeTask(id, (userId) => taskPatchFor.create({ id, userId, title }, now), () => createTask(title));
      setNewTitle('');
      await load();
      router.refresh();
    } finally {
      setAdding(false);
    }
  };

  // toggle 保持 Server Action：它除改四列外还有两条服务端派生
  // （syncTaskToDocument 回写文档正文的 taskItem 勾选态、rollForward 为重复任务派生下一期行），
  // 客户端没有等价通路，搬进 applyLocal＝静默功能回归。见 tasks-local.ts 头部裁定 2。
  const handleToggle = async (id: string) => {
    await toggleTask(id, Intl.DateTimeFormat().resolvedOptions().timeZone);
    await load();
  };

  const handleSchedule = async (id: string, schedule: TaskSchedule) => {
    const now = new Date().toISOString();
    await writeTask(id, () => taskPatchFor.schedule(schedule, now), () => setTaskSchedule(id, schedule));
    await load();
  };

  const handleDelete = async (id: string) => {
    // patch === null 才是 delete op（applyLocal 据此定 op，服务端 delete 分支写墓碑列）
    await writeTask(id, () => null, () => deleteTask(id));
    await load();
  };

  const now = new Date();
  /**
   * 官方的「即将进行」不是列表，是分节时间轴：`C` 拿到**全部有排期的块**（无排期跳过，逾期项并进
   * 夹到下周一的当月节），`H1` 再按 `showCompleted ? n : f` 裁掉已完成、空节整节不显示。
   * 窗口开关（接下来的 7/30 天）是本地附加的收窄，`all` 时即官方输入。
   */
  const sectioned =
    group === 'upcoming'
      ? upcomingSections(
          window === 'all' ? tasks : tasks.filter((task) => withinUpcoming(task.dueDate, window, now)),
          showCompleted,
          now,
        )
      : null;

  const visible = applyCompletedFilter(tasksForGroup(tasks, group, now, window), showCompleted);
  // 三档是一枚轴：`isCompleted` 只说"勾没勾"，取消行没勾却不能算进未办那节（官方把它单独叫「已取消」）。
  const active = visible.filter((t) => !t.isCompleted && t.status !== 'cancelled');
  const completed = visible.filter((t) => t.isCompleted);
  const cancelled = visible.filter((t) => t.status === 'cancelled');

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader
        title="任务收件箱"
        actions={
          <div className="flex min-w-0 gap-2">
            <Input
              className="w-32 sm:w-56"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="添加任务，按回车确认…"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newTitle.trim()}
              className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity disabled:opacity-50"
            >
              <Plus className="size-4" />
              添加
            </button>
          </div>
        }
      />
      <nav className="flex gap-1 border-b border-border px-4" data-testid="task-groups">
        {GROUPS.map((entry) => (
          <Link
            key={entry.group}
            href={entry.href}
            aria-current={entry.group === group ? 'page' : undefined}
            className={cn(
              'border-b-2 px-3 py-2 text-sm transition-colors',
              entry.group === group
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-between px-4 pt-3">
        {group === 'upcoming' ? (
          <div className="flex gap-1 text-sm">
            {([[7, '接下来的 7 天'], [30, '接下来的 30 天'], ['all', '即将进行']] as const).map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={window === value}
                onClick={() => setWindow(value)}
                className={cn('rounded px-2 py-1', window === value ? 'bg-foreground/8 text-foreground' : 'text-foreground/55')}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <ShowCompletedToggle onChange={setShowCompleted} />
        <button
          type="button"
          onClick={handleSetDefaultView}
          className="ml-2 shrink-0 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
        >
          {SET_AS_DEFAULT_VIEW}
        </button>
      </div>
      <AppPageContainer className="max-w-3xl">
        {loading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : sectioned ? (
          <div className="flex flex-col gap-8">
            {sectioned.sections.length === 0 ? (
              <GroupEmpty
                hint={sectioned.hasScheduled ? '全部完成！' : TASK_VIEW_EMPTY.upcoming}
              />
            ) : (
              sectioned.sections.map((section) => (
                <section key={section.key} data-testid="upcoming-section">
                  <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium">
                    <span className="text-foreground">{section.title}</span>
                    <span className="text-muted-foreground">{section.undone}</span>
                  </h2>
                  <TaskList
                    items={section.blocks}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onSchedule={handleSchedule} appearance={appearance}
                  />
                </section>
              ))
            )}
          </div>
        ) : (
          <>
            <section className="mb-8">
              {visible.length === 0 ? (
                <GroupEmpty hint={TASK_VIEW_EMPTY[group]} />
              ) : active.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <CheckSquare className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    全部完成！在文档中使用任务列表，勾选的任务会同步到这里
                  </p>
                </div>
              ) : (
                <TaskList
                  items={active}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onSchedule={handleSchedule} appearance={appearance}
                />
              )}
            </section>

            {completed.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  已完成 · {completed.length}
                </h2>
                <TaskList
                  items={completed}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onSchedule={handleSchedule} appearance={appearance}
                />
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  {CANCELLED_LABEL} · {cancelled.length}
                </h2>
                <TaskList
                  items={cancelled}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onSchedule={handleSchedule} appearance={appearance}
                />
              </section>
            )}
          </>
        )}
      </AppPageContainer>
    </div>
  );
}

function focusAddInput(): void {
  document.querySelector<HTMLInputElement>('input[placeholder="添加任务，按回车确认…"]')?.focus();
}

function GroupEmpty({ hint }: { hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <CheckSquare className="mx-auto mb-2 size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{hint}</p>
      <button
        type="button"
        onClick={focusAddInput}
        className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        {TASKS_ADD_TASK}
      </button>
    </div>
  );
}

function TaskList({
  items,
  onToggle,
  onDelete,
  onSchedule,
  appearance,
}: {
  items: TaskItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSchedule: (id: string, schedule: TaskSchedule) => Promise<void>;
  appearance: 'faded' | 'strike' | 'none';
}) {
  return (
    <div className="flex flex-col">
      {items.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onSchedule={onSchedule}
          appearance={appearance}
        />
      ))}
    </div>
  );
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
};

function toDayInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toMomentInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${toDayInput(value)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function fromDayInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function fromMomentInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onSchedule,
  appearance,
}: {
  task: TaskItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSchedule: (id: string, schedule: TaskSchedule) => Promise<void>;
  appearance: 'faded' | 'strike' | 'none';
}) {
  const [open, setOpen] = useState(false);
  const schedule = {
    dueDate: task.dueDate,
    remindAt: task.remindAt,
    recurrence: task.recurrence,
    recurrenceEnd: task.recurrenceEnd,
  };

  const update = (patch: Partial<TaskSchedule>) => {
    void onSchedule(task.id, { ...schedule, ...patch });
  };

  return (
    <div className="border-b border-border/40 last:border-0">
      <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
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

        {task.recurrence && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {FREQUENCY_LABELS[parseFrequency(task.recurrence)] ?? '重复'}
          </span>
        )}
        {task.remindAt && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Bell className="size-3.5" />
            {new Date(task.remindAt).toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
        {task.documentId && task.documentTitle && (
          <Link
            href={`/documents/${task.documentId}`}
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <FileText className="size-3.5" />
            <span className="max-w-32 truncate">{task.documentTitle}</span>
          </Link>
        )}
        {task.dueDate && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
        )}

        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="设置提醒与重复"
          className={cn(
            'shrink-0 rounded p-1 transition-opacity hover:text-foreground',
            open ? 'text-foreground' : 'text-muted-foreground opacity-0 group-hover:opacity-100'
          )}
        >
          <CalendarClock className="size-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="删除任务"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            截止日期
            <Input
              type="date"
              value={toDayInput(task.dueDate)}
              onChange={(event) => update({ dueDate: fromDayInput(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            提醒时间
            <Input
              type="datetime-local"
              value={toMomentInput(task.remindAt)}
              onChange={(event) => update({ remindAt: fromMomentInput(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            重复
            <select
              value={task.recurrence ?? ''}
              onChange={(event) => update({ recurrence: event.target.value || null })}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="">不重复</option>
              {RECURRENCE_PRESETS.filter((preset) => preset.value).map((preset) => (
                <option key={preset.label} value={preset.value!}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            重复结束于
            <Input
              type="date"
              disabled={!task.recurrence}
              value={toDayInput(task.recurrenceEnd)}
              onChange={(event) => update({ recurrenceEnd: fromDayInput(event.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function parseFrequency(raw: string | null): string {
  try {
    return String((JSON.parse(raw ?? '') as { freq?: string }).freq ?? '');
  } catch {
    return '';
  }
}
