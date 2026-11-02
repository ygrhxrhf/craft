import { describe, expect, it } from 'vitest';
import {
  cumulativeOffsets,
  flattenGroups,
  groupAtFlatIndex,
  groupResults,
  type GroupSpec,
} from './result-groups';

const SPECS: GroupSpec[] = [
  { key: 'docs', label: '文档' },
  { key: 'blocks', label: '块内容' },
  { key: 'rows', label: '行' },
];

describe('groupResults (G353: multi-membership)', () => {
  it('a single-facet item lands in exactly one group', () => {
    const groups = groupResults([{ facets: ['docs'] }], SPECS);
    expect(groups.map((g) => g.members)).toEqual([[0], [], []]);
  });

  it('an item with two facets appears in **both** groups — the official push-and-no-break', () => {
    const groups = groupResults([{ facets: ['docs', 'blocks'] }], SPECS);
    expect(groups[0].members).toEqual([0]);
    expect(groups[1].members).toEqual([0]);
    expect(groups[2].members).toEqual([]);
  });

  it('preserves the original order inside each group', () => {
    const items = [{ facets: ['docs'] }, { facets: ['blocks'] }, { facets: ['docs'] }];
    const groups = groupResults(items, SPECS);
    expect(groups[0].members).toEqual([0, 2]);
    expect(groups[1].members).toEqual([1]);
  });

  it('an item with no facet is in no group', () => {
    const groups = groupResults([{ facets: [] }], SPECS);
    expect(groups.every((g) => g.members.length === 0)).toBe(true);
  });
});

describe('cumulativeOffsets (G353: cross-group index)', () => {
  it('is the running sum of the group sizes', () => {
    const groups = groupResults(
      [{ facets: ['docs'] }, { facets: ['docs', 'blocks'] }, { facets: ['rows'] }],
      SPECS,
    );
    // docs=2, blocks=1, rows=1 ⇒ offsets [0, 2, 3]
    expect(cumulativeOffsets(groups)).toEqual([0, 2, 3]);
  });

  it('the flattened order matches the offsets', () => {
    const groups = groupResults(
      [{ facets: ['docs'] }, { facets: ['docs', 'blocks'] }, { facets: ['rows'] }],
      SPECS,
    );
    expect(flattenGroups(groups)).toEqual([
      { groupKey: 'docs', itemIndex: 0 },
      { groupKey: 'docs', itemIndex: 1 },
      { groupKey: 'blocks', itemIndex: 1 },
      { groupKey: 'rows', itemIndex: 2 },
    ]);
  });
});

describe('groupAtFlatIndex (G353: arrow-key navigation)', () => {
  const groups = groupResults(
    [{ facets: ['docs'] }, { facets: ['docs', 'blocks'] }, { facets: ['rows'] }],
    SPECS,
  );

  it('maps a flat index back to its group via the offsets', () => {
    expect(groupAtFlatIndex(groups, 0)?.key).toBe('docs');
    expect(groupAtFlatIndex(groups, 1)?.key).toBe('docs');
    expect(groupAtFlatIndex(groups, 2)?.key).toBe('blocks');
    expect(groupAtFlatIndex(groups, 3)?.key).toBe('rows');
  });

  it('an out-of-range index still resolves to the last group (never null for a non-empty list)', () => {
    expect(groupAtFlatIndex(groups, 99)?.key).toBe('rows');
  });
});
