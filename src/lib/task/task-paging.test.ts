import { describe, expect, it } from 'vitest';

import {
  advanceCursor,
  appendTaskPage,
  beginLoad,
  cursorFor,
  emptyTaskCursors,
  initialTaskPageState,
  reorderAfter,
  resetTaskPageState,
  settleLoad,
} from './task-paging';

/**
 * G604: three independent cursors (one per query), a three-state load status, and relative-position
 * reordering. The cursors must not move together — that is the whole point of splitting them.
 */
describe('the three independent task cursors (G604)', () => {
  it('advances only the list it was told to', () => {
    const start = emptyTaskCursors();
    const after = advanceCursor(start, 'ongoing', 'tok-1');
    expect(cursorFor(after, 'ongoing')).toBe('tok-1');
    expect(cursorFor(after, 'all')).toBeNull();
    expect(cursorFor(after, 'upcoming')).toBeNull();
  });

  it('keeps each list\u2019s cursor separate across advances', () => {
    let cursors = emptyTaskCursors();
    cursors = advanceCursor(cursors, 'all', 'a1');
    cursors = advanceCursor(cursors, 'upcoming', 'u1');
    expect(cursorFor(cursors, 'all')).toBe('a1');
    expect(cursorFor(cursors, 'upcoming')).toBe('u1');
    expect(cursorFor(cursors, 'ongoing')).toBeNull();
  });
});

describe('the load-status machine (G604)', () => {
  it('starts idle with empty cursors', () => {
    const state = initialTaskPageState();
    expect(state.status).toBe('idle');
    expect(state.pageInfo).toBeNull();
  });

  it('a page with more data goes back to idle; the last page lands on done', () => {
    const loading = beginLoad(initialTaskPageState());
    expect(loading.status).toBe('loading');
    const more = settleLoad(loading, 'all', { nextToken: 't2', hasMore: true, count: 200 });
    expect(more.status).toBe('idle');
    expect(cursorFor(more.cursors, 'all')).toBe('t2');
    expect(more.pageInfo).toEqual({ hasMore: true, count: 200 });
    const last = settleLoad(more, 'all', { nextToken: null, hasMore: false, count: 30 });
    expect(last.status).toBe('done');
    expect(cursorFor(last.cursors, 'all')).toBeNull();
  });

  it('reset clears cursors and pageInfo', () => {
    const loaded = settleLoad(beginLoad(initialTaskPageState()), 'all', { nextToken: 't2', hasMore: true, count: 5 });
    expect(resetTaskPageState()).not.toEqual(loaded);
    expect(resetTaskPageState()).toEqual(initialTaskPageState());
  });
});

describe('appendTaskPage dedupes a page against rows already on screen (G604)', () => {
  it('keeps the current order and drops ids the list already has', () => {
    const current = [{ id: 'a' }, { id: 'b' }];
    const next = [{ id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(appendTaskPage(current, next).map((row) => row.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('appending an empty page changes nothing', () => {
    const current = [{ id: 'a' }];
    expect(appendTaskPage(current, [])).toEqual(current);
  });
});

describe('relative-position reordering (G604)', () => {
  it('inserts after the named task, not at an index', () => {
    expect(reorderAfter(['a', 'b', 'c'], 'c', 'a')).toEqual(['a', 'c', 'b']);
  });

  it('a null anchor means the front', () => {
    expect(reorderAfter(['a', 'b', 'c'], 'c', null)).toEqual(['c', 'a', 'b']);
  });

  it('refuses rather than guessing when the anchor is unknown', () => {
    expect(reorderAfter(['a', 'b'], 'a', 'zzz')).toEqual(['a', 'b']);
    expect(reorderAfter(['a', 'b'], 'zzz', 'a')).toEqual(['a', 'b']);
  });

  it('moving a task after its own successor swaps the pair', () => {
    expect(reorderAfter(['a', 'b', 'c'], 'a', 'b')).toEqual(['b', 'a', 'c']);
  });
});
