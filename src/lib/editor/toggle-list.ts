import type { EditorState, Transaction } from '@tiptap/pm/state';

/**
 * G517 —— 官方的 `listStyle` 是**一个字段的五档**（none／bullet／numbered／todo／toggle），
 * 所以"把这段正文变成折叠列表"是**就地换样式**、正文留在原处。本地 `toggleBlock` 是独立
 * 节点类型，默认命令 `setToggleBlock` 是"插入一个新的空折叠块"——在已有正文上按折叠列表
 * 会多出一块空的，而不是把这段变过去。
 *
 * 这一支把两个方向都写成事务：
 *   - 顶层段落 → 用同一份正文包成 `toggleBlock`（`replaceWith`，不走 `toggleNode`——
 *     它按"内容模型相同"换节点，段落装不进 block+ 的折叠块）；
 *   - 折叠块 → 拆回它包含的块（与卡片「转换为普通页面」同形）。
 * 其余位置返回 null，调用方保留"插入新块"的原语义。
 */

interface ToggleChain {
  focus(): {
    setToggleBlock(): { run(): unknown };
  };
}

export interface ToggleListHost {
  state: EditorState;
  dispatch: (tr: Transaction) => void;
  chain?: () => ToggleChain;
}

export interface ToggleListPlan {
  kind: 'convert' | 'unwrap' | 'insert';
  tr?: Transaction;
}

export function planToggleList(state: EditorState): ToggleListPlan | null {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'toggleBlock') {
      const node = $from.node(depth);
      if (node.childCount === 0) return null;
      const start = $from.before(depth);
      return { kind: 'unwrap', tr: state.tr.replaceWith(start, start + node.nodeSize, node.content) };
    }
  }

  if ($from.depth === 1 && $from.parent.type.name === 'paragraph') {
    const toggleType = state.schema.nodes.toggleBlock;
    if (!toggleType) return null;
    const node = $from.parent;
    const start = $from.before(1);
    return {
      kind: 'convert',
      tr: state.tr.replaceWith(start, start + node.nodeSize, toggleType.create({ open: false }, node)),
    };
  }

  return { kind: 'insert' };
}

export function applyToggleList(host: ToggleListHost): boolean {
  const plan = planToggleList(host.state);
  if (!plan) return false;
  if (plan.tr) {
    host.dispatch(plan.tr.scrollIntoView());
    return true;
  }
  if (plan.kind === 'insert' && host.chain) {
    return Boolean(host.chain().focus().setToggleBlock().run());
  }
  return false;
}