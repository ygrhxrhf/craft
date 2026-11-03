import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';

import { buildCardBackground } from './card-config';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'text*', group: 'block', toDOM: () => ['p', 0] },
    cardBlock: {
      content: 'block+',
      group: 'block',
      attrs: { bgColor: { default: '#ffffff' } },
      toDOM: () => ['div', { 'data-type': 'card-block' }, 0],
    },
  },
});

function stateWith(text: string) {
  const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, schema.text(text))]);
  return EditorState.create({ doc });
}

describe('the card background edit (G1584)', () => {
  it('wraps a plain block in a card carrying the chosen colour', () => {
    const state = stateWith('甲');
    const tr = buildCardBackground(state, 0, '#dbeafe');
    expect(tr).not.toBeNull();
    const next = state.apply(tr!);
    expect(next.doc.child(0).type.name).toBe('cardBlock');
    expect(next.doc.child(0).attrs.bgColor).toBe('#dbeafe');
    expect(next.doc.child(0).textContent).toBe('甲');
  });

  it('repaints a card that is already there instead of nesting another one', () => {
    const card = schema.nodes.cardBlock.create({ bgColor: '#ffffff' }, [
      schema.nodes.paragraph.create(null, schema.text('乙')),
    ]);
    const state = EditorState.create({ doc: schema.nodes.doc.create(null, [card]) });
    const tr = buildCardBackground(state, 0, '#fef3c7');
    const next = state.apply(tr!);
    expect(next.doc.childCount).toBe(1);
    expect(next.doc.child(0).type.name).toBe('cardBlock');
    expect(next.doc.child(0).attrs.bgColor).toBe('#fef3c7');
  });

  it('refuses an index outside the document', () => {
    expect(buildCardBackground(stateWith('甲'), 3, '#ffffff')).toBeNull();
  });
});
