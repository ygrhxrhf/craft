import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Schema, type Node as PMNode } from '@tiptap/pm/model';
import { EditorState, type Transaction } from '@tiptap/pm/state';
import { createTaskIdPlugin } from './task-id';

/**
 * `gap.md` G1500 —— 正文里那枚待办行的**身份必须持久**。
 *
 * 投影对账的键是 `tasks.blockId === 正文 attrs.taskId`（`src/actions/task/task.ts:100-137`）。
 * 此前没有任何一处把 `taskId` 写进文档：唯一的赋值落在 `collectTaskItems()` 那份临时 JSON 上，
 * 事务一结束就散 ⇒ 每次保存都换一枚 uuid ⇒ 对账永不命中 ⇒ 走"新建行＋把上一行打墓碑"那一支。
 * 现跑取证（e2e 账号）：屏上只有 2 条不同的待办的文档，库里 6 行、6 个互不相同的 `blockId`，
 * 其中 4 行是墓碑；整表 `documentId` 非空的 63 行里 20 行是墓碑。
 * 用户看得见的代价＝任务页上改的 `dueDate`/`completedAt`/`recurrence`/`order`
 * 不在投影列里，行一换新它们就归零。
 *
 * 夹具与线上同形（承 `src/lib/editor/trailing-node.test.ts` 那份口径）：真 `Schema`＋真
 * `EditorState`，插件从这里直接挂上去走完整 PM 管线。摘掉 `Editor.tsx` 的注册会红在最后那道
 * 接线闸上；把插件本身改坏（比如去掉 `docChanged` 闸门）会红在这里。
 */

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    taskList: { group: 'block', content: 'taskItem+' },
    taskItem: {
      group: 'block',
      content: 'paragraph',
      attrs: {
        taskId: { default: null },
        checked: { default: false },
        remindAt: { default: null },
        cancelled: { default: false },
      },
    },
    text: {},
  },
  marks: {},
});

const n = schema.nodes;
const para = (text: string) => n.paragraph.create(null, text ? schema.text(text) : null);
const item = (text: string, attrs: Record<string, unknown> = {}) =>
  n.taskItem.create({ ...attrs }, para(text));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function taskIds(document: PMNode): (string | null)[] {
  const out: (string | null)[] = [];
  document.descendants((node) => {
    if (node.type === n.taskItem) out.push((node.attrs.taskId as string | null) ?? null);
  });
  return out;
}

/** 从空文档起步，插件已挂载。传实例进来是为了让"改视图可编辑性"和"跑管线"用的是同一个插件。 */
function freshState(plugin = createTaskIdPlugin()) {
  return EditorState.create({ doc: n.doc.create(null, []), plugins: [plugin] });
}

function appendItems(state: EditorState, ...items: PMNode[]) {
  const at = state.doc.content.size;
  return state.applyTransaction(state.tr.insert(at, n.taskList.create(null, items)));
}

/** 用户那一笔之外，插件追加了几笔。 */
const resultCount = (transactions: readonly Transaction[]) => transactions.length - 1;

