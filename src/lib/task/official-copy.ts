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
