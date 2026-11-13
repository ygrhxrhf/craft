'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckSquare, Plus } from 'lucide-react';
import type { DailyNoteItem } from '@/actions/daily-notes/daily-notes';
import type { TaskItem } from '@/actions/task/task';
import { CalendarTaskRow } from '@/components/calendar/CalendarTaskRow';
import {
  ADD_TASK,
  CREATE_DAILY_NOTE,
  SHOW_NEXT_MONTH,
  SHOW_PREVIOUS_DAYS,
} from '@/lib/calendar/timeline-copy';
import {
  ONGOING_TITLE,
  dateLabel,
  dayInSection,
  sectionSpan,
  addDays,
  LATER_TITLE,
  isPastDay,
  ongoingTasks,
  pastDayKeeps,
  sectionActionDate,
  timelineSections,
  type TimelineSection,
} from '@/lib/calendar/timeline';
import { cn } from 'cn';

/** A collapsed section can hold a whole month of notes; the official copy for the rest is 「再显示 [0] 个」. */
const NOTES_PER_SECTION = 3;

interface CalendarTimelineProps {
  anchor: Date;
  today: Date;
  tasks: TaskItem[];
  notes: DailyNoteItem[];
  earlierDays: number;
  laterMonths: number;
  onShowPreviousDays: () => void;
  onShowNextMonth: () => void;
  onToggleTask: (id: string) => void;
  onAddTask: (date: Date, title: string) => Promise<void>;
  onCreateNote: (date: Date) => void;
}

export function CalendarTimeline({
  anchor,
  today,
  tasks,
  notes,
  earlierDays,
  laterMonths,
  onShowPreviousDays,
  onShowNextMonth,
  onToggleTask,
  onAddTask,
  onCreateNote,
}: CalendarTimelineProps) {
  const sections = timelineSections({ anchor, today, earlierDays, laterMonths });
  // G96：加载月份之后的任务收进「之后」一节；没有这类任务时不渲染。
  const lastSection = sections[sections.length - 1];
  const laterStart = lastSection ? addDays(sectionSpan(lastSection).end, 1) : today;
  const laterSection = { kind: 'later' as const, key: 'later', start: laterStart, label: LATER_TITLE };
  const hasLaterTasks = tasks.some(
    (task) => task.scheduleDate && dayInSection(laterSection as never, new Date(task.scheduleDate)),
  );
  // G96：过去未完成的任务收进「进行中」，过去的日期节只留已完成/已取消。
  const ongoing = ongoingTasks(tasks, today);
  const [openForm, setOpenForm] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onShowPreviousDays}
        className="self-start text-sm text-foreground/55 hover:text-foreground"
      >
        {SHOW_PREVIOUS_DAYS}
      </button>
      {ongoing.length > 0 && (
        <section data-testid="calendar-section-ongoing" className="flex flex-col gap-3 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-foreground/80">{ONGOING_TITLE}</h3>
          {ongoing.map((task) => (
            <CalendarTaskRow key={task.id} task={task} onToggle={onToggleTask} />
          ))}
        </section>
      )}
      {hasLaterTasks && (
        <Section
          key="later"
          section={laterSection as never}
          tasks={tasks}
          notes={notes}
          today={today}
          formOpen={openForm === 'later'}
          onToggleForm={() =>
            setOpenForm((open) => (open === 'later' ? null : 'later'))
          }
          onToggleTask={onToggleTask}
          onAddTask={async (title) => {
            await onAddTask(sectionActionDate(laterSection as never), title);
            setOpenForm(null);
          }}
          onCreateNote={() => onCreateNote(sectionActionDate(laterSection as never))}
        />
      )}
      {sections.map((section) => (
        <Section
          key={section.key}
          section={section}
          tasks={tasks}
          notes={notes}
          today={today}
          formOpen={openForm === section.key}
          onToggleForm={() =>
            setOpenForm((open) => (open === section.key ? null : section.key))
          }
          onToggleTask={onToggleTask}
          onAddTask={async (title) => {
            await onAddTask(sectionActionDate(section), title);
            setOpenForm(null);
          }}
          onCreateNote={() => onCreateNote(sectionActionDate(section))}
        />
      ))}
      <button
        type="button"
        onClick={onShowNextMonth}
        className="self-start text-sm text-foreground/55 hover:text-foreground"
      >
        {SHOW_NEXT_MONTH}
      </button>
    </div>
  );
}

