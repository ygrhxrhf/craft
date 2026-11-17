'use client';

import { useSyncExternalStore } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TASK_DOCUMENT_SORT_CREATED,
  TASK_DOCUMENT_SORT_NAME,
  TASK_DOCUMENT_SORT_UPDATED,
  TASK_GROUP_BY_DEADLINE,
  TASK_GROUP_BY_DOCUMENT,
  TASK_GROUP_BY_LABEL,
  TASK_GROUP_BY_SCHEDULE,
  TASK_INBOX_SORT_BY_LABEL,
  TASK_MORE_OPTIONS,
  TASK_SHOW_PAST_DATES,
  TASK_SHOW_SCHEDULED,
  TASK_SORT_DEADLINE,
  TASK_SORT_DOCUMENTS_BY,
  TASK_SORT_MANUAL,
  TASK_SORT_SCHEDULE,
  TASK_SORT_TASKS_BY,
  TASK_VIEW_COMPLETED,
} from '@/lib/task/official-copy';
import {
  readShowCompletedNow,
  serverShowCompleted,
  subscribeShowCompleted,
  writeShowCompleted,
  type TaskGroup,
} from '@/lib/task/grouping';
import {
  writeTaskViewSetting,
  type DocumentSort,
  type TaskViewSettings,
} from '@/lib/task/task-view-settings';

/**
 * G604：官方任务屏的「更多选项」菜单（`rs` 触发钮，`aria-label` 取 `more.options`）。三个页签
 * 共用一枚按钮，只有内容不同——照 `Ha`（收件箱）／`Bd`（今天）／`md`（即将进行）三份清单摆：
 *
 * - 收件箱：排序方式（安排／截止日期／手动的）→ 显示计划任务 → 查看已完成的任务；
 * - 今天：文档排序 → 任务排序 → 显示过去日期；
 * - 即将进行：分组依据（安排／截止日期／文档），**仅**按文档分组时才出文档排序与任务排序；
 * - 所有任务：官方 `r1` 调 `Oi` 时**不传** `taskSort`，清单只剩「显示计划任务 → 查看已完成的任务」两节。
 *
 * 每行右边的 ✓ 表示「当前值」（官方 `rightContent`），开关类同理：✓ 即已打开。
 */
const DOCUMENT_SORTS: { value: DocumentSort; label: string }[] = [
  { value: 'title', label: TASK_DOCUMENT_SORT_NAME },
  { value: 'modified', label: TASK_DOCUMENT_SORT_UPDATED },
  { value: 'created', label: TASK_DOCUMENT_SORT_CREATED },
];

const TASK_SORTS = [
  { value: 'schedule', label: TASK_SORT_SCHEDULE },
  { value: 'deadline', label: TASK_SORT_DEADLINE },
] as const;

const INBOX_TASK_SORTS = [
  ...TASK_SORTS,
  { value: 'manual', label: TASK_SORT_MANUAL },
] as const;

function MenuRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <span className="truncate">{label}</span>
      {checked && <Check className="ml-auto size-3.5" />}
    </DropdownMenuItem>
  );
}

