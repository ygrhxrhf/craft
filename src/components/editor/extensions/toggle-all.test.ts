import { describe, expect, it } from 'vitest';
import { Schema, type Node } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { TOGGLE_NODE, setOpenOnAllToggles } from './toggle-all';

// A real ProseMirror schema, not a hand-rolled tree: positions are what the
// traversal gets wrong, and only a real doc computes them.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: {},
    [TOGGLE_NODE]: {
      group: 'block',
      content: 'block+',
      attrs: { open: { default: false } },
    },
  },
  marks: {},
});

function para(label: string): Node {
  return schema.nodes.paragraph.create(null, schema.text(label));
}

function toggle(open: boolean, children: Node[]): Node {
  return schema.nodes[TOGGLE_NODE].create({ open }, children);
}

function stateOf(children: Node[]): EditorState {
  return EditorState.create({ schema, doc: schema.nodes.doc.create(null, children) });
}

/** Every toggle's `open`, in document order — read back through explicit paths
 *  by the nesting cases so they never borrow the walker under test. */
function openFlags(state: EditorState): boolean[] {
  const flags: boolean[] = [];
  state.doc.descendants((node) => {
    if (node.type.name === TOGGLE_NODE) flags.push(node.attrs.open as boolean);
    return true;
  });
  return flags;
}

function apply(state: EditorState, open: boolean) {
  const tr = state.tr;
  const changed = setOpenOnAllToggles(state, tr, open);
  return { changed, next: state.apply(tr), tr };
}

describe('setOpenOnAllToggles', () => {
  it('opens every collapsed block and reports how many it moved', () => {
    const state = stateOf([toggle(false, [para('甲')]), toggle(false, [para('乙')])]);

    const { changed, next, tr } = apply(state, true);

    expect(changed).toBe(2);
    expect(openFlags(next)).toEqual([true, true]);
    // Both moves ride the caller's single transaction. If this ever reads 0 the
    // helper started building its own, and "one command" would stop meaning
    // "one undo step" for a non-collaborative document.
    expect(tr.steps.length).toBe(2);
  });

  it('reaches a toggle nested inside a parent that is still collapsed', () => {
    const inner = toggle(false, [para('内')]);
    const outer = toggle(false, [para('外'), inner]);
    const state = stateOf([outer]);

    const { changed, next } = apply(state, true);

    expect(changed).toBe(2);
    // Read by path, not by the traversal under test.
    expect(next.doc.child(0).attrs.open).toBe(true);
    expect(next.doc.child(0).child(1).attrs.open).toBe(true);
  });

  it('collapses an open block sitting inside another open block', () => {
    const state = stateOf([
      toggle(true, [para('外'), toggle(true, [para('内')])]),
      toggle(true, [para('丙')]),
    ]);

    const { changed, next } = apply(state, false);

    expect(changed).toBe(3);
    expect(next.doc.child(0).attrs.open).toBe(false);
    expect(next.doc.child(0).child(1).attrs.open).toBe(false);
    expect(next.doc.child(1).attrs.open).toBe(false);
  });

  it('changes nothing when every block already sits at the target', () => {
    const state = stateOf([toggle(true, [para('甲')]), toggle(true, [para('乙')])]);

    const { changed, tr } = apply(state, true);

    expect(changed).toBe(0);
    expect(tr.docChanged).toBe(false);
  });

  it('leaves paragraphs and other node types untouched', () => {
    const state = stateOf([para('普通'), toggle(false, [para('甲')]), para('尾部')]);

    const { changed, next } = apply(state, true);

    expect(changed).toBe(1);
    expect(next.doc.child(0).textContent).toBe('普通');
    expect(next.doc.child(0).type.name).toBe('paragraph');
    expect(next.doc.child(2).type.name).toBe('paragraph');
    expect(next.doc.child(1).attrs.open).toBe(true);
  });

  it('keeps the blocks themselves in place — only the attribute moves', () => {
    const state = stateOf([toggle(false, [para('甲')]), para('尾')]);

    const { next } = apply(state, true);

    expect(next.doc.childCount).toBe(2);
    expect(next.doc.child(0).childCount).toBe(1);
    expect(next.doc.child(0).textContent).toBe('甲');
    expect(next.doc.child(1).textContent).toBe('尾');
  });
});
