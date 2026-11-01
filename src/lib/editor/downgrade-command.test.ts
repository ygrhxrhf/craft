import { describe, expect, it } from 'vitest';
import { Schema, type Node } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';

import { buildDowngradeFlatten } from './downgrade-command';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', attrs: { indent: { default: 0 } } },
    text: {},
  },
});

const p = (text: string, indent = 0): Node => schema.nodes.paragraph.create({ indent }, schema.text(text));
const docOf = (...blocks: Node[]): Node => schema.nodes.doc.create(null, blocks);

function indentsOf(doc: Node): number[] {
  const out: number[] = [];
  for (let i = 0; i < doc.childCount; i += 1) out.push(doc.child(i).attrs.indent as number);
  return out;
}

function textsOf(doc: Node): string[] {
  const out: string[] = [];
  for (let i = 0; i < doc.childCount; i += 1) out.push(doc.child(i).textContent);
  return out;
}

describe('buildDowngradeFlatten (G278)', () => {
  it('lifts the indented children of the downgraded block up to its level', () => {
    const doc = docOf(p('甲'), p('乙'), p('乙a', 1), p('乙b', 2), p('丙'));
    const state = EditorState.create({ schema, doc });
    const tr = buildDowngradeFlatten(state, 1);
    expect(tr).not.toBeNull();
    const next = state.apply(tr!);
    // Order is unchanged; the two children come up to 乙's level.
    expect(textsOf(next.doc)).toEqual(['甲', '乙', '乙a', '乙b', '丙']);
    expect(indentsOf(next.doc)).toEqual([0, 0, 0, 0, 0]);
  });

  it('leaves a sibling after the run alone', () => {
    const doc = docOf(p('甲'), p('乙'), p('乙a', 1), p('丙'));
    const state = EditorState.create({ schema, doc });
    const next = state.apply(buildDowngradeFlatten(state, 1)!);
    // 丙 is the next sibling, not deeper than 乙 ⇒ it is outside the run and keeps its indent (0).
    expect(indentsOf(next.doc)).toEqual([0, 0, 0, 0]);
  });

  it('does not reach past a sibling that closes the run', () => {
    // 乙's run is 乙(0) + 乙a(1); 丙(0) closes it, and 丁(1) belongs to 丙, not 乙.
    const doc = docOf(p('乙'), p('乙a', 1), p('丙'), p('丁', 1));
    const state = EditorState.create({ schema, doc });
    const next = state.apply(buildDowngradeFlatten(state, 0)!);
    expect(indentsOf(next.doc)).toEqual([0, 0, 0, 1]);
  });

  it('returns null when there is nothing to lift', () => {
    const doc = docOf(p('甲'), p('乙'));
    const state = EditorState.create({ schema, doc });
    expect(buildDowngradeFlatten(state, 0)).toBeNull();
    expect(buildDowngradeFlatten(state, 9)).toBeNull();
  });

  it('does not touch the style — only indent attributes', () => {
    const doc = docOf(p('甲'), p('乙'), p('乙a', 1));
    const state = EditorState.create({ schema, doc });
    const next = state.apply(buildDowngradeFlatten(state, 1)!);
    expect(next.doc.child(1).type.name).toBe('paragraph');
  });
});
