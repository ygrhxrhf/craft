import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ADD_TASK,
  ADD_TASK_KEY,
  CALENDAR_TITLE,
  CALENDAR_TITLE_KEY,
  CREATE_DAILY_NOTE,
  CREATE_DAILY_NOTE_KEY,
  SHOW_MONTH_VIEW,
  SHOW_MONTH_VIEW_KEY,
  SHOW_NEXT_MONTH,
  SHOW_NEXT_MONTH_KEY,
  SHOW_PREVIOUS_DAYS,
  SHOW_PREVIOUS_DAYS_KEY,
} from './timeline-copy';

const catalog = readFileSync(
  new URL('../../../docs/craft-ref/features/feature-catalog.md', import.meta.url),
  'utf8'
);
const timeline = readFileSync(
  new URL('../../components/calendar/CalendarTimeline.tsx', import.meta.url),
  'utf8'
);
const page = readFileSync(
  new URL('../../app/(app)/calendar/page.tsx', import.meta.url),
  'utf8'
);

const pairs: [string, string][] = [
  [CALENDAR_TITLE, CALENDAR_TITLE_KEY],
  [SHOW_PREVIOUS_DAYS.replace('↑ ', ''), SHOW_PREVIOUS_DAYS_KEY],
  [SHOW_NEXT_MONTH.replace('↓ ', ''), SHOW_NEXT_MONTH_KEY],
  [ADD_TASK, ADD_TASK_KEY],
  [CREATE_DAILY_NOTE, CREATE_DAILY_NOTE_KEY],
  [SHOW_MONTH_VIEW, SHOW_MONTH_VIEW_KEY],
];

describe('timeline copy comes from the official language pack', () => {
  it.each(pairs)('%s', (text, key) => {
    expect(catalog).toContain(`- ${text}  \`${key}\``);
  });
});

describe('the timeline renders the copy it declares', () => {
  it('labels its two growth buttons and the per-section actions', () => {
    expect(timeline).toContain('{SHOW_PREVIOUS_DAYS}');
    expect(timeline).toContain('{SHOW_NEXT_MONTH}');
    expect(timeline).toContain('{ADD_TASK}');
    expect(timeline).toContain('{CREATE_DAILY_NOTE}');
  });

  it('uses the official collapsed-list wording for notes beyond one screen', () => {
    expect(catalog).toContain('- 再显示 [0] 个  `calendar.event.show.x.more.notes`');
    expect(timeline).toContain('再显示 {dayNotes.length - NOTES_PER_SECTION} 个');
  });
});

describe('the timeline is the page, the month grid is the other view', () => {
  it('opens on the timeline', () => {
    expect(page).toContain(`useState<'timeline' | 'grid'>('timeline')`);
  });

  it('reaches the month grid through the catalog word for it', () => {
    expect(page).toContain('{view === \'timeline\' ? SHOW_MONTH_VIEW : ');
  });

  it('gives every section the two per-day actions rather than only the selected day', () => {
    // 采集里 9 节各有 添加任务／创建每日笔记；旧实现只在选中的那一节提供。
    const sections = timeline.match(/<Section\b/g) ?? [];
    // G96 added the conditional 「之后」 section; both calls carry the actions.
    expect(sections).toHaveLength(2);
    expect(timeline).toContain('onAddTask(sectionActionDate(section), title)');
    expect(timeline).toContain('onCreateNote(sectionActionDate(section))');
  });
});