describe('taskItem 的持久身份 taskId（G1500）', () => {
  it('新敲进来的待办行在同一批事务里拿到 uuid——不是等保存时临时铸一枚', () => {
    const result = appendItems(freshState(), item('买牛奶'));
    const ids = taskIds(result.state.doc);
    expect(result.transactions.length, '除了用户那一笔，插件必须补上第二笔').toBe(2);
    expect(ids).toHaveLength(1);
    expect(ids[0], '这一行没有拿到 id').toMatch(UUID);
  });

  it('☆☆ 第二次保存批次不再改第一行的 id＝投影对账键真的稳住了', () => {
    const first = appendItems(freshState(), item('买牛奶'));
    const firstId = taskIds(first.state.doc)[0];
    const second = appendItems(first.state, item('回邮件'));
    const ids = taskIds(second.state.doc);

    expect(ids, '第二趟应当只给新行补 id，老行原样不动').toEqual([firstId, expect.any(String)]);
    expect(ids[1]).toMatch(UUID);
    expect(ids[0]).not.toBe(ids[1]);
    expect(
      resultCount(second.transactions),
      '补 id 那一笔不该拆成多笔（多笔＝同一份正文被写回多次，撤销与协作都会抖）',
    ).toBe(1);
  });

  it('已经有 id 的行绝不改写＝对账键一旦发出去就收不回', () => {
    const state = EditorState.create({
      doc: n.doc.create(null, [
        n.taskList.create(null, [item('甲', { taskId: '已有身份' }), item('乙')]),
      ]),
      plugins: [createTaskIdPlugin()],
    });
    const result = state.applyTransaction(state.tr.insertText('！', 3));
    expect(taskIds(result.state.doc), '那行自带的身份被覆盖了').toEqual([
      '已有身份',
      expect.stringMatching(UUID),
    ]);
  });

  it('☆☆ 拆行复制下来的重复 id＝后一行另领一枚（投影按 id 建 Map，撞车就只剩一行）', () => {
    // 在待办行上按 Enter，TipTap 把整份 attrs 复制给新行——这一枚 `taskId` 也在其中。
    // 浏览器现场就是这么翻车的：`task-cancel.spec.ts` 第 3 条里两行共用一枚 id，
    // `new Map(tasks.map(t => [t.taskId, t]))`（`task.ts:100`）让第二行把第一行整个盖掉，
    // 取消那一档再也进不了库。
    const state = EditorState.create({
      doc: n.doc.create(null, [
        n.taskList.create(null, [item('甲', { taskId: '同一枚' }), item('乙', { taskId: '同一枚' })]),
      ]),
      plugins: [createTaskIdPlugin()],
    });
    const result = state.applyTransaction(state.tr.insertText('！', 3));
    const ids = taskIds(result.state.doc);
    expect(ids[0], '第一行是车主，不该被改').toBe('同一枚');
    expect(ids[1], '第二行带着复制来的 id，必须另领一枚').not.toBe(ids[0]);
    expect(ids[1]).toMatch(UUID);
  });

  it('幂等：全是 id 的文档再过一次管线，一笔事务都不追加', () => {
    const withIds = appendItems(freshState(), item('甲'), item('乙'));
    const after = withIds.state.applyTransaction(withIds.state.tr.insertText('续', 3));
    const appended = after.transactions.slice(1);
    expect(appended.length, '没有缺 id 的行时插件不该动正文').toBe(0);
    expect(taskIds(after.state.doc)).toEqual(taskIds(withIds.state.doc));
  });

  it('只补漏，不给别的节点塞属性', () => {
    const state = freshState();
    const result = state.applyTransaction(
      state.tr.insert(state.doc.content.size, n.paragraph.create(null, schema.text('一段普通正文'))),
    );
    expect(result.transactions.length, '普通段落不该触发第二笔').toBe(1);
  });

  it('选区移动（没有 docChanged）不产生任何写入＝不会把"只是看了看"变成一次保存', () => {
    const withIds = appendItems(freshState(), item('甲'));
    const doc = withIds.state.doc;
    expect(doc.content.size).toBeGreaterThan(2);
    const tr = withIds.state.tr;
    tr.setSelection(withIds.state.selection); // docChanged 保持 false
    const appended = withIds.state.applyTransaction(tr).transactions.slice(1);
    expect(appended.length).toBe(0);
  });

  it('补 id 那一笔不进撤销栈：撤一次输入不会把身份撤没', () => {
    const result = appendItems(freshState(), item('甲'));
    const bookkeeping = result.transactions[1];
    expect(bookkeeping.getMeta('addToHistory'), '这笔会留在撤销栈里，撤销会抹掉身份').toBe(false);
  });

  it('只读视图不参与＝旁观者不会各自铸一枚 id 打回正文', () => {
    const plugin = createTaskIdPlugin();
    const spec = plugin.spec as {
      view?: (v: unknown) => { update: (v: { editable: boolean }) => void };
    };
    expect(spec.view, '插件没有 view 钩子＝只读闸门无处生效').toBeTruthy();
    const handle = spec.view!({});
    handle.update({ editable: false });

    const state = freshState(plugin);
    expect(appendItems(state, item('甲')).transactions.length, '只读时不该追加写入').toBe(1);

    handle.update({ editable: true });
    expect(taskIds(appendItems(state, item('甲')).state.doc)[0]).toMatch(UUID);
  });
});

describe('接线（G1500）', () => {
  const src = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'Editor.tsx'),
    'utf8',
  );

  it('插件注册进了编辑器扩展列', () => {
    expect(
      /TaskItemId,/.test(src),
      'extensions 数组里没有 TaskItemId＝每次保存仍在重铸行身份',
    ).toBe(true);
    expect(src, '没有 import 那枚扩展文件').toContain("from './extensions/task-id'");
  });

  it('attr 仍然可解析可渲染＝身份出得了 Yjs、回得来', () => {
    expect(src).toContain("element.getAttribute('data-task-id')");
    expect(src).toContain("{ 'data-task-id': attributes.taskId }");
  });
});