function Section({
  section,
  tasks,
  notes,
  today,
  formOpen,
  onToggleForm,
  onToggleTask,
  onAddTask,
  onCreateNote,
}: {
  section: TimelineSection;
  tasks: TaskItem[];
  notes: DailyNoteItem[];
  today: Date;
  formOpen: boolean;
  onToggleForm: () => void;
  onToggleTask: (id: string) => void;
  onAddTask: (title: string) => Promise<void>;
  onCreateNote: () => void;
}) {
  const isToday = section.kind === 'day' && section.relative === '今天';
  const pastDay = section.kind === 'day' && isPastDay(section.date, today);
  const dayTasks = tasks
    .filter((task) => task.scheduleDate && dayInSection(section, new Date(task.scheduleDate)))
    // G96：过去的日期节只放已完成/已取消；未完成的历史任务已在「进行中」。
    .filter((task) => !pastDay || pastDayKeeps(task))
    .sort((a, b) => new Date(a.scheduleDate ?? 0).getTime() - new Date(b.scheduleDate ?? 0).getTime());
  const dayNotes = notes.filter(
    (note) => note.dailyNoteDate && dayInSection(section, new Date(note.dailyNoteDate))
  );
  const [expanded, setExpanded] = useState(false);
  const shownNotes = expanded ? dayNotes : dayNotes.slice(0, NOTES_PER_SECTION);

  const isDay = section.kind === 'day';
  return (
    // 采集 layout-20261102/craft-craft-calendar.json 节点 274–298：日行 1120×105（今天）／1120×89（平日）／
    // 69（区间与月节），radius 20、节间距 16；今天卡 canvas 底＋内描边，左列是 120 宽 chip（radius 16、padding 16、gap 2）。
    <section
      data-testid={isToday ? 'calendar-section-today' : `calendar-section-${section.kind}`}
      className={cn(
        'group flex min-h-[69px] flex-col gap-3 p-3 md:flex-row md:items-stretch md:gap-4',
        isToday
          ? 'rounded-[20px] border border-border bg-background md:border-0 md:inset-ring-1 md:inset-ring-foreground/4 md:min-h-[105px] md:p-2'
          : isDay
            ? 'rounded-[20px] md:min-h-[89px] md:px-2 md:py-0'
            : 'rounded-[20px] md:min-h-[69px] md:p-2'
      )}
    >
      <SectionHeading section={section} isToday={isToday} />

      <div className="flex min-w-0 flex-1 flex-col gap-3 md:justify-between">
        <div className="flex flex-col gap-3">
          {shownNotes.map((note) => (
            <Link
              key={note.id}
              href={`/documents/${note.id}`}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/60"
            >
              {note.icon ? (
                <span className="text-lg leading-none">{note.icon}</span>
              ) : (
                <CalendarDays className="size-4 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{note.title}</span>
                {note.plainText && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {note.plainText.slice(0, 60)}
                  </span>
                )}
              </span>
            </Link>
          ))}
          {!expanded && dayNotes.length > NOTES_PER_SECTION && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="self-start text-sm text-foreground/55 hover:text-foreground"
            >
              再显示 {dayNotes.length - NOTES_PER_SECTION} 个
            </button>
          )}

          {dayTasks.map((task) => (
            <CalendarTaskRow key={task.id} task={task} onToggle={onToggleTask} />
          ))}

          {formOpen && (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem('title') as HTMLInputElement;
                const title = input.value.trim();
                if (title) void onAddTask(title);
              }}
            >
              <input
                name="title"
                autoFocus
                placeholder={ADD_TASK}
                aria-label={`${ADD_TASK} ${sectionAriaDate(section)}`}
                className="flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1 text-sm text-foreground/70 hover:bg-muted/60"
              >
                {ADD_TASK}
              </button>
            </form>
          )}
        </div>

        {/* 采集里这两枚按 `.gxpTyy` 只在悬停/聚焦时显形（静止时整条动作带像素恒为卡片底色），
            所以桌面端收进 group-hover，手机上仍常显。 */}
        <div className="flex gap-2 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={onToggleForm}
            aria-expanded={formOpen}
            className="flex h-7 items-center gap-1.5 rounded-[13px] bg-craft-accent/12 px-2 text-[13px] font-medium text-craft-accent"
          >
            <Plus className="size-4" />
            {ADD_TASK}
          </button>
          <button
            type="button"
            onClick={onCreateNote}
            className="flex h-7 items-center gap-1.5 rounded-[13px] bg-craft-accent/12 px-2 text-[13px] font-medium text-craft-accent"
          >
            <CheckSquare className="size-4" />
            {CREATE_DAILY_NOTE}
          </button>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  section,
  isToday,
}: {
  section: TimelineSection;
  isToday: boolean;
}) {
  if (section.kind === 'day') {
    return (
      // 采集 layout-20261102/craft-craft-calendar.json 节点 274–298：日行左列是 120 宽 chip（radius 16、padding 16、
      // gap 2），日期 16/600/19.2、相对标签 15/600/18（今天＝品牌蓝）、星期 13/500/16 于 25% 前景；
      // 今天 chip 底 rgba(46,109,233,0.12)、平日 rgba(26,28,30,0.08)。手机上退回单行 `日期 · 相对 · 星期`。
      <h2
        className={cn(
          'flex flex-wrap items-center gap-2',
          'md:w-[120px] md:min-h-[89px] md:flex-none md:self-start md:flex-col md:flex-nowrap md:items-start md:justify-start md:gap-0.5 md:rounded-2xl md:p-4',
          isToday ? 'md:bg-craft-accent/12' : 'md:bg-foreground/8'
        )}
      >
        <span className="text-base font-semibold leading-[19.2px]">{dateLabel(section.date)}</span>
        {section.relative && (
          <>
            <span aria-hidden className="text-muted-foreground md:hidden">
              •
            </span>
            <span
              className={cn(
                'text-[15px] font-semibold leading-[18px]',
                isToday ? 'md:text-craft-accent' : 'text-foreground/85 md:text-foreground/55'
              )}
            >
              {section.relative}
            </span>
          </>
        )}
        <span aria-hidden className="text-muted-foreground md:hidden">
          •
        </span>
        <span className="text-[13px] font-medium leading-4 text-muted-foreground md:text-foreground/25">
          {section.weekday}
        </span>
      </h2>
    );
  }
  if (section.kind === 'range') {
    return (
      <h2 className="text-sm font-semibold leading-snug md:w-[120px] md:flex-none">
        {dateLabel(section.start)}
        <br />
        {dateLabel(section.end)}
      </h2>
    );
  }
  return <h2 className="text-sm font-semibold md:w-[120px] md:flex-none">{section.label}</h2>;
}

function sectionAriaDate(section: TimelineSection): string {
  return dateLabel(sectionActionDate(section));
}
