'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, FileText, MoreHorizontal } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from 'cn';
import { createTask, getTasks, toggleTask } from '@/actions/task/task';
import { useSession } from 'next-auth/react';
import { getSyncManager } from '@/lib/sync-core';
import { currentUserId } from '@/lib/sync-core/current-user';
import { readPendingRows } from '@/components/sync/local-records';
import { overlayTaskRows, readTaskMirrorItems, taskPatchFor, toggleTaskLocally } from '../tasks/tasks-local';
import { getOrCreateDayNote } from '@/actions/daily-notes/daily-notes';
import type { TaskItem } from '@/actions/task/task';
import { getDailyNotes } from '@/actions/daily-notes/daily-notes';
import type { DailyNoteItem } from '@/actions/daily-notes/daily-notes';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { CalendarTaskRow } from '@/components/calendar/CalendarTaskRow';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { useCompletedTaskAppearance } from '@/components/task/use-completed-appearance';
import { completedTaskClasses } from '@/lib/task/completed-appearance';
import { applyCompletedFilter } from '@/lib/task/grouping';
import { agendaDays, revealPreviousDays } from '@/lib/calendar/previous-days';
import { tasksByCalendarDay } from '@/lib/calendar/task-grid';
import { dayInSpan, spanOf, type CalendarSpan } from '@/lib/calendar/week-view';
import { TODAY_LABEL } from '@/lib/calendar/month-grid';
import { SHOW_MONTH_VIEW } from '@/lib/calendar/timeline-copy';
import { ShowCompletedToggle } from '@/components/task/ShowCompletedToggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { defer } from '@/lib/react/defer';

