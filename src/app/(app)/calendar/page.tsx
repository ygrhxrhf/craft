'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from 'cn';
import { createTask, getTasks, toggleTask } from '@/actions/task/task';
import { useSession } from 'next-auth/react';
import { getSyncManager } from '@/lib/sync-core';
import { taskPatchFor } from '../tasks/tasks-local';
import { getOrCreateDayNote } from '@/actions/daily-notes/daily-notes';
import type { TaskItem } from '@/actions/task/task';
import { getDailyNotes } from '@/actions/daily-notes/daily-notes';
import type { DailyNoteItem } from '@/actions/daily-notes/daily-notes';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { CalendarTaskRow } from '@/components/calendar/CalendarTaskRow';
import { CalendarTimeline } from '@/components/calendar/CalendarTimeline';
import { applyCompletedFilter } from '@/lib/task/grouping';
import { agendaDays, revealPreviousDays } from '@/lib/calendar/previous-days';
import { dayInSpan, spanOf, type CalendarSpan } from '@/lib/calendar/week-view';
import { SHOW_MONTH_VIEW } from '@/lib/calendar/timeline-copy';
import { ShowCompletedToggle } from '@/components/task/ShowCompletedToggle';

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
  const [laterMonths, setLaterMonths] = useState(0);
  const today = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    try {
      const [taskData, noteData] = await Promise.all([getTasks(), getDailyNotes()]);
      setTasks(taskData);
      setNotes(noteData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of applyCompletedFilter(tasks, showCompleted)) {
      if (!task.dueDate) continue;
      const key = new Date(task.dueDate).toDateString();
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks, showCompleted]);

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
    await toggleTask(id, Intl.DateTimeFormat().resolvedOptions().timeZone);
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
        await manager.boot();
        await manager.applyLocal({
          table: 'task',
          id,
          patch: taskPatchFor.create({ id, userId, title, dueDate }, new Date().toISOString()),
        });
        await manager.flushNow();
      } else {
        await createTask(title, dueDate);
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
      <AppPageHeader title="日历" actions={<ShowCompletedToggle onChange={setShowCompleted} />} />
      <AppPageContainer className="max-w-4xl">
        {/* 视图切换放在正文里而不是页头：手机上页头只有标题＋一个开关的宽度，
            再加一枚带字的按钮会把标题挤掉（截图里 日历 被截成半个字）。 */}
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            aria-pressed={view === 'grid'}
            onClick={() => setView(view === 'timeline' ? 'grid' : 'timeline')}
            className="rounded-md border border-border px-3 py-1 text-sm text-foreground/70 hover:bg-muted/60"
          >
            {/* 「显示月视图」是目录里的原话；反方向的「显示时间轴」本地补名，官方没有对应键。 */}
            {view === 'timeline' ? SHOW_MONTH_VIEW : '显示时间轴'}
          </button>
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
                            <p key={task.id} className={cn('truncate text-sm', task.isCompleted && 'text-muted-foreground line-through')}>
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
                    className="rounded-md border border-border px-3 py-1 text-sm text-foreground/70 hover:bg-muted/60 disabled:opacity-50"
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
                  className="mb-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted/60 disabled:opacity-50"
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
