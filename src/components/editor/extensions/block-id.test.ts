import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { stampMissingBlockIds } from './block-id';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'text*',
      attrs: { blockId: { default: null } },
    },
    text: {},
  },
  marks: {},
});

function stateWith(children: unknown[]): EditorState {
  return EditorState.create({
    schema,
    doc: schema.nodeFromJSON({ type: 'doc', content: children }),
  });
}

describe('stampMissingBlockIds (G32)', () => {
  it('stamps every anchorable block and keeps an existing id', () => {
    const state = stateWith([
      { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
      {
        type: 'paragraph',
        attrs: { blockId: 'keep-me' },
        content: [{ type: 'text', text: 'B' }],
      },
    ]);

    const tr = stampMissingBlockIds(state);
    expect(tr).not.toBeNull();
    const next = state.apply(tr!);
    expect(next.doc.child(0).attrs.blockId).toMatch(UUID);
    expect(next.doc.child(1).attrs.blockId).toBe('keep-me');
  });

  it('is a no-op once every block has an id', () => {
    const state = stateWith([
      { type: 'paragraph', attrs: { blockId: 'a' }, content: [{ type: 'text', text: 'A' }] },
    ]);
    expect(stampMissingBlockIds(state)).toBeNull();
  });
});
