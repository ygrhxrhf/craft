import { Extension } from '@tiptap/react';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';

export const TASK_ID_PLUGIN_KEY = new PluginKey('craftTaskId');

/**
 * `gap.md` G1500 —— 给文档里每一枚 `taskItem` 钉上一枚**持久身份** `taskId`。
 *
 * 为什么这条必须存在：正文里那些待办块会被投影成 `tasks` 表的行，而投影的对账键是
 * `tasks.blockId === 正文 attrs.taskId`（`src/actions/task/task.ts:100-137`）。此前那枚
 * attr 只在 schema 上声明过（`Editor.tsx` 的 `TaskItem.extend`：`data-task-id` 可解析可渲染、
 * `default: null`），**全仓没有任何一处把它写进文档**——唯一的赋值发生在
 * `collectTaskItems()` 里对一份临时 JSON 副本的 `node.attrs = {...}` 上，事务一结束就散了。
 * 于是每次保存都拿到一枚新铸的 uuid ⇒ 对账永不命中 ⇒ 走"新建行＋把上一行打墓碑"那一支。
 * 现跑取证（e2e 账号）：26 篇有 `documentId` 的文档共 63 行、其中 20 行是墓碑；
 * 最脏的两篇屏上只有 2 条不同的待办，库里却是 6 行、6 个互不相同的 `blockId`。
 * 用户看得见的代价不是行数，是**任务页上改的东西活不过下一次正文保存**：
 * `dueDate`／`completedAt`／`recurrence`／`order` 都不在投影列里，行一换新它们就归零。
 *
 * 所以真源必须是文档本身（红线一：正文只走 Yjs）——这里用 ProseMirror 的
 * `appendTransaction` 在同一批事务里补 id，写进去的就是 Yjs 里的那份 attr，
 * 而不是任何第二处账。三条例外要守住：只在 `docChanged` 时走（选区移动不触发写）、
 * 只读视图不参与（旁观者不该各自铸 id 打回去）、`addToHistory:false`
 * （撤销一次输入不应把 id 撤没，那会立刻把这条线变回"下一次保存重新对不上"）。
 */
export function createTaskIdPlugin(): Plugin {
  let editable = true;
  return new Plugin({
    key: TASK_ID_PLUGIN_KEY,
    view: () => ({
      update: (view) => {
        editable = view.editable;
      },
      destroy: () => {
        editable = true;
      },
    }),
    appendTransaction(transactions, _oldState, state) {
      if (!editable) return null;
      if (!transactions.some((tr) => tr.docChanged)) return null;
      const type = state.schema.nodes.taskItem;
      if (!type) return null;

      // 只在"缺 id"或"id 与本文档里前面某行撞了"时补。撞车不是理论：在待办行上按 Enter
      // 拆行，TipTap 会把整份 attrs 复制给新行⇒新行带着上一行那枚 id，而投影那边是
      // `new Map(taskId → task)`（`task.ts:100`），后一行会把前一行整个盖掉——两行只落一行、
      // 而且前一行后来居上的状态再也进不了库（本轮就是靠这条抓出现场的）。
      const seen = new Set<string>();
      const bad: { pos: number; attrs: Record<string, unknown> }[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type !== type) return;
        const existing = node.attrs.taskId;
        if (typeof existing === 'string' && existing && !seen.has(existing)) {
          seen.add(existing);
          return;
        }
        bad.push({ pos, attrs: node.attrs as Record<string, unknown> });
      });
      if (bad.length === 0) return null;

      // 只改 attrs ⇒ 节点 size 不变 ⇒ 上面按原文档收集的 pos 在整笔事务里一直有效。
      let tr: Transaction | null = null;
      for (const { pos, attrs } of bad) {
        let fresh = crypto.randomUUID();
        while (seen.has(fresh)) fresh = crypto.randomUUID();
        seen.add(fresh);
        tr = (tr ?? state.tr).setNodeMarkup(pos, undefined, {
          ...attrs,
          taskId: fresh,
        });
      }
      return tr!.setMeta('addToHistory', false);
    },
  });
}

export const TaskItemId = Extension.create({
  name: 'craftTaskId',

  addProseMirrorPlugins() {
    return [createTaskIdPlugin()];
  },
});
