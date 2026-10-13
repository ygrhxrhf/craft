import { describe, expect, it } from 'vitest';
import { Schema, type Node } from '@tiptap/pm/model';
import { TextSelection, EditorState } from '@tiptap/pm/state';

import { buildBlockMove, topLevelIndexOf, topLevelStart, type MoveTarget } from './block-move';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    heading: { group: 'block', content: 'text*', attrs: { level: { default: 1 } } },
    text: {},
  },
});

const p = (text: string): Node => schema.nodes.paragraph.create(null, schema.text(text));

function doc(...blocks: Node[]): Node {
  return schema.nodes.doc.create(null, blocks);
}

function stateOf(root: Node, pos = 1): EditorState {
  return EditorState.create({ schema, doc: root, selection: TextSelection.create(root, pos) });
}

/** Text of every top-level block, in order — what the move is judged against. */
function blocksOf(root: Node): string[] {
  const out: string[] = [];
  for (let i = 0; i < root.childCount; i += 1) out.push(root.child(i).textContent);
  return out;
}

function move(state: EditorState, target: MoveTarget) {
  const tr = buildBlockMove(state, target);
  if (!tr) return { moved: false, doc: state.doc, caret: -1 };
  const next = state.apply(tr);
  return { moved: true, doc: next.doc, caret: next.selection.from };
}

describe('topLevelIndexOf', () => {
  const root = doc(p('甲'), p('乙'), p('丙'));

  it('maps a position inside a block to that block', () => {
    expect(topLevelIndexOf(root, 1)).toBe(0);
    expect(topLevelIndexOf(root, 4)).toBe(1);
    expect(topLevelIndexOf(root, 7)).toBe(2);
  });

  it('treats the very end of the document as the last block', () => {
    expect(topLevelIndexOf(root, root.content.size)).toBe(2);
  });

  it('reports an empty document as having nothing to move', () => {
    expect(topLevelIndexOf(schema.nodes.doc.create(null, []), 0)).toBe(-1);
  });

  it('opens at the sum of the blocks before it', () => {
    const root = doc(p('甲'), p('乙'), p('丙'));
    expect(topLevelStart(root, 0)).toBe(0);
    expect(topLevelStart(root, 1)).toBe(root.child(0).nodeSize);
    expect(topLevelStart(root, 2)).toBe(root.child(0).nodeSize + root.child(1).nodeSize);
  });
});

describe('moving a block', () => {
  it('swaps with the block above', () => {
    const state = stateOf(doc(p('甲'), p('乙'), p('丙')), 4);
    const result = move(state, 'up');
    expect(result.moved).toBe(true);
    expect(blocksOf(result.doc)).toEqual(['乙', '甲', '丙']);
  });

  it('swaps with the block below', () => {
    const state = stateOf(doc(p('甲'), p('乙'), p('丙')), 1);
    const result = move(state, 'down');
    expect(blocksOf(result.doc)).toEqual(['乙', '甲', '丙']);
  });

  it('moves the block all the way to the top', () => {
    const state = stateOf(doc(p('甲'), p('乙'), p('丙')), 7);
    const result = move(state, 'top');
    expect(blocksOf(result.doc)).toEqual(['丙', '甲', '乙']);
  });

  it('moves the block all the way to the bottom', () => {
    const state = stateOf(doc(p('甲'), p('乙'), p('丙')), 1);
    const result = move(state, 'bottom');
    expect(blocksOf(result.doc)).toEqual(['乙', '丙', '甲']);
  });

  it('keeps the caret inside the block that moved', () => {
    const state = stateOf(doc(p('甲'), p('很长的一行文本')), 4);
    const result = move(state, 'top');
    expect(result.moved).toBe(true);
    const at = state.apply(buildBlockMove(state, 'top')!).doc;
    expect(topLevelIndexOf(at, result.caret)).toBe(0);
    expect(at.child(0).textContent).toBe('很长的一行文本');
  });

  it('refuses to do anything at the edges', () => {
    expect(move(stateOf(doc(p('独')), 1), 'up').moved).toBe(false);
    expect(move(stateOf(doc(p('独')), 1), 'down').moved).toBe(false);
    expect(move(stateOf(doc(p('甲'), p('乙')), 1), 'up').moved).toBe(false);
    expect(move(stateOf(doc(p('甲'), p('乙')), 4), 'down').moved).toBe(false);
  });

  it('touches only the two blocks it has to', () => {
    // The span handed to `replace` must not cover the untouched third block: a collaborative
    // session would otherwise replay that block through Yjs along with the two that changed.
    const state = stateOf(doc(p('甲'), p('乙'), p('丙')), 1);
    const tr = buildBlockMove(state, 'down')!;
    const touched = tr.steps.length;
    expect(touched).toBe(1);
    expect(blocksOf(state.doc)).toEqual(['甲', '乙', '丙']);
    expect(blocksOf(tr.doc)).toEqual(['乙', '甲', '丙']);
  });

  it('preserves a heading while it moves', () => {
    const heading = schema.nodes.heading.create({ level: 3 }, schema.text('标题'));
    const state = stateOf(doc(p('正文'), heading), 1);
    const result = move(state, 'bottom');
    expect(result.moved).toBe(true);
    // 正文 was the block at index 0 and moved to the end, so the heading is now first.
    expect(result.doc.child(0).type.name).toBe('heading');
    expect(result.doc.child(0).attrs.level).toBe(3);
    expect(result.doc.child(0).textContent).toBe('标题');
    expect(result.doc.child(1).type.name).toBe('paragraph');
    expect(result.doc.child(1).textContent).toBe('正文');
  });
});
