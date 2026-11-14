'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, CalendarClock, CheckSquare, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';
import {
  describeRecurrence,
  parseRecurrence,
  scheduleWithRecurrence,
} from '@/lib/task/recurrence';
import { repeatRuleFor } from '@/lib/task/repeat-validity';
import { defaultReminderForRepeat } from '@/lib/task/repeat-reminder';
import { REMIND_PRESETS, isInstantPreset, remindInstantFor } from '@/lib/task/remind-presets';
import { REMIND_OFFSET_TIERS, remindAtFromOffset, remindOffsetLabel } from '@/lib/task/remind-offset';
import { instantForSlot, slotIndexForTime, timeSlots } from '@/lib/task/time-menu';
import { RepeatIntervalSelect } from '@/components/task/RepeatIntervalSelect';
import { RepeatAnchorNote } from '@/components/task/RepeatAnchorNote';
import { applySeriesOp, createTask, deleteTask, getSubTasks, getTasksPage, renameTask, restoreTask, reorderTasks, setTaskSchedule, toggleTask } from '@/actions/task/task';
import { appendTaskPage, beginLoad, cursorFor, initialTaskPageState, settleLoad, type TaskPageState } from '@/lib/task/task-paging';
import { sideFor, shouldSuppressIndicator } from '@/lib/task/task-drop';
import { SERIES_OPS } from '@/lib/task/series-ops';
import type { TaskItem, TaskSchedule } from '@/actions/task/task';
import { getSyncManager } from '@/lib/sync-core';
import { currentUserId } from '@/lib/sync-core/current-user';
import { readPendingRows } from '@/components/sync/local-records';
import { overlayTaskRows, taskPatchFor } from './tasks-local';
import { applyCompletedFilter, tasksForGroup, withinUpcoming, type TaskGroup, type UpcomingWindow } from '@/lib/task/grouping';
import { upcomingSections } from '@/lib/task/upcoming-groups';
import { ShowCompletedToggle } from '@/components/task/ShowCompletedToggle';
import { TaskDatePopover } from '@/components/task/TaskDatePopover';
import { REMINDER_CHANGED_TITLE, REMINDER_TOAST_DURATION_MS, nextReminderText } from '@/lib/task/reminder-toast';
import { fromDayInputValue, toDayInputValue, localDayInstant } from '@/lib/task/wall-clock';
import { taskDateOptions } from '@/lib/task/task-date-menu';
import { isNewTaskShortcut } from '@/lib/task/new-task-shortcut';
import { taskRowKeyAction } from '@/lib/task/task-row-key';
import { anchorHref } from '@/lib/editor/block-anchor';
import { isEditableTarget, rowNavIndex, taskHistoryKeyAction, taskViewKeyAction } from '@/lib/task/task-view-key';
import { EMPTY_UNDO, pushUndo, takeRedo, takeUndo, type UndoEntry, type UndoState } from '@/lib/task/undo-stack';
import { applySectionAction, sectionKeyAction } from '@/lib/task/section-key';
import { bulkCheckLabel, bulkCheckTargets } from '@/lib/task/bulk-check';
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
import { TaskMoveMenu } from '@/components/task/TaskMoveMenu';
import { useCompletedTaskAppearance } from '@/components/task/use-completed-appearance';
import { CancelledBadge } from '@/components/task/cancelled-badge';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';
import { getFavoriteDocuments } from '@/actions/document/get';
import { PIN_COPY, pinnedInOrder, type PinnedDocument } from '@/lib/task/pinned-docs';

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
  // G604：任务列表分页——服务端按 `(createdAt, id)` 游标出页，这里承接游标与加载状态，
  // ref 与 state 同步写，观察器与手动加载看到的是同一份状态。
  const [pageState, setPageState] = useState<TaskPageState>(initialTaskPageState);
  const pageStateRef = useRef(pageState);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [window, setWindow] = useState<UpcomingWindow>('all');
  // G1600: the group's section header collapses its rows.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(false);
  }, [group]);
  // G263: pinned documents (the `favorite` rows for this user).
  const [pinned, setPinned] = useState<PinnedDocument[]>([]);
  // G408: derived subtask groups (root block id → its subtask block ids).
  const [subtaskParent, setSubtaskParent] = useState<Map<string, string>>(new Map());

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

  /**
   * 读路径要叠本机未推送意图：`getTasksPage()` 读的是服务端权威行，断链时 `applyLocal`
   * 只把 op 留在队列里重试 ⇒ 不叠的话，刚删的任务会画回来、刚建的任务看不见
   * （文档树／回收站／评论／成员名册同一处置）。
   */
  const applyPageState = useCallback((next: TaskPageState) => {
    pageStateRef.current = next;
    setPageState(next);
  }, []);

  const load = useCallback(async () => {
    const [page, pending] = await Promise.all([getTasksPage(null), readPendingRows('task')]);
    setTasks(overlayTaskRows(page.items, pending));
    applyPageState(
      settleLoad(initialTaskPageState(), 'all', {
        nextToken: page.nextCursor,
        hasMore: page.nextCursor !== null,
        count: page.items.length,
      }),
    );
    setLoading(false);
  }, [applyPageState]);

  /**
   * G604：读到底部再要一页。游标只从 ref 取，状态在发请求前就写回 `loading`，
   * 观察器重复触发也只会翻同一页一次；失败回落 `idle`，再滚一次即重试。
   */
  const loadMore = useCallback(async () => {
    const state = pageStateRef.current;
    if (state.status !== 'idle' || !state.pageInfo?.hasMore) return;
    applyPageState(beginLoad(state));
    try {
      const page = await getTasksPage(cursorFor(state.cursors, 'all'));
      setTasks((current) => appendTaskPage(current, page.items));
      applyPageState(
        settleLoad(state, 'all', {
          nextToken: page.nextCursor,
          hasMore: page.nextCursor !== null,
          count: page.items.length,
        }),
      );
    } catch {
      applyPageState({ ...state, status: 'idle' });
    }
  }, [applyPageState]);

  // G263: the pinned area reads the favourite rows (id + title), in their stored order.
  useEffect(() => {
    void (async () => {
      const docs = await getFavoriteDocuments().catch(() => []);
      setPinned(docs.map((doc, index) => ({ documentId: doc.id, title: doc.title, order: index })));
    })();
  }, []);

  // G408: the subtask map is derived server-side (root block id → subtask block ids); the row
  // shows a "子任务" marker for a task that has any.
  useEffect(() => {
    void (async () => {
      const { subTasks } = await getSubTasks().catch(() => ({ subTasks: [] }));
      const map = new Map<string, string>();
      for (const group of subTasks) {
        for (const child of group.subTaskBlocks) map.set(child, group.rootTaskBlockId);
      }
      setSubtaskParent(map);
    })();
  }, []);

  // G604：哨兵进入视口（含提前 240px）⇒ 取下一页。哨兵只在还有下一页时挂载，
  // 所以 effect 依赖 hasMore 才能在首屏数据落地后重新挂观察器。
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = pageState.pageInfo?.hasMore === true;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  // 首屏加载走异步 IIFE：effect 体里同步调用会 setState 的回调会被
  // react-hooks/set-state-in-effect 拦下（与 GalleryView / TableView 同一口径）。
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  // 本机写／他端推送／入站 ack+pull 触碰 task ⇒ 重读（读路径已叠 pending，见 load）。
  useEffect(
    () =>
      getSyncManager().onStoreChanged((table) => {
        if (table !== 'task') return;
        void (async () => {
          await load();
        })();
      }),
    [load],
  );

  // G160：已完成任务的外观走本机 user 镜像（改设置页 → applyLocal → onStoreChanged('user') 即时生效）
  const appearance = useCompletedTaskAppearance();

  /**
   * 离线优先写：applyLocal 只落本地 store + 入队，**不等 flush**（去抖 2s）。
   * 而本页读路径是 getTasksPage（服务端权威行）⇒ 必须紧跟 flushNow，
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

  /**
   * G727：视图级撤销／重做（`Ctrl-Z`／`Ctrl-Shift-Z`）。栈只存**已发生**的那一步与它的逆，
   * 判定与出栈全在 `undo-stack.ts` 纯核里；这里只负责给每一步记下"怎么退回去"。
   */
  const historyRef = useRef<UndoState>(EMPTY_UNDO);
  const recordUndo = (entry: UndoEntry) => {
    historyRef.current = pushUndo(historyRef.current, entry);
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

  // G1573: Ctrl/⌘-J opens the standalone 「新任务」 popup (input + schedule/deadline buttons).
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSchedule, setQuickSchedule] = useState<string | null>(null);
  const [quickDue, setQuickDue] = useState<string | null>(null);
  const [quickPicker, setQuickPicker] = useState<'schedule' | 'deadline' | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isNewTaskShortcut(event)) {
        event.preventDefault();
        setQuickOpen(true);
        return;
      }
      if (event.key === 'Escape') setQuickOpen(false);
      // G727：`Ctrl-Z`／`Ctrl-Shift-Z` 是视图级撤销重做；输入框里让位给浏览器原生的文本撤销。
      if (isEditableTarget(event.target as HTMLElement | null)) return;
      const history = taskHistoryKeyAction(event);
      if (!history) return;
      event.preventDefault();
      const taken = history === 'undo' ? takeUndo(historyRef.current) : takeRedo(historyRef.current);
      if (!taken.entry) return;
      historyRef.current = taken.state;
      void (history === 'undo' ? taken.entry.undo() : taken.entry.redo());
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);

  const handleQuickCreate = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await writeTask(
      id,
      (userId) => taskPatchFor.create({ id, userId, title, dueDate: quickDue, scheduleDate: quickSchedule }, now),
      () => createTask(title),
    );
    setQuickOpen(false);
    setQuickTitle('');
    setQuickSchedule(null);
    setQuickDue(null);
    await load();
    router.refresh();
  };

  // toggle 保持 Server Action：它除改四列外还有两条服务端派生
  // （syncTaskToDocument 回写文档正文的 taskItem 勾选态、rollForward 为重复任务派生下一期行），
  // 客户端没有等价通路，搬进 applyLocal＝静默功能回归。见 tasks-local.ts 头部裁定 2。
  const handleToggle = async (id: string) => {
    await toggleTask(id, Intl.DateTimeFormat().resolvedOptions().timeZone);
    await load();
  };

  const [bulkBusy, setBulkBusy] = useState(false);
  const handleBulkCheck = async () => {
    const targets = bulkCheckTargets(visible);
    if (targets.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      for (const task of targets) {
        await toggleTask(task.id, Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCancel = async (id: string) => {
    const prior = tasks.find((task) => task.id === id);
    const now = new Date().toISOString();
    await getSyncManager().applyLocal({
      table: 'task',
      id,
      patch: { isCompleted: false, status: 'cancelled', cancelledAt: now, updatedAt: now },
    });
    await load();
    if (prior) {
      recordUndo({
        label: '取消任务',
        undo: async () => {
          await getSyncManager().applyLocal({
            table: 'task',
            id,
            patch: {
              isCompleted: prior.isCompleted,
              status: prior.status,
              cancelledAt: prior.cancelledAt,
              updatedAt: new Date().toISOString(),
            },
          });
          await load();
        },
        redo: () => handleCancel(id),
      });
    }
  };

  const handleSchedule = async (id: string, schedule: TaskSchedule) => {
    const prior = tasks.find((task) => task.id === id);
    const now = new Date().toISOString();
    await writeTask(id, () => taskPatchFor.schedule(schedule, now), () => setTaskSchedule(id, schedule));
    await load();
    if (prior) {
      const before: TaskSchedule = {
        dueDate: prior.dueDate,
        scheduleDate: prior.scheduleDate,
        remindAt: prior.remindAt,
        recurrence: prior.recurrence,
        recurrenceEnd: prior.recurrenceEnd,
      };
      recordUndo({
        label: '改任务日程',
        undo: () => handleSchedule(id, before),
        redo: () => handleSchedule(id, schedule),
      });
    }
  };

  const handleDelete = async (id: string, record = true) => {
    // patch === null 才是 delete op（applyLocal 据此定 op，服务端 delete 分支写墓碑列）
    await writeTask(id, () => null, () => deleteTask(id));
    await load();
    // G727：删除是视图里最不可逆的一步 ⇒ 逆操作＝清墓碑（行从未被物理移除）。
    if (record) {
      recordUndo({
        label: '删除任务',
        undo: async () => {
          await restoreTask(id);
          await load();
        },
        redo: () => handleDelete(id, false),
      });
    }
  };

  const handleRename = async (id: string, title: string) => {
    const next = title.trim();
    if (!next) return;
    await renameTask(id, next);
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
          window === 'all' ? tasks : tasks.filter((task) => withinUpcoming(task.scheduleDate, window, now)),
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
              className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-opacity"
            >
              <Plus className="size-4" />
              添加
            </button>
          </div>
        }
      />
      {/* G1077：官方的 tabs 是 `overflow-x:auto` ＋ `scrollbar-width:none`／
          `::-webkit-scrollbar{display:none}`，内容行 `width:max-content`；窄屏横滑、不显条。 */}
      <nav
        className="overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="task-groups"
      >
        <div className="flex w-max gap-1 px-4">
          {GROUPS.map((entry) => (
            <Link
              key={entry.group}
              href={entry.href}
              aria-current={entry.group === group ? 'page' : undefined}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
                entry.group === group
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </nav>
      {/* G263: the pinned-documents area. A document is pinned by favouriting it (the existing
          `favorite` table is the store), and the empty state says how to fill it. */}
      <section className="px-4 pt-3" data-testid="pinned-docs">
        {/* G34：craft 任务屏分区标题 15/600/18、α0.85（此前 12/500）。 */}
        <h2 className="mb-2 text-[15px] font-semibold leading-[18px] text-foreground/85">
          {PIN_COPY.pin.label}
        </h2>
        {pinned.length === 0 ? (
          // G35：craft 空态是纯文本、居中、无虚线边框（pad 0 64，13/16）。
          <p className="px-16 py-1 text-center text-[13px] leading-4 text-foreground/55">
            {PIN_COPY.emptyPage.label}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pinnedInOrder(pinned).map((doc) => (
              <Link
                key={doc.documentId}
                href={`/documents/${doc.documentId}`}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground"
              >
                <FileText className="size-3.5" />
                <span className="max-w-40 truncate">{doc.title}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      {/* G1600: the group title is one full-width button; ← / → / Space collapse, expand or toggle. */}
      <button
        type="button"
        id={`task-section-${group}`}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
        onKeyDown={(event) => {
          const action = sectionKeyAction(event);
          if (!action) return;
          event.preventDefault();
          setCollapsed((value) => applySectionAction(value, action));
        }}
        className="flex w-full items-center gap-2 border-b border-border px-4 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-foreground/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ChevronRight className={cn('size-4 transition-transform', !collapsed && 'rotate-90')} />
        {TASK_GROUP_LABELS[group]}
      </button>
      {!collapsed && (
        <div>
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
        {visible.some((task) => task.status !== 'cancelled') && (
          <button
            type="button"
            onClick={() => void handleBulkCheck()}
            disabled={bulkBusy}
            className="ml-2 shrink-0 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
          >
            {bulkCheckLabel(visible)}
          </button>
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
                    onCancel={handleCancel} onSchedule={handleSchedule} onRename={handleRename} appearance={appearance}
                    subtaskParent={subtaskParent}
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
                <GroupEmpty hint="全部完成！在文档中使用任务列表，勾选的任务会同步到这里" />
              ) : (
                <TaskList
                  items={active}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onCancel={handleCancel} onSchedule={handleSchedule} onRename={handleRename} appearance={appearance}
                  subtaskParent={subtaskParent}
                />
              )}
            </section>

            {completed.length > 0 && (
              <section>
                <h2 className="mb-2 text-[15px] font-semibold leading-[18px] text-foreground/85">
                  已完成 · {completed.length}
                </h2>
                <TaskList
                  items={completed}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onCancel={handleCancel} onSchedule={handleSchedule} onRename={handleRename} appearance={appearance}
                  subtaskParent={subtaskParent}
                />
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <h2 className="mb-2 text-[15px] font-semibold leading-[18px] text-foreground/85">
                  {CANCELLED_LABEL} · {cancelled.length}
                </h2>
                <TaskList
                  items={cancelled}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onCancel={handleCancel} onSchedule={handleSchedule} onRename={handleRename} appearance={appearance}
                  subtaskParent={subtaskParent}
                />
              </section>
            )}
          </>
        )}
        {!loading && hasMore && (
          <div
            ref={sentinelRef}
            data-testid="task-load-more"
            className="py-4 text-center text-sm text-muted-foreground"
          >
            {pageState.status === 'loading' ? '加载中…' : '加载更多'}
          </div>
        )}
      </AppPageContainer>
        </div>
      )}

      {quickOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4 pt-24"
          role="dialog"
          aria-label="新任务"
          data-testid="task-quick-popup"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background p-3 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <Input
              autoFocus
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleQuickCreate();
              }}
              placeholder="新任务"
              aria-label="新任务"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuickPicker((current) => (current === 'schedule' ? null : 'schedule'))}
                className="rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:bg-foreground/4"
                aria-label="计划任务"
              >
                计划{quickSchedule ? `：${toDayInputValue(quickSchedule)}` : ''}
              </button>
              <button
                type="button"
                onClick={() => setQuickPicker((current) => (current === 'deadline' ? null : 'deadline'))}
                className="rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:bg-foreground/4"
                aria-label="设定截止日期"
              >
                截止{quickDue ? `：${toDayInputValue(quickDue)}` : ''}
              </button>
              <button
                type="button"
                onClick={() => void handleQuickCreate()}
                className="ml-auto rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
              >
                添加
              </button>
            </div>
            {quickPicker && (
              <div className="mt-2 flex flex-col rounded-md border border-border/60 p-1">
                {taskDateOptions(quickPicker).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      const value = localDayInstant(option.date);
                      if (quickPicker === 'schedule') setQuickSchedule(value);
                      else setQuickDue(value);
                      setQuickPicker(null);
                    }}
                    className="rounded px-2 py-1 text-left text-xs hover:bg-foreground/4"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function focusAddInput(): void {
  document.querySelector<HTMLInputElement>('input[placeholder="添加任务，按回车确认…"]')?.focus();
}

/**
 * G1077：`_card_ydla7_` 那族是**零态卡**（`tasks-zero-state`），不是普通空态框——
 * `height:180px / radius:15px / border:none / background:foreground-50 / overflow:hidden`，
 * 两层 `_layer` 绝对铺满且 `pointer-events:none`，静止只显 `_idle`，hover/focus 时
 * `_idle→0`、`_action→1`（换脸而非叠加）。键盘焦点环是 `outline:1px solid accent`，
 * `outline-offset:-1px`（官方三档之一，盒子在卡内描）。
 */
function GroupEmpty({ hint }: { hint: string }) {
  return (
    <button
      type="button"
      onClick={focusAddInput}
      aria-label={TASKS_ADD_TASK}
      data-testid="tasks-zero-state"
      className="group relative block h-[180px] w-full shrink-0 cursor-pointer select-none overflow-hidden rounded-[15px] border-none bg-foreground/5 text-center text-foreground/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-ring"
    >
      <span
        aria-hidden
        data-testid="tasks-zero-state-idle"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 opacity-100 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
      >
        <span className="flex size-10 shrink-0 items-center justify-center">
          <CheckSquare className="size-10" />
        </span>
        <span className="text-sm">{hint}</span>
      </span>
      <span
        aria-hidden
        data-testid="tasks-zero-state-action"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="flex size-10 shrink-0 items-center justify-center">
          <Plus className="size-10" />
        </span>
        <span className="text-sm">{TASKS_ADD_TASK}</span>
      </span>
    </button>
  );
}

function TaskList({
  items,
  onToggle,
  onDelete,
  onCancel,
  onSchedule,
  onRename,
  appearance,
  subtaskParent,
}: {
  items: TaskItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCancel: (id: string) => void;
  onSchedule: (id: string, schedule: TaskSchedule) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  appearance: 'faded' | 'strike' | 'none';
  subtaskParent: Map<string, string>;
}) {
  // G270: dragging a task row lands by **half region** (left half inserts before, right half
  // after) and suppresses the indicator in the three cases the official build does. The reorder
  // itself is relative-position (`reorderTasks(blockId, afterBlockId)`).
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState(true);

  const ids = items.map((task) => task.id);

  const onDragOverRow = (event: React.DragEvent, targetId: string) => {
    if (!draggingId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const side = sideFor(event.clientX, { left: rect.left, right: rect.right });
    const targetIndex = ids.indexOf(targetId);
    const neighbors = [ids[targetIndex - 1] ?? null, ids[targetIndex + 1] ?? null];
    const suppress = shouldSuppressIndicator({
      draggingId,
      targetId,
      draggedGroup: [draggingId],
      targetNeighbors: neighbors,
    });
    if (suppress) {
      setDropTargetId(null);
      return;
    }
    setDropTargetId(targetId);
    setDropBefore(side === 'left');
  };

  const onDropRow = async () => {
    const dragged = draggingId;
    const target = dropTargetId;
    setDraggingId(null);
    setDropTargetId(null);
    if (!dragged || !target || dragged === target) return;
    // Relative anchor: "after X" for a right-half drop, "after the row before X" for a left-half.
    const afterBlockId = dropBefore ? (ids[ids.indexOf(target) - 1] ?? null) : target;
    await reorderTasks(dragged, afterBlockId).catch(() => {});
  };

  return (
    <div className="flex flex-col">
      {items.map((task) => (
        <div
          key={task.id}
          draggable
          onDragStart={() => setDraggingId(task.id)}
          onDragEnd={() => {
            setDraggingId(null);
            setDropTargetId(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onDragOverRow(event, task.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            void onDropRow();
          }}
          className={cn(
            dropTargetId === task.id && 'border-t-2 border-foreground/40',
            draggingId === task.id && 'opacity-40',
          )}
        >
          <TaskRow
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onCancel={onCancel}
            onSchedule={onSchedule}
            onRename={onRename}
            appearance={appearance}
            isSubtask={subtaskParent.has(task.id)}
          />
        </div>
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
  // G401: the day shown is the local calendar day the stored instant represents.
  return toDayInputValue(value);
}

/**
 * G639: the reminder is a **minute-of-day slot**, so the panel offers the same 96-entry grid the
 * popover does. A stored moment that is not on a slot keeps its own row (no silent snapping).
 */
function reminderSlotValue(remindAt: string | null): string {
  if (!remindAt) return '';
  const date = new Date(remindAt);
  if (Number.isNaN(date.getTime())) return '';
  const index = slotIndexForTime(date);
  return instantForSlot(date, index).getTime() === date.getTime() ? String(index) : 'current';
}

function fromDayInput(value: string): string | null {
  // G401: a day input stores the UTC instant of local midnight, not of the input's own zone.
  return fromDayInputValue(value);
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onCancel,
  onSchedule,
  onRename,
  appearance,
  isSubtask = false,
}: {
  task: TaskItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCancel: (id: string) => void;
  onSchedule: (id: string, schedule: TaskSchedule) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  appearance: 'faded' | 'strike' | 'none';
  /** G408: whether this task is a subtask of another (derived server-side). */
  isSubtask?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dateMenu, setDateMenu] = useState<'date' | 'deadline' | null>(null);
  // G727：`⏎` 就地把行标题换成输入框；Enter 提交、Escape 放弃、失焦提交。
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const rule = parseRecurrence(task.recurrence);
  const schedule = {
    dueDate: task.dueDate,
    scheduleDate: task.scheduleDate,
    remindAt: task.remindAt,
    recurrence: task.recurrence,
    recurrenceEnd: task.recurrenceEnd,
  };

  const update = (patch: Partial<TaskSchedule>) => {
    const next = { ...schedule, ...patch };
    // G652: setting a repeat refreshes the schedule in the same patch when it was empty.
    if ('recurrence' in patch) {
      next.scheduleDate = scheduleWithRecurrence(next.recurrence, next.scheduleDate, new Date());
      // G667: a new repeat also gets the default 09:00 reminder on that day.
      if (next.recurrence) next.remindAt = defaultReminderForRepeat(next.scheduleDate, next.remindAt);
    }
    void onSchedule(task.id, next);
  };

  return (
    <div className="border-b border-border/40 last:border-0">
      <div
        role="button"
        tabIndex={0}
        aria-label={task.title}
        onKeyDown={(event) => {
          // 行内输入框/勾选框/按钮自己的键不归行处理（否则在就地编辑里敲空格会切换完成态）。
          if (event.target !== event.currentTarget) return;
          // G1574/G1603: the row is focusable; the table-D chords act on it.
          const action = taskRowKeyAction(event);
          if (action) {
            event.preventDefault();
            if (action === 'toggle') return onToggle(task.id);
            if (action === 'cancel') return onCancel(task.id);
            if (action === 'schedule-today') {
              update({ scheduleDate: localDayInstant(new Date()) });
              return;
            }
            setDateMenu(action);
            return;
          }
          // G727「在任务视图中」那半：`↑`／`↓` 行导航、`⌫`／`Delete` 删任务、`⏎` 编辑、
          // `Ctrl-→` 导航至区块。
          const view = taskViewKeyAction(event);
          if (!view) return;
          event.preventDefault();
          if (view === 'delete') return onDelete(task.id);
          if (view === 'edit') {
            setDraft(task.title);
            setEditing(true);
            return;
          }
          if (view === 'navigate-block') {
            if (task.documentId) {
              router.push(anchorHref({ documentId: task.documentId, blockId: task.blockId }));
            }
            return;
          }
          const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
          const target = rowNavIndex(rows.indexOf(event.currentTarget as HTMLElement), rows.length, view);
          if (target != null) rows[target]?.focus();
        }}
        data-task-row
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Checkbox checked={task.isCompleted} onCheckedChange={() => onToggle(task.id)} />
        {editing ? (
          <input
            autoFocus
            value={draft}
            aria-label="编辑任务"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setEditing(false);
                void onRename(task.id, draft);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setEditing(false);
              }
            }}
            onBlur={() => {
              setEditing(false);
              if (draft.trim() && draft.trim() !== task.title) void onRename(task.id, draft);
            }}
            className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5 text-sm text-foreground"
          />
        ) : (
          <span
            className={cn(
              'flex-1 truncate text-sm',
              (task.isCompleted || task.status === 'cancelled') && completedTaskClasses(appearance)
            )}
          >
            {isSubtask && <span className="mr-1.5 text-xs text-muted-foreground" data-testid="subtask-marker">↳</span>}
            {task.title}
            {task.dueDate && isOverdue(task.dueDate, task.isCompleted || task.status === 'cancelled') && (
              <span className="ml-2 text-xs text-destructive">{overdueLabel(task.dueDate)}</span>
            )}
          </span>
        )}

        {task.status === 'cancelled' && <CancelledBadge cancelledAt={task.cancelledAt} />}

        {task.recurrence && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {describeRecurrence(task.recurrence) ??
              FREQUENCY_LABELS[parseFrequency(task.recurrence)] ??
              '重复'}
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
        <TaskDatePopover
          kind="schedule"
          value={task.scheduleDate}
          onChange={(value) => update({ scheduleDate: value })}
          reminder={{
            value: task.remindAt,
            onChange: (value) => {
              update({ remindAt: value });
              // G647: changing a reminder flashes a 3s info toast carrying the new moment.
              toast.add({
                id: `reminder-${task.id}`,
                type: 'info',
                title: REMINDER_CHANGED_TITLE,
                description: nextReminderText(value),
                timeout: REMINDER_TOAST_DURATION_MS,
              });
            },
          }}
          recurrence={{ value: task.recurrence, onChange: (value) => update({ recurrence: value }) }}
        />
        <TaskDatePopover
          kind="deadline"
          value={task.dueDate}
          inheritFrom={task.scheduleDate}
          onChange={(value) => update({ dueDate: value })}
          reminder={{
            value: task.remindAt,
            onChange: (value) => {
              update({ remindAt: value });
              toast.add({
                id: `reminder-${task.id}`,
                type: 'info',
                title: REMINDER_CHANGED_TITLE,
                description: nextReminderText(value),
                timeout: REMINDER_TOAST_DURATION_MS,
              });
            },
          }}
          recurrence={{ value: task.recurrence, onChange: (value) => update({ recurrence: value }) }}
        />

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
        {/* G1529：移至每日笔记 / 某篇文档（已在文档里的任务不搬）。 */}
        <TaskMoveMenu taskId={task.id} disabled={Boolean(task.documentId)} />
        <button
          onClick={() => onDelete(task.id)}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="删除任务"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {dateMenu && (
        <div className="px-3 pb-2">
          <Input
            type="date"
            autoFocus
            aria-label={dateMenu === 'date' ? '日期' : '截止日期'}
            defaultValue={toDayInputValue(dateMenu === 'date' ? task.scheduleDate : task.dueDate)}
            onBlur={() => setDateMenu(null)}
            onChange={(event) => {
              const value = fromDayInputValue(event.target.value);
              update(dateMenu === 'date' ? { scheduleDate: value } : { dueDate: value });
              setDateMenu(null);
            }}
          />
        </div>
      )}

      {open && (
        <div
          className="grid gap-2 px-3 pb-3 sm:grid-cols-2"
          // G643: the panel is a named key scope — Escape closes it (the innermost of the three
          // levels: submenu → popover → panel), Enter commits while a field is focused.
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            提醒时间
            <select
              aria-label="提醒时间"
              data-testid="task-remind-slot"
              value={reminderSlotValue(task.remindAt)}
              onChange={(event) => {
                const picked = event.target.value;
                if (picked === '' || picked === 'current') return;
                // G639: 「无提醒」 is a row of its own and only exists once a reminder is set.
                if (picked === 'none') return update({ remindAt: null });
                const day = task.scheduleDate ?? task.dueDate;
                const base = day ? new Date(day) : new Date();
                if (Number.isNaN(base.getTime())) return;
                update({ remindAt: instantForSlot(base, Number(picked)).toISOString() });
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {!task.remindAt && <option value="">未设置</option>}
              {reminderSlotValue(task.remindAt) === 'current' && (
                <option value="current">
                  {new Date(task.remindAt as string).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </option>
              )}
              {task.remindAt && <option value="none">无提醒</option>}
              {timeSlots().map((slot) => (
                <option key={slot.index} value={slot.index}>
                  {slot.label}
                </option>
              ))}
            </select>
          </label>
          {/* G648：重复任务的那条提醒走**第二套 UI**——`dateOffset` 96 档（相对排期日提前多久），
              与上面那根绝对时刻是**两个不同的字段**。选了档位就按排期日换算成绝对时刻落库。 */}
          {rule?.freq && task.scheduleDate && (
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground" data-testid="task-remind-offset">
              重复内提醒
              <select
                value=""
                onChange={(event) => {
                  const minutes = Number(event.target.value);
                  if (!Number.isFinite(minutes)) return;
                  const at = remindAtFromOffset(task.scheduleDate as string, minutes);
                  if (at) update({ remindAt: at });
                }}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">选择提前量</option>
                {REMIND_OFFSET_TIERS.filter((m) => m > 0).map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {remindOffsetLabel(minutes)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            重复
            <select
              value={rule?.freq ?? ''}
              onChange={(event) => {
                // G646：选档时**就地补足最小合法子项**（周档带当天、月档带今日日号、年档带月+日），
                // 于是写进 `recurrence` 的规则恒过那四档真值表 —— 官方选完「每周」也自带当天。
                const freq = event.target.value as '' | 'daily' | 'weekly' | 'monthly' | 'yearly';
                update({ recurrence: freq ? repeatRuleFor(freq, new Date()) : null });
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="">不重复</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            每 N 个单位
            {rule ? (
              <RepeatIntervalSelect
                raw={task.recurrence}
                onChange={(next) => update({ recurrence: next })}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              />
            ) : (
              <Input type="number" disabled value={1} readOnly />
            )}
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            重复依据
            <select
              value={rule?.type ?? 'fixed'}
              disabled={!rule}
              onChange={(event) =>
                update({ recurrence: patchRule(task.recurrence, { type: event.target.value }) })
              }
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="fixed">按计划日</option>
              <option value="flexible">相对于完成</option>
            </select>
          </label>
          {/* G637: the anchor is explained in the official accent banner. */}
          <div className="sm:col-span-2">
            <RepeatAnchorNote raw={task.recurrence} />
          </div>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            重复结束于
            <Input
              type="date"
              disabled={!task.recurrence}
              value={toDayInput(task.recurrenceEnd)}
              onChange={(event) => update({ recurrenceEnd: fromDayInput(event.target.value) })}
            />
          </label>
          {/* G370：面板是"一次会话内连续配置"的面——提交不关它，且两个快捷行常驻：
              「提醒我…」用官方那七档里的可落档位直接写 `remindAt`；「清除 日期」一次清掉三个时间字段。 */}
          <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
            <span className="text-[11px] text-muted-foreground">提醒我…</span>
            {REMIND_PRESETS.filter((preset) => isInstantPreset(preset.id)).map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-testid={`task-remind-${preset.id}`}
                onClick={() => {
                  const at = remindInstantFor(preset.id, new Date());
                  if (at) update({ remindAt: at.toISOString() });
                }}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-foreground/4 hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              data-testid="task-clear-dates"
              onClick={() => update({ remindAt: null, dueDate: null, scheduleDate: null })}
              className="ml-auto rounded-full px-2 py-0.5 text-[11px] text-(--craft-accent) hover:bg-foreground/4"
            >
              清除 日期
            </button>
          </div>
          {/* G260: the series batch operations — only a recurring task has "remaining" items. */}
          {task.recurrence && (
            <div className="sm:col-span-2" data-testid="series-ops">
              <div className="mb-1 text-[11px] text-muted-foreground">重复序列</div>
              <div className="flex flex-wrap gap-1.5">
                {SERIES_OPS.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      const mapped =
                        op.id === 'completeRemaining'
                          ? 'complete'
                          : op.id === 'cancelRemaining'
                            ? 'cancel'
                            : op.id === 'deleteRemaining'
                              ? 'delete'
                              : op.id === 'moveRemaining'
                                ? 'move'
                                : 'reschedule';
                      void applySeriesOp(task.id, mapped as never, { rescheduleDays: 1 });
                    }}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground/75 transition-colors hover:bg-foreground/4"
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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

/** Patch one field of the stored rule without dropping the others (G404/G256). */
function patchRule(raw: string | null, patch: Record<string, unknown>): string | null {
  if (!raw) return null;
  let rule: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') rule = parsed as Record<string, unknown>;
  } catch {
    rule = {};
  }
  return JSON.stringify({ ...rule, ...patch });
}
