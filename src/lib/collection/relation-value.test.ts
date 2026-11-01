import { describe, expect, it } from 'vitest';

import {
  buildRelationValue,
  parseRelationValue,
  relationItems,
  relationTargetId,
} from './relation-value';

// G470: the cell is `{type:"relation", objectListId, items}` and the target lives in config.
describe('the relation cell', () => {
  it('reads the target from the official key, then the legacy one', () => {
    expect(relationTargetId({ objectListId: 'col-a' })).toBe('col-a');
    expect(relationTargetId({ collectionId: 'col-b' })).toBe('col-b');
    expect(relationTargetId({ objectListId: 'col-a', collectionId: 'col-b' })).toBe('col-a');
    expect(relationTargetId({})).toBeNull();
    expect(relationTargetId(null)).toBeNull();
  });

  it('parses the official JSON config string', () => {
    expect(relationTargetId('{"objectListId":"col-c"}')).toBe('col-c');
    expect(relationTargetId('nonsense')).toBeNull();
  });

  it('reads item ids from either shape', () => {
    expect(relationItems({ type: 'relation', objectListId: 'c', items: ['i1', 'i2'] })).toEqual(['i1', 'i2']);
    expect(relationItems(['i1'])).toEqual(['i1']);
    expect(relationItems(null)).toEqual([]);
    expect(relationItems({ items: [1, 'i2'] })).toEqual(['i2']);
  });

  it('writes the official shape and clears to null', () => {
    expect(buildRelationValue('col-a', ['i1'])).toEqual({
      type: 'relation',
      objectListId: 'col-a',
      items: ['i1'],
    });
    expect(buildRelationValue('col-a', [])).toBeNull();
  });

  it('normalizes a legacy value into the official shape', () => {
    expect(parseRelationValue(['i1'], 'col-a')).toEqual({
      type: 'relation',
      objectListId: 'col-a',
      items: ['i1'],
    });
    expect(parseRelationValue([], 'col-a')).toBeNull();
  });
});
