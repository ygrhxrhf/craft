import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Node as ProseNode, Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';

import { applyGroup, applyGroupIndices, applyUngroup, canGroup, canUngroup } from './block-group';

/** 本地卡片容器（`cardBlock`）的最小复刻，用来在不启动编辑器的情况下证明组合规则。 */
const cardSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    cardBlock: { group: 'block', content: 'block+' },
    text: {},
  },
  marks: {},
});

const p = (text: string) => cardSchema.nodes.paragraph.create(null, cardSchema.text(text));
const c = (...children: ProseNode[]) => cardSchema.nodes.cardBlock.create(null, children);
const docOf = (...children: ProseNode[]) => cardSchema.nodes.doc.create(null, children);

function stateOf(doc: ProseNode, from: number, to = from) {
  return EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });
}

describe('组合 (G197)', () => {
  it('wraps the blocks the selection touches into one card', () => {
    const doc = docOf(p('一'), p('二'), p('三'));
    const state = stateOf(doc, 2, doc.child(0).nodeSize + doc.child(1).nodeSize - 1);
    expect(canGroup(state)).toBe(true);

    const dispatched: ProseNode[] = [];
    expect(
      applyGroup(state, (tr) => {
        dispatched.push(tr.doc);
      }),
    ).toBe(true);
    expect(dispatched).toHaveLength(1);

    const result = dispatched[0]!;
    expect(result.childCount).toBe(2);
    expect(result.child(0).type.name).toBe('cardBlock');
    expect(result.child(0).childCount).toBe(2);
    expect(result.child(1).textContent).toBe('三');
  });

  it('refuses a single block and refuses nesting cards', () => {
    const doc = docOf(p('一'), p('二'));
    expect(canGroup(stateOf(doc, 2))).toBe(false);
    const inside = stateOf(docOf(c(p('甲'), p('乙'))), 3);
    expect(canGroup(inside)).toBe(false);
    expect(canUngroup(inside)).toBe(true);
  });

  it('answers the probe without a dispatcher', () => {
    const doc = docOf(p('一'), p('二'));
    const state = stateOf(doc, 2, doc.child(0).nodeSize + doc.child(1).nodeSize - 1);
    expect(applyGroup(state)).toBe(true);
  });
});

describe('取消组合 (G197)', () => {
  it('lifts the card children back to the top level', () => {
    const doc = docOf(c(p('甲'), p('乙')), p('丙'));
    const dispatched: ProseNode[] = [];

    expect(
      applyUngroup(stateOf(doc, 3), (tr) => {
        dispatched.push(tr.doc);
      }),
    ).toBe(true);
    expect(dispatched).toHaveLength(1);

    const result = dispatched[0]!;
    expect(result.childCount).toBe(3);
    expect(result.child(0).type.name).toBe('paragraph');
    expect(result.child(2).textContent).toBe('丙');
  });

  it('does nothing outside a card', () => {
    const state = stateOf(docOf(p('一'), p('二')), 2);
    expect(canUngroup(state)).toBe(false);
    expect(applyUngroup(state)).toBe(false);
  });
});

describe('面板接线', () => {
  const panel = readFileSync(join(process.cwd(), 'src', 'components', 'editor', 'tabs', 'InfoTab.tsx'), 'utf8');

  it('hangs both entries on the 动作 sub-tab', () => {
    expect(panel).toContain('groupSelection(editor)');
    expect(panel).toContain('ungroupSelection(editor)');
    expect(panel).toContain('canGroup(editor.state)');
    expect(panel).toContain('canUngroup(editor.state)');
  });
});

describe('块选择态的成组（G1588）', () => {
  it('wraps an explicit index list into one card', () => {
    const doc = docOf(p('一'), p('二'), p('三'));
    const state = stateOf(doc, 1);
    const dispatched: ProseNode[] = [];
    expect(
      applyGroupIndices(state, (tr) => {
        dispatched.push(tr.doc);
      }, [0, 1]),
    ).toBe(true);
    const result = dispatched[0]!;
    expect(result.childCount).toBe(2);
    expect(result.child(0).type.name).toBe('cardBlock');
    expect(result.child(0).childCount).toBe(2);
    expect(result.child(1).textContent).toBe('三');
  });

  it('refuses a single index and an out-of-range one', () => {
    const doc = docOf(p('一'), p('二'));
    const state = stateOf(doc, 1);
    expect(applyGroupIndices(state, undefined, [0])).toBe(false);
    expect(applyGroupIndices(state, undefined, [0, 9])).toBe(false);
  });
});
