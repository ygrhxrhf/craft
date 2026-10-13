import { describe, expect, it } from 'vitest';

import { BACKLINK_SORTS, sortBacklinks, type SortableBacklink } from './backlink-sort';

/**
 * Backlinks panel sorting (G147): alphabetical, by creation date, and by link count.
 */
const link = (title: string, createdAt = '2026-01-01', linkCount?: number): SortableBacklink => ({
  sourceDocumentId: title,
  sourceTitle: title,
  sourceIcon: null,
  createdAt,
  linkCount,
});

describe('the three sorts', () => {
  it('lists exactly three', () => {
    expect([...BACKLINK_SORTS]).toEqual(['alphabetical', 'created', 'linkCount']);
  });

  it('sorts alphabetically by title', () => {
    const items = [link('banana', '2026-01-01'), link('apple', '2026-02-01'), link('Cherry', '2026-03-01')];
    expect(sortBacklinks(items, 'alphabetical').map((i) => i.sourceTitle)).toEqual(['apple', 'banana', 'Cherry']);
  });

  it('sorts by creation date, newest first', () => {
    const items = [link('old', '2026-01-01'), link('new', '2026-03-01'), link('mid', '2026-02-01')];
    expect(sortBacklinks(items, 'created').map((i) => i.sourceTitle)).toEqual(['new', 'mid', 'old']);
  });

  it('sorts by link count, highest first', () => {
    const items = [link('few', '2026-01-01', 1), link('many', '2026-01-01', 9), link('some', '2026-01-01', 4)];
    expect(sortBacklinks(items, 'linkCount').map((i) => i.sourceTitle)).toEqual(['many', 'some', 'few']);
  });

  it('keeps uncounted entries in title order after the counted ones', () => {
    const items = [link('zebra'), link('counted', '2026-01-01', 5), link('apple')];
    expect(sortBacklinks(items, 'linkCount').map((i) => i.sourceTitle)).toEqual(['counted', 'apple', 'zebra']);
  });

  it('does not mutate the caller array', () => {
    const items = [link('b', '2026-01-01'), link('a', '2026-01-02')];
    const copy = [...items];
    sortBacklinks(items, 'alphabetical');
    expect(items).toEqual(copy);
  });
});
