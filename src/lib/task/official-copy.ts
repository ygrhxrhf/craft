/**
 * The tasks page's official strings, in one place so a test can compare them against the ledger
 * itself (`feature-catalog.md`) instead of against a second hand-typed copy. The group labels are
 * `browse.sidebar.inbox` / `tasks.today` / `tasks.upcoming` / `tasks.all.tasks`; the empty-state
 * sentence is `tasks.inbox.empty`; the empty-state button is `tasks.add.task`.
 */
export const TASK_GROUP_LABELS = {
  inbox: '未归档',
  today: '今天',
  upcoming: '即将进行',
  all: '所有任务',
} as const;

export const TASKS_INBOX_EMPTY = '你的 Inbox 为空！准备就绪后即可添加任务。';
export const TASKS_ADD_TASK = '添加任务';

/**
 * G262: the four task views each have their **own** empty sentence — the same zero state reads
 * differently depending on what the view was supposed to hold. `tasks.zero.inbox` congratulates,
 * `zero.today` reports the day is clear, `zero.upcoming` nudges toward scheduling, and `zero.all`
 * is the plain first-run invitation.
 */
export const TASK_VIEW_EMPTY = {
  inbox: '做得好，你的所有任务都已安排好！',
  today: '你今天的任务都完成了！',
  upcoming: '没有已安排的任务。为任务添加日期，保持进度不落下。',
  all: '添加你的第一个任务即可开始。',
} as const;

export const TASK_VIEW_EMPTY_KEYS = {
  inbox: 'tasks.zero.inbox',
  today: 'tasks.zero.today',
  upcoming: 'tasks.zero.upcoming',
  all: 'tasks.zero.all',
} as const satisfies Record<keyof typeof TASK_VIEW_EMPTY, string>;

/** The i18n key each string must match in the ledger — kept next to the value so the test and
 *  the copy cannot drift apart independently. */
export const TASK_GROUP_KEYS = {
  inbox: 'browse.sidebar.inbox',
  today: 'tasks.today',
  upcoming: 'tasks.upcoming',
  all: 'tasks.all.tasks',
} as const satisfies Record<keyof typeof TASK_GROUP_LABELS, string>;

export const TASKS_INBOX_EMPTY_KEY = 'tasks.inbox.empty';
export const TASKS_ADD_TASK_KEY = 'tasks.add.task';

/** 「即将进行」的节头：`week` 一节用 `date.this.week`，`month` 一节在本月时用 `date.this.month`
 *  （其余月用长月名，`year` 一节用纯年份数字）——见 `upcoming-groups.ts:upcomingGroupTitle`。 */
export const UPCOMING_THIS_WEEK = '本周';
export const UPCOMING_THIS_MONTH = '本月';
export const UPCOMING_THIS_WEEK_KEY = 'date.this.week';
export const UPCOMING_THIS_MONTH_KEY = 'date.this.month';

/**
 * G604: the tasks screen's sort/filter menu. Nine of these are collected zh-Hans strings; the six
 * below the marker are **absent** from the official zh-Hans bundle (grep 0 in
 * `_harvest/i18n-zh.tsv`), so the official build renders its English fallback there — copied
 * verbatim rather than invented into Chinese.
 */
export const TASK_SORT_BY_LABEL = '排序方式';
export const TASK_SORT_BY_LABEL_KEY = 'browse.sort.by';
export const TASK_GROUP_BY_LABEL = '分组依据';
export const TASK_GROUP_BY_LABEL_KEY = 'collections.group.by';

/** `md`'s 分组依据 rows (安排／截止日期／文档) go through the *generic* keys `schedule` / `deadline` /
 *  `document`, not the task-screen ones — so all three are collected zh-Hans copy. */
export const TASK_GROUP_BY_SCHEDULE = '安排';
export const TASK_GROUP_BY_SCHEDULE_KEY = 'schedule';
export const TASK_GROUP_BY_DEADLINE = '截止日期';
export const TASK_GROUP_BY_DEADLINE_KEY = 'deadline';
export const TASK_GROUP_BY_DOCUMENT = '文档';
export const TASK_GROUP_BY_DOCUMENT_KEY = 'document';

