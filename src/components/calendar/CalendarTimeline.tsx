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

  return (
    <section
      data-testid={isToday ? 'calendar-section-today' : `calendar-section-${section.kind}`}
      className={cn(
        'flex flex-col gap-3 p-3',
        isToday ? 'rounded-xl border border-border bg-muted/40' : 'rounded-xl'
      )}
    >
      <SectionHeading section={section} />

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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggleForm}
          aria-expanded={formOpen}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted/60"
        >
          <Plus className="size-4" />
          {ADD_TASK}
        </button>
        <button
          type="button"
          onClick={onCreateNote}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted/60"
        >
          <CheckSquare className="size-4" />
          {CREATE_DAILY_NOTE}
        </button>
      </div>
    </section>
  );
}

function SectionHeading({ section }: { section: TimelineSection }) {
  if (section.kind === 'day') {
    return (
      // G32：craft 日行标题「11月4日」16/600/19.2、「今天」15/600/18、星期 13/500/16。
      <h2 className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold leading-[19.2px]">{dateLabel(section.date)}</span>
        {section.relative && (
          <>
            <span aria-hidden className="text-muted-foreground">
              •
            </span>
            <span className="text-[15px] font-semibold leading-[18px] text-foreground/85">
              {section.relative}
            </span>
          </>
        )}
        <span aria-hidden className="text-muted-foreground">
          •
        </span>
        <span className="text-[13px] font-medium leading-4 text-muted-foreground">
          {section.weekday}
        </span>
      </h2>
    );
  }
  if (section.kind === 'range') {
    return (
      <h2 className="text-sm font-semibold leading-snug">
        {dateLabel(section.start)}
        <br />
        {dateLabel(section.end)}
      </h2>
    );
  }
  return <h2 className="text-sm font-semibold">{section.label}</h2>;
}

function sectionAriaDate(section: TimelineSection): string {
  return dateLabel(sectionActionDate(section));
}
