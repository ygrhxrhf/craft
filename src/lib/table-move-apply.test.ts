import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';

import { moveTableAxis } from './table-utils';

/**
 * Moving a row rebuilds the table with the rows swapped, and a merged cell stops it.
 */
const schema = new Schema({
  nodes: {
    doc: { content: 'table' },
    text: { group: 'inline' },
    paragraph: { content: 'text*', group: 'block', toDOM: () => ['p', 0] },
    table: { content: 'tableRow+', group: 'block', toDOM: () => ['table', ['tbody', 0]] },
    tableRow: { content: '(tableCell | tableHeader)+', toDOM: () => ['tr', 0] },
    tableCell: {
      content: 'paragraph',
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } },
      toDOM: () => ['td', 0],
    },
    tableHeader: {
      content: 'paragraph',
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } },
      toDOM: () => ['th', 0],
    },
  },
});

function table(rows: string[][]) {
  return schema.nodes.table.create(
    null,
    rows.map((row) =>
      schema.nodes.tableRow.create(
        null,
        row.map((text) =>
          schema.nodes.tableCell.create(null, schema.nodes.paragraph.create(null, schema.text(text))),
        ),
      ),
    ),
  );
}

function texts(state: EditorState): string[][] {
  const node = state.doc.firstChild!;
  return node.content.content.map((row) => row.content.content.map((cell) => cell.textContent));
}

describe('moving a row', () => {
  it('swaps the caret row with the one above it', () => {
    const node = table([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    const doc = schema.nodes.doc.create(null, node);
    let caret = 0;
    doc.descendants((child, pos) => {
      if (caret === 0 && child.isText && child.text === 'c') caret = pos + 1;
    });
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, caret) });
    let next: EditorState | null = null;
    const editor = {
      state,
      view: { dispatch: (tr: { doc: EditorState['doc'] }) => (next = state.apply(tr as never)) },
    };
    expect(moveTableAxis(editor as never, 'row', -1)).toBe(true);
    expect(texts(next!)).toEqual([
      ['c', 'd'],
      ['a', 'b'],
    ]);
  });

  it('does not move a table that contains a merged cell', () => {
    const node = schema.nodes.table.create(null, [
      schema.nodes.tableRow.create(null, [
        schema.nodes.tableCell.create(
          { colspan: 2 },
          schema.nodes.paragraph.create(null, schema.text('wide')),
        ),
      ]),
    ]);
    const state = EditorState.create({ doc: schema.nodes.doc.create(null, node) });
    const editor = { state, view: { dispatch: () => {} } };
    expect(moveTableAxis(editor as never, 'row', 1)).toBe(false);
  });
});