export default function CalendarPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [taskTitle, setTaskTitle] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<DailyNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [showCompleted, setShowCompleted] = useState(false);
  const [span, setSpan] = useState<CalendarSpan>('month');
  // 官方把日历页做成纵向按日时间轴，月格只是另一个视图（G43），所以时间轴是默认视图。
  const [view, setView] = useState<'timeline' | 'grid'>('timeline');
  // G160：日历「前几天」列表里的已完成任务行也吃同一档外观
  const completedAppearance = useCompletedTaskAppearance();
  const [laterMonths, setLaterMonths] = useState(0);
  const today = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    /**
     * 日历与任务屏共用一条离线读：服务端 action 够不着时退回内核镜像，并叠上未推送的
     * 本机意图。此前这里是 `Promise.all` 且无 catch——断链时整个 load 直接抛，离线勾选
     * 虽然已落库，屏上却一行都不变。日记本条目没有镜像读，失败时保留上一次的值。
     */
    const pending = await readPendingRows('task');
    const [taskResult, noteResult] = await Promise.allSettled([getTasks(), getDailyNotes()]);
    if (taskResult.status === 'fulfilled') {
      setTasks(overlayTaskRows(taskResult.value, pending));
    } else {
      setTasks(overlayTaskRows(await readTaskMirrorItems(), pending));
    }
    if (noteResult.status === 'fulfilled') setNotes(noteResult.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    defer(() => void load());
  }, [load]);

  // G15：网格按计划日期与截止日两个落点分别标点（同天只标一次）。
  const tasksByDay = useMemo(
    () => tasksByCalendarDay(tasks, showCompleted),
    [tasks, showCompleted],
  );

  const window = selected ? spanOf(selected, span) : null;
  const inWindow = (key: string) => (window ? dayInSpan(new Date(key), window) : true);

  const notesByDay = useMemo(() => {
    const map = new Map<string, DailyNoteItem>();
    for (const note of notes) {
      if (!note.dailyNoteDate) continue;
      map.set(new Date(note.dailyNoteDate).toDateString(), note);
    }
    return map;
  }, [notes]);

  const handleToggle = async (id: string) => {
    const task = tasks.find((row) => row.id === id);
    const userId = await currentUserId(session?.user?.id);
    if (task && userId) {
      await toggleTaskLocally(task, userId);
      await getSyncManager().flushNow();
    } else {
      await toggleTask(id, Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    await load();
  };

  const [creating, setCreating] = useState(false);
  const [earlierDays, setEarlierDays] = useState(0);
  const createNote = async (day: Date) => {
    if (creating) return;
    setCreating(true);
    try {
      const note = await getOrCreateDayNote(day);
      router.push(`/documents/${note.id}`);
    } finally {
      setCreating(false);
    }
  };

  const [addingTask, setAddingTask] = useState(false);
  const addTask = async (day: Date, title: string) => {
    if (!title || addingTask) return;
    setAddingTask(true);
    try {
      const id = crypto.randomUUID();
      const dueDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9).toISOString();
      const userId = session?.user?.id;
      if (userId) {
        const manager = getSyncManager();
        // G1514：开库闸门在内核门面里，写路径不必先等 boot()
        await manager.applyLocal({
          table: 'task',
          id,
          patch: taskPatchFor.create({ id, userId, title, scheduleDate: dueDate }, new Date().toISOString()),
        });
        await manager.flushNow();
      } else {
        await createTask(title, null, dueDate);
      }
      setTaskTitle('');
      await load();
    } finally {
      setAddingTask(false);
    }
  };

  const selectedKey = selected?.toDateString();
  const selectedTasks = selectedKey ? tasksByDay.get(selectedKey) ?? [] : [];
  const selectedNote = selectedKey ? notesByDay.get(selectedKey) : undefined;

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="日历" plus="task" />
      {/* G43：craft 日历用满主列宽（日行 1120 = main 1152 − 16×2），此前被 `max-w-4xl` 夹到 896。 */}
      <AppPageContainer>
        {/* G1666：官方日历页头只有「↑ 显示前几天」一枚，没有常驻的「显示已完成的任务」
            「显示月视图」两个顶层开关（官方把这类开关收在分区 ⋯ 里）。这里把它们收进同一枚 ⋯，
            页头因此和官方一样只剩标题与 ＋。 */}
        <div className="mb-3 flex justify-end">
          <Popover>
            <PopoverTrigger
              aria-label="更多选项"
              data-testid="calendar-more"
              className="flex size-7 items-center justify-center rounded-md text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              <div className="px-1 py-1">
                <ShowCompletedToggle onChange={setShowCompleted} />
              </div>
              <button
                type="button"
                aria-pressed={view === 'grid'}
                onClick={() => setView(view === 'timeline' ? 'grid' : 'timeline')}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-foreground/80 hover:bg-foreground/[0.06]"
              >
                {view === 'timeline' ? SHOW_MONTH_VIEW : '显示时间轴'}
              </button>
            </PopoverContent>
          </Popover>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : view === 'timeline' ? (
          <CalendarTimeline
            anchor={selected ?? today}
            today={today}
            tasks={applyCompletedFilter(tasks, showCompleted)}
            notes={notes}
            earlierDays={earlierDays}
            laterMonths={laterMonths}
            onShowPreviousDays={() => setEarlierDays(revealPreviousDays)}
            onShowNextMonth={() => setLaterMonths((shown) => shown + 1)}
            onToggleTask={(id) => void handleToggle(id)}
            onAddTask={addTask}
            onCreateNote={(day) => void createNote(day)}
          />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="shrink-0 rounded-lg border border-border p-3">
              {/* G363：网格上方一行「今天」快捷项。 */}
              <button
                type="button"
                data-testid="calendar-today"
                onClick={() => {
                  setSelected(today);
                  setMonth(today);
                  setEarlierDays(0);
                }}
                className="mb-2 w-full rounded-md px-2 py-1 text-left text-[13px] text-foreground/70 transition-colors hover:bg-foreground/4 hover:text-foreground"
              >
                {TODAY_LABEL}
              </button>
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(day) => {
                  setSelected(day);
                  setEarlierDays(0);
                }}
                month={month}
                onMonthChange={setMonth}
                modifiers={{
                  withTask: (date) => tasksByDay.has(date.toDateString()) && inWindow(date.toDateString()),
                  withNote: (date) => notesByDay.has(date.toDateString()) && inWindow(date.toDateString()),
                }}
                modifiersClassNames={{
                  withTask: 'calendar-has-task',
                  withNote: 'calendar-has-note',
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-3 flex gap-1">
                <button
                  type="button"
                  aria-pressed={span === 'week'}
                  onClick={() => setSpan('week')}
                  className={cn('rounded px-2 py-1 text-sm', span === 'week' ? 'bg-foreground/8 text-foreground' : 'text-foreground/55')}
                >
                  显示周视图
                </button>
                <button
                  type="button"
                  aria-pressed={span === 'month'}
                  onClick={() => setSpan('month')}
                  className={cn('rounded px-2 py-1 text-sm', span === 'month' ? 'bg-foreground/8 text-foreground' : 'text-foreground/55')}
                >
                  显示月视图
                </button>
              </div>
              {selected && earlierDays > 0 && (
                <div className="mb-4 flex flex-col gap-3">
                  {agendaDays(selected, earlierDays)
                    .slice(0, -1)
                    .map((day) => {
                      const key = day.toDateString();
                      if (!inWindow(key)) return null;
                      const dayTasks = tasksByDay.get(key) ?? [];
                      const dayNote = notesByDay.get(key);
                      if (dayTasks.length === 0 && !dayNote) return null;
                      return (
                        <section key={key}>
                          <h3 className="mb-1 text-xs font-medium text-muted-foreground">
                            {day.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
                          </h3>
                          {dayNote && (
                            <Link href={`/documents/${dayNote.id}`} className="block truncate text-sm hover:underline">
                              {dayNote.icon ?? '📄'} {dayNote.title}
                            </Link>
                          )}
                          {dayTasks.map((task) => (
                            <p
                              key={task.id}
                              className={cn('truncate text-sm', task.isCompleted && completedTaskClasses(completedAppearance))}
                            >
                              {task.title}
                            </p>
                          ))}
                        </section>
                      );
                    })}
                </div>
              )}
              {selected && (
                <button
                  type="button"
                  onClick={() => setEarlierDays((shown) => revealPreviousDays(shown))}
                  className="mb-3 text-sm text-foreground/55 hover:text-foreground"
                >
                  ↑ 显示前几天
                </button>
              )}
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                {selected
                  ? selected.toLocaleDateString('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })
                  : '选择日期'}
              </h2>

              {selected && (
                <form
                  className="mb-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (selected) void addTask(selected, taskTitle.trim());
                  }}
                >
                  <input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="添加任务"
                    aria-label="添加任务"
                    className="flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={addingTask || !taskTitle.trim()}
                    className="rounded-md border border-border px-3 py-1 text-sm text-foreground/70 hover:bg-muted/60"
                  >
                    添加任务
                  </button>
                </form>
              )}
              {!selectedNote && (
                <button
                  type="button"
                  onClick={() => selected && void createNote(selected)}
                  disabled={creating}
                  className="mb-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted/60"
                >
                  {creating ? '创建中…' : '创建每日笔记'}
                </button>
              )}
              {!selectedNote && selectedTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <CalendarIcon className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">这一天暂无任务或日记</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {selectedNote && (
                    <Link
                      href={`/documents/${selectedNote.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      {selectedNote.icon ? (
                        <span className="text-lg leading-none">{selectedNote.icon}</span>
                      ) : (
                        <FileText className="size-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {selectedNote.title}
                        </span>
                        {selectedNote.plainText && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {selectedNote.plainText.slice(0, 60)}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}

                  {selectedTasks.map((task) => (
                    <CalendarTaskRow key={task.id} task={task} onToggle={handleToggle} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AppPageContainer>
    </div>
  );
}
