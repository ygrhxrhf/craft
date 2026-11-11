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