export function TaskSettingsMenu({
  group,
  settings,
  onCheckAll,
  checkAllLabel,
  onSetDefaultView,
  setDefaultLabel,
}: {
  group: TaskGroup;
  settings: TaskViewSettings;
  /** G1653：官方把「全部完成」「设置为默认视图」「显示已完成」收在分区 ⋯ 里，不在工具条上排开。 */
  onCheckAll?: () => void;
  checkAllLabel?: string;
  onSetDefaultView?: () => void;
  setDefaultLabel?: string;
}) {
  const showCompleted = useSyncExternalStore(
    subscribeShowCompleted,
    readShowCompletedNow,
    serverShowCompleted,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={TASK_MORE_OPTIONS}
        aria-haspopup="menu"
        data-testid="tasks-settings-button"
        className="ml-2 flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        {group === 'inbox' && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{TASK_INBOX_SORT_BY_LABEL}</DropdownMenuLabel>
              {INBOX_TASK_SORTS.map((sort) => (
                <MenuRow
                  key={sort.value}
                  label={sort.label}
                  checked={settings.inboxTaskSort === sort.value}
                  onClick={() => writeTaskViewSetting('inboxTaskSort', sort.value)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <MenuRow
              label={TASK_SHOW_SCHEDULED}
              checked={settings.inboxShowScheduledTasks}
              onClick={() =>
                writeTaskViewSetting('inboxShowScheduledTasks', !settings.inboxShowScheduledTasks)
              }
            />
          </>
        )}

        {group === 'all' && (
          <>
            <MenuRow
              label={TASK_SHOW_SCHEDULED}
              checked={settings.inboxShowScheduledTasks}
              onClick={() =>
                writeTaskViewSetting('inboxShowScheduledTasks', !settings.inboxShowScheduledTasks)
              }
            />
          </>
        )}

        {group === 'today' && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{TASK_SORT_DOCUMENTS_BY}</DropdownMenuLabel>
              {DOCUMENT_SORTS.map((sort) => (
                <MenuRow
                  key={sort.value}
                  label={sort.label}
                  checked={settings.todaySortProperty === sort.value}
                  onClick={() => writeTaskViewSetting('todaySortProperty', sort.value)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{TASK_SORT_TASKS_BY}</DropdownMenuLabel>
              {TASK_SORTS.map((sort) => (
                <MenuRow
                  key={sort.value}
                  label={sort.label}
                  checked={settings.todayTaskSort === sort.value}
                  onClick={() => writeTaskViewSetting('todayTaskSort', sort.value)}
                />
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <MenuRow
              label={TASK_SHOW_PAST_DATES}
              checked={settings.todayShowPastDueTasks}
              onClick={() =>
                writeTaskViewSetting('todayShowPastDueTasks', !settings.todayShowPastDueTasks)
              }
            />
          </>
        )}

        {group === 'upcoming' && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{TASK_GROUP_BY_LABEL}</DropdownMenuLabel>
              <MenuRow
                label={TASK_GROUP_BY_SCHEDULE}
                checked={settings.upcomingGroupBy === 'schedule'}
                onClick={() => writeTaskViewSetting('upcomingGroupBy', 'schedule')}
              />
              <MenuRow
                label={TASK_GROUP_BY_DEADLINE}
                checked={settings.upcomingGroupBy === 'deadline'}
                onClick={() => writeTaskViewSetting('upcomingGroupBy', 'deadline')}
              />
              <MenuRow
                label={TASK_GROUP_BY_DOCUMENT}
                checked={settings.upcomingGroupBy === 'document'}
                onClick={() => writeTaskViewSetting('upcomingGroupBy', 'document')}
              />
            </DropdownMenuGroup>
            {settings.upcomingGroupBy === 'document' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{TASK_SORT_DOCUMENTS_BY}</DropdownMenuLabel>
                  {DOCUMENT_SORTS.map((sort) => (
                    <MenuRow
                      key={sort.value}
                      label={sort.label}
                      checked={settings.upcomingDocumentSort === sort.value}
                      onClick={() => writeTaskViewSetting('upcomingDocumentSort', sort.value)}
                    />
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{TASK_SORT_TASKS_BY}</DropdownMenuLabel>
                  {TASK_SORTS.map((sort) => (
                    <MenuRow
                      key={sort.value}
                      label={sort.label}
                      checked={settings.upcomingTaskSort === sort.value}
                      onClick={() => writeTaskViewSetting('upcomingTaskSort', sort.value)}
                    />
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          role="menuitemcheckbox"
          aria-checked={showCompleted}
          aria-label={TASK_VIEW_COMPLETED}
          onClick={() => writeShowCompleted(globalThis.localStorage, !showCompleted)}
        >
          <span className="truncate">{TASK_VIEW_COMPLETED}</span>
          {showCompleted && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
        {(onCheckAll || onSetDefaultView) && <DropdownMenuSeparator />}
        {onCheckAll && (
          <DropdownMenuItem onClick={onCheckAll}>{checkAllLabel}</DropdownMenuItem>
        )}
        {onSetDefaultView && (
          <DropdownMenuItem onClick={onSetDefaultView}>{setDefaultLabel}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
