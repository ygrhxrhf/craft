import { describe, expect, it } from 'vitest';

import {
  EMPTY_VIEW_FIELDS,
  fieldsForView,
  moveField,
  readViewFields,
  toggleFieldHidden,
} from './view-fields';

const columns = [
  { id: 'a', order: 0, isVisible: true },
  { id: 'b', order: 1, isVisible: true },
  { id: 'c', order: 2, isVisible: true },
  { id: 'd', order: 3, isVisible: false },
];

describe('per-view fields (G81)', () => {
  it('reads both keys from a config object or its JSON text', () => {
    expect(readViewFields({ hiddenProperties: ['a'], customPropertyOrder: ['c', 'b'] })).toEqual({
      hidden: ['a'],
      order: ['c', 'b'],
    });
    expect(readViewFields('{"hiddenProperties":["a"]}').hidden).toEqual(['a']);
    expect(readViewFields(null)).toEqual(EMPTY_VIEW_FIELDS);
    expect(readViewFields('not json')).toEqual(EMPTY_VIEW_FIELDS);
  });

  it('renders the view order first, then the row order, and drops hidden fields', () => {
    const fields = { hidden: ['b'], order: ['c'] };
    expect(fieldsForView(columns, fields).map((column) => column.id)).toEqual(['c', 'a']);
  });

  it('keeps globally invisible columns invisible regardless of the view', () => {
    expect(fieldsForView(columns, EMPTY_VIEW_FIELDS).map((column) => column.id)).toEqual(['a', 'b', 'c']);
  });

  it('toggles one field in and out of the hidden list', () => {
    const hidden = toggleFieldHidden(EMPTY_VIEW_FIELDS, 'a');
    expect(hidden.hidden).toEqual(['a']);
    expect(toggleFieldHidden(hidden, 'a').hidden).toEqual([]);
  });

  it('moves a field inside the visible order and pins the whole order', () => {
    const moved = moveField(EMPTY_VIEW_FIELDS, ['a', 'b', 'c'], 'b', -1);
    expect(moved.order).toEqual(['b', 'a', 'c']);
    expect(moveField(EMPTY_VIEW_FIELDS, ['a', 'b', 'c'], 'a', -1)).toEqual(EMPTY_VIEW_FIELDS);
  });
});