export const TASK_SORT_SCHEDULE = 'Schedule Date';
export const TASK_SORT_SCHEDULE_KEY = 'tasks.schedule.date';
export const TASK_SORT_DEADLINE = 'Deadline Date';
export const TASK_SORT_DEADLINE_KEY = 'tasks.deadline.date';
export const TASK_SORT_MANUAL = '手动的';
export const TASK_SORT_MANUAL_KEY = 'browse.sort.manual';
export const TASK_SORT_TASKS_BY = 'Sort Tasks By';
export const TASK_SORT_TASKS_BY_KEY = 'tasks.sort.tasks.by';
export const TASK_SORT_DOCUMENTS_BY = 'Sort Documents By';
export const TASK_SORT_DOCUMENTS_BY_KEY = 'tasks.sort.documents.by';
/** 按截止日期分组时，没有截止日期的任务自成一节（官方 `fe` 的 `no-deadline`），同样只有英文兜底。 */
export const TASK_NO_DEADLINE = 'No Deadline';
export const TASK_NO_DEADLINE_KEY = 'tasks.no.deadline';

/** The settings button's `aria-label` (`more.options`), a collected zh-Hans string — unlike the
 *  six fallback keys below it. Three tabs share one button; only its menu contents differ. */
export const TASK_MORE_OPTIONS = '更多选项';
export const TASK_MORE_OPTIONS_KEY = 'more.options';

/** The inbox menu's own sort header — `collections.sort.by`, not the browse `browse.sort.by` the
 *  all-documents filter menu uses. Both read 排序方式, but they are different keys. */
export const TASK_INBOX_SORT_BY_LABEL = '排序方式';
export const TASK_INBOX_SORT_BY_LABEL_KEY = 'collections.sort.by';

/** The inbox menu's last row: an action, not a toggle — it closes the menu and turns the
 *  「显示已完成」 switch on. Hence 查看 (view), where the switch itself says 显示 (show). */
export const TASK_VIEW_COMPLETED = '查看已完成的任务';
export const TASK_VIEW_COMPLETED_KEY = 'tasks.view.completed.tasks';

/** `qi`'s document-sort rows, in the official order: 名称 / 更新日期 / 创建日期. */
export const TASK_DOCUMENT_SORT_NAME = '名称';
export const TASK_DOCUMENT_SORT_NAME_KEY = 'browse.sort.name';
export const TASK_DOCUMENT_SORT_UPDATED = '更新日期';
export const TASK_DOCUMENT_SORT_UPDATED_KEY = 'browse.sort.date.updated';
export const TASK_DOCUMENT_SORT_CREATED = '创建日期';
export const TASK_DOCUMENT_SORT_CREATED_KEY = 'browse.sort.date.created';

export const TASK_SHOW_SCHEDULED = '显示计划任务';
export const TASK_SHOW_SCHEDULED_KEY = 'tasks.show.scheduled.tasks';
export const TASK_SHOW_PAST_DATES = '显示过去日期';
export const TASK_SHOW_PAST_DATES_KEY = 'tasks.show.past.dates';
export const TASK_SHOW_DAILY_NOTES = '显示每日笔记';
export const TASK_SHOW_DAILY_NOTES_KEY = 'commands.show.daily.notes';
export const TASK_SHOW_PINNED = '显示固定内容';
export const TASK_SHOW_PINNED_KEY = 'tasks.show.pinned';

/**
 * `Ki`'s refusal sentence. The template key is missing from zh-Hans, so it prints in English;
 * `[0]` is the **translated** sort name (`i("deadline"|"schedule")` → 截止日期／安排), which the
 * bundle does have — the official toast therefore reads half English, half Chinese.
 */
export const TASK_REORDER_REFUSED_TEMPLATE = 'Reordering isn’t allowed while sorted by [0]';
export const TASK_REORDER_REFUSED_KEY = 'tasks.reordering.not.allowed.sorted.by.x';
export const TASK_SWITCH_TO_MANUAL = 'Switch to Manual';
export const TASK_SWITCH_TO_MANUAL_KEY = 'tasks.switch.to.manual';
export const TASK_REORDER_SORT_LABELS = { schedule: '安排', deadline: '截止日期' } as const;

export function taskReorderRefusedTitle(sort: keyof typeof TASK_REORDER_SORT_LABELS): string {
  return TASK_REORDER_REFUSED_TEMPLATE.replace('[0]', TASK_REORDER_SORT_LABELS[sort]);
}
