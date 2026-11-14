import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const view = () =>
  readFileSync(join(process.cwd(), 'src', 'app', '(app)', 'tasks', 'TasksView.tsx'), 'utf8');
const actions = () => readFileSync(join(process.cwd(), 'src', 'actions', 'task', 'task.ts'), 'utf8');

// G727: 「在任务视图中」那一半——↑/↓ 行导航、⌫/Delete 删任务、⏎ 编辑、Ctrl-→ 导航至区块、
// Ctrl-Z / Ctrl-Shift-Z 的视图级撤销重做。
describe('task view keys wired (G727)', () => {
  it('routes row keys through taskViewKeyAction and rowNavIndex', () => {
    const source = view();
    expect(source).toContain('taskViewKeyAction(event)');
    expect(source).toContain('rowNavIndex(');
    expect(source).toContain("data-task-row");
    // 非空断言：键函数确实在行处理器里被调用，而不是只在 import。
    expect(source).toMatch(/const view = taskViewKeyAction\(event\);\s*\n\s*if \(!view\) return;/);
  });

  it('edits inline and renames the document node too', () => {
    const source = view();
    expect(source).toContain('aria-label="编辑任务"');
    expect(source).toContain('onRename(task.id, draft)');
    const task = actions();
    expect(task).toContain('export async function renameTask(');
    // 正文回写：只改列会让下一次保存把旧标题写回去。
    expect(task).toContain('renameTaskNode(');
    expect(task).toContain("node.type === 'taskItem'");
  });

  it('navigates to the block anchor with Ctrl-→ and carries blockId', () => {
    const source = view();
    expect(source).toContain("import { anchorHref } from '@/lib/editor/block-anchor';");
    expect(source).toContain("if (view === 'navigate-block')");
    expect(source).toMatch(/anchorHref\(\{ documentId: task\.documentId, blockId: task\.blockId \}\)/);
    expect(actions()).toContain('blockId: typeof row.blockId === \'string\' && row.blockId ? row.blockId : null,');
  });

  it('gives the view a Ctrl-Z / Ctrl-Shift-Z history and a delete inverse', () => {
    const source = view();
    expect(source).toContain('taskHistoryKeyAction(event)');
    expect(source).toContain('isEditableTarget(event.target as HTMLElement | null)');
    expect(source).toContain('takeUndo(historyRef.current)');
    expect(source).toContain('takeRedo(historyRef.current)');
    // 删除的逆操作走墓碑清除，不是重插。
    expect(source).toContain('await restoreTask(id);');
    expect(actions()).toContain('export async function restoreTask(');
  });
});

// G1077: 任务视图零态卡 `_card_ydla7_` 族与 tabs 横滑。
describe('task zero-state card and tabs (G1077)', () => {
  it('renders the 180/15 idle-action card with both layers', () => {
    const source = view();
    expect(source).toContain('data-testid="tasks-zero-state"');
    expect(source).toContain('data-testid="tasks-zero-state-idle"');
    expect(source).toContain('data-testid="tasks-zero-state-action"');
    expect(source).toContain('h-[180px]');
    expect(source).toContain('rounded-[15px]');
    expect(source).toContain('aria-label={TASKS_ADD_TASK}');
    // 换脸而非叠加：idle 在 hover 时退到 0，action 才进到 1。
    expect(source).toContain('group-hover:opacity-0 group-focus-visible:opacity-0');
    expect(source).toContain('group-hover:opacity-100 group-focus-visible:opacity-100');
    // 官方焦点环是 -1px outline（三档之一），不是 box-shadow ring。
    expect(source).toContain('focus-visible:outline-offset-[-1px]');
    expect(source).toContain('focus-visible:outline-ring');
    // 非空断言：旧虚线空态框已整段消失。
    expect(source).not.toContain('border-dashed');
  });

  it('lets the tabs row scroll horizontally with both scrollbar hiders', () => {
    const source = view();
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('[scrollbar-width:none]');
    expect(source).toContain('[&::-webkit-scrollbar]:hidden');
    expect(source).toContain('flex w-max gap-1 px-4');
  });
});

