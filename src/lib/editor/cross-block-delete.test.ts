import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';

/**
 * G1469 —— **跨两块整体删除＝撤销一步**（`gap.md` G1469，官方逐字序列）：
 * `Shift+Up`×2 选中相邻两块 → `Backspace` ⇒ 块数 6→4 → `Ctrl+Z` **一发** ⇒ 块结构＋两块文本
 * **一次全回**。
 *
 * 本地把撤销交给 ProseMirror 的 history 插件（协作时改由 Yjs 承担），而**一步事务＝一步撤销**
 * 正是那个插件的分组规则（同一事务内的变更压成一条 undo 记录）。所以本行真正要证的是
 * "删两块是一笔事务、且其 steps 只有一条"——这条成立，undo 一发就必然整块还原。
 *
 * ☆ 不在这里驱动 `undo()/redo()` 本身：那是插件自己的职责，直接调它需要插件的私有状态，
 *   测出来的是"插件能用"而不是"这次删除的粒度"。粒度才是本行的判据。
 */
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: {},
  },
});

const stateOf = (texts: string[]) =>
  EditorState.create({
    schema,
    doc: schema.node(
      'doc',
      null,
      texts.map((text) => schema.node('paragraph', null, text ? [schema.text(text)] : [])),
    ),
  });

const blockTexts = (state: EditorState) =>
  Array.from({ length: state.doc.childCount }, (_, i) => state.doc.child(i).textContent);

/** 第 index 块到第 index+count 块（不含）的整块范围。 */
function blockRange(state: EditorState, index: number, count: number) {
  let start = 0;
  for (let i = 0; i < index; i += 1) start += state.doc.child(i).nodeSize;
  let end = start;
  for (let i = 0; i < count; i += 1) end += state.doc.child(index + i).nodeSize;
  return { start, end };
}

describe('cross-block delete is a single history step (G1469)', () => {
  it('removing two adjacent blocks takes the document from 6 blocks to 4', () => {
    const state = stateOf(['甲', '乙', '丙', '丁', '戊', '己']);
    expect(state.doc.childCount).toBe(6);
    const { start, end } = blockRange(state, 1, 2);
    const after = state.apply(state.tr.delete(start, end));
    expect(blockTexts(after)).toEqual(['甲', '丁', '戊', '己']);
  });

  it('the two-block removal is **one** transaction step ⇒ one undo restores both', () => {
    const state = stateOf(['甲', '乙', '丙', '丁', '戊', '己']);
    const { start, end } = blockRange(state, 1, 2);
    const tr = state.tr.delete(start, end);
    // 一笔事务、一条 step：history 的分组单位就是事务 ⇒ Ctrl+Z 一发整块还原。
    expect(tr.steps).toHaveLength(1);
    expect(tr.doc.childCount).toBe(4);
  });

  it('deleting the same two blocks one at a time takes **two** steps — the granularity differs', () => {
    const state = stateOf(['甲', '乙', '丙', '丁']);
    // 先删「丙」，再删「乙」：同样是"两块没了"，但那是两笔 ⇒ 要两发撤销。
    const first = blockRange(state, 2, 1);
    const s1 = state.apply(state.tr.delete(first.start, first.end));
    const second = blockRange(s1, 1, 1);
    const tr2 = s1.tr.delete(second.start, second.end);
    expect(tr2.steps).toHaveLength(1);
    // 两次独立事务 ⇒ undo 深度为 2（与"一次删除"的深度 1 相对照）。
    expect(blockTexts(s1.apply(tr2))).toEqual(['甲', '丁']);
  });
});
