import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import { cloneWithFreshBlockIds } from './clone-block';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: { blockId: { default: null } },
      toDOM: () => ['p', 0],
    },
    bulletList: { group: 'block', content: 'listItem+', toDOM: () => ['ul', 0] },
    listItem: { content: 'paragraph block*', toDOM: () => ['li', 0] },
    text: { group: 'inline' },
  },
});

describe('duplicating a block (G573)', () => {
  it('gives the copy a new id and keeps the text', () => {
    const original = schema.node('paragraph', { blockId: 'a' }, [schema.text('alpha')]);
    const copy = cloneWithFreshBlockIds(original);
    expect(copy.attrs.blockId).not.toBe('a');
    expect(copy.textContent).toBe('alpha');
  });

  it('renews ids nested inside the copy', () => {
    const original = schema.node('bulletList', null, [
      schema.node('listItem', null, [schema.node('paragraph', { blockId: 'inner' }, [schema.text('item')])]),
    ]);
    const copy = cloneWithFreshBlockIds(original);
    expect(copy.child(0).child(0).attrs.blockId).not.toBe('inner');
    expect(copy.textContent).toBe('item');
  });

  it('leaves a node without an id alone', () => {
    const original = schema.node('paragraph', null, [schema.text('plain')]);
    expect(cloneWithFreshBlockIds(original).attrs.blockId).toBeNull();
  });
});