// G604: 三份设置清单（`Oi`/`Bd`/`md`）与 `Ki` 拖拽闸门。菜单只有一枚触发钮，四档都在；
// 所有任务那一档官方调 `Oi` 时不传 `taskSort` ⇒ 只剩两节。
const menu = () =>
  readFileSync(join(process.cwd(), 'src', 'components', 'task', 'TaskSettingsMenu.tsx'), 'utf8');

describe('task settings menus and drag gate (G604)', () => {
  it('renders one trigger for all four groups and none of them bails out', () => {
    const source = menu();
    expect(source).toContain('data-testid="tasks-settings-button"');
    expect(source).toContain('aria-label={TASK_MORE_OPTIONS}');
    expect(source).toContain('align="end"');
    expect(source).toContain('min-w-60');
    for (const group of ['inbox', 'all', 'today', 'upcoming']) {
      expect(source).toContain(`group === '${group}'`);
    }
    expect(source).not.toMatch(/group === 'all'\)\s*return null;/);
  });

  it('gives inbox the sort list, all only the two shared rows, today three sections', () => {
    const source = menu();
    expect(source).toContain("writeTaskViewSetting('inboxTaskSort', ");
    expect(source).toContain('INBOX_TASK_SORTS');
    expect(source).toContain('TASK_SHOW_SCHEDULED');
    expect(source).toContain("writeTaskViewSetting('todaySortProperty', ");
    expect(source).toContain("writeTaskViewSetting('todayTaskSort', ");
    expect(source).toContain('TASK_SHOW_PAST_DATES');
    expect(source).toContain("writeTaskViewSetting('upcomingGroupBy', ");
    // 仅按文档分组时才出两枚排序清单。
    expect(source).toMatch(/settings\.upcomingGroupBy === 'document' &&/);
    // 「所有任务」不出现排序方式那一节：`TASK_INBOX_SORT_BY_LABEL` 只在收件箱块里。
    const allBlock = source.slice(source.indexOf("group === 'all'"), source.indexOf("group === 'today'"));
    expect(allBlock).not.toContain('TASK_INBOX_SORT_BY_LABEL');
    expect(allBlock).toContain('TASK_SHOW_SCHEDULED');
    expect(allBlock).toContain('TASK_VIEW_COMPLETED');
  });

  it('gates the drop on the sort and offers switch-to-manual only in the inbox', () => {
    const source = view();
    const menuSource = menu();
    // 闸门只挂在排序不是「手动的」时。
    expect(source).toContain('canReorderTasks(settings.inboxTaskSort)');
    expect(source).toContain("id: 'tasks-reorder-refused'");
    expect(source).toContain('timeout: 3000');
    expect(source).toContain('TASK_SWITCH_TO_MANUAL');
    expect(source).toContain("writeTaskViewSetting('inboxTaskSort', 'manual')");
    // 四份列表（即将进行分节 + 未办/已完成/已取消）全都吃这枚闸门。
    expect((source.match(/onReorderRefused=\{refusal\}/g) ?? []).length).toBe(4);
    // 落行处理器先问闸门，再发相对定位。
    expect(source).toMatch(/if \(onReorderRefused\) \{\s*\n\s*onReorderRefused\(\);\s*\n\s*return;/);
    expect(source).toMatch(/if \(onReorderRefused\) return;/);
    // 菜单本体只写设置，不自己拖行。
    expect(menuSource).not.toContain('reorderTasks');
  });

  // 真面核验（第 550 批）：菜单里的「查看已完成的任务」若只翻父组件 state，行会冒出来而内联
  // 开关仍读设备存储的 false——两处显示打架，刷新还会丢。两处必须同源。
  it('routes the completed menu row through the same device store as the switch', () => {
    const source = view();
    expect(source).toContain('writeShowCompleted(globalThis.localStorage, true)');
    expect(source).not.toContain('onShowCompleted={() => setShowCompleted(true)}');
  });
});
