import { describe, expect, it } from 'vitest';

import { insertIndexFor, shouldSuppressIndicator, sideFor } from './task-drop';
import { deriveSubtasks, parentOf, subtaskMap, type TaskBlockRow } from './subtasks';
import {
  canPin,
  PIN_COPY,
  PIN_LIMIT,
  PIN_LIMIT_COPY,
  pinAfter,
  pinnedInOrder,
  showsEmptyState,
  unpinPinned,
} from './pinned-docs';

/**
 * G270: half-region drop targeting, with three indicator-suppression cases.
 */
describe('half-region drop targeting (G270)', () => {
  it('left half inserts before, right half after', () => {
    expect(insertIndexFor('left', 3)).toBe(3);
    expect(insertIndexFor('right', 3)).toBe(4);
  });

  it('splits a cell at its midline, the midline itself going right', () => {
    const rect = { left: 100, right: 200 };
    expect(sideFor(120, rect)).toBe('left');
    expect(sideFor(180, rect)).toBe('right');
    expect(sideFor(150, rect)).toBe('left'); // the midline is inclusive on the left side
  });

  it('suppresses the indicator when hovering the dragged item itself', () => {
    expect(
      shouldSuppressIndicator({ draggingId: 'a', targetId: 'a', draggedGroup: ['a'], targetNeighbors: ['b', 'c'] }),
    ).toBe(true);
  });

  it('suppresses when the target sits inside the dragged group', () => {
    expect(
      shouldSuppressIndicator({ draggingId: 'a', targetId: 'g1', draggedGroup: ['a', 'g1'], targetNeighbors: [] }),
    ).toBe(true);
  });

  it('suppresses when a neighbor sits inside the dragged group', () => {
    expect(
      shouldSuppressIndicator({ draggingId: 'a', targetId: 'x', draggedGroup: ['a'], targetNeighbors: ['a', 'y'] }),
    ).toBe(true);
  });

  it('shows the indicator for a clean external target', () => {
    expect(
      shouldSuppressIndicator({ draggingId: 'a', targetId: 'x', draggedGroup: ['a'], targetNeighbors: ['y', 'z'] }),
    ).toBe(false);
  });
});

/**
 * G408: subtasks are derived from block order, not stored as a parent pointer.
 */
describe('derived subtasks (G408)', () => {
  const rows: TaskBlockRow[] = [
    { blockId: 'r1', documentId: 'd', indent: 0 },
    { blockId: 's1', documentId: 'd', indent: 1 },
    { blockId: 's2', documentId: 'd', indent: 2 },
    { blockId: 'r2', documentId: 'd', indent: 0 },
  ];

  it('groups a root with its deeper following siblings', () => {
    expect(deriveSubtasks(rows)).toEqual([{ rootTaskBlockId: 'r1', subTaskBlocks: ['s1', 's2'] }]);
  });

  it('builds the Map the client consumes', () => {
    const map = subtaskMap(deriveSubtasks(rows));
    expect(map.get('r1')).toEqual(['s1', 's2']);
    expect(map.get('r2')).toBeUndefined();
  });

  it('finds the parent of a subtask', () => {
    const groups = deriveSubtasks(rows);
    expect(parentOf(groups, 's2')).toBe('r1');
    expect(parentOf(groups, 'r2')).toBeNull();
  });
});

/**
 * G263: the pinned-docs area, filled by drag and toggled by pin/unpin.
 */
describe('the pinned documents area (G263)', () => {
  it('carries the harvested labels', () => {
    expect(PIN_COPY.pin.label).toBe('固定文档');
    expect(PIN_COPY.unpin.label).toBe('取消固定文档');
    expect(PIN_COPY.emptyPage.label).toBe('拖放文档即可固定并查看更多详细信息');
  });

  it('orders the pinned docs by their order field', () => {
    const pinned = [
      { documentId: 'b', order: 1 },
      { documentId: 'a', order: 0 },
    ];
    expect(pinnedInOrder(pinned).map((p) => p.documentId)).toEqual(['a', 'b']);
  });

  it('shows the empty state only when nothing is pinned', () => {
    expect(showsEmptyState([])).toBe(true);
    expect(showsEmptyState([{ documentId: 'a', order: 0 }])).toBe(false);
  });

  it('unpins by removing the doc and renumbering the rest', () => {
    const pinned = [
      { documentId: 'a', order: 0 },
      { documentId: 'b', order: 1 },
      { documentId: 'c', order: 2 },
    ];
    expect(unpinPinned(pinned, 'b')).toEqual([
      { documentId: 'a', order: 0 },
      { documentId: 'c', order: 1 },
    ]);
    expect(unpinPinned(pinned, 'missing')).toEqual(pinned);
  });
});

/**
 * G604: the official `pinDocument{documentId, afterDocumentId?}` relative insertion
 * (`Wsn` in the official bundle) and the 5-pin cap (`Fin`).
 */
describe('relative pin insertion (G604)', () => {
  const base = [
    { documentId: 'a', order: 0 },
    { documentId: 'b', order: 1 },
    { documentId: 'c', order: 2 },
  ];

  it('inserts at the front when there is no anchor', () => {
    expect(pinAfter(base, 'z').map((p) => p.documentId)).toEqual(['z', 'a', 'b', 'c']);
    expect(pinAfter(base, 'z', null).map((p) => p.documentId)).toEqual(['z', 'a', 'b', 'c']);
  });

  it('inserts right after a named anchor', () => {
    expect(pinAfter(base, 'z', 'a').map((p) => p.documentId)).toEqual(['a', 'z', 'b', 'c']);
    expect(pinAfter(base, 'z', 'c').map((p) => p.documentId)).toEqual(['a', 'b', 'c', 'z']);
  });

  it('moves an already-pinned doc instead of duplicating it', () => {
    expect(pinAfter(base, 'c', 'a').map((p) => p.documentId)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the order alone when the anchor is the doc itself', () => {
    expect(pinAfter(base, 'b', 'b').map((p) => p.documentId)).toEqual(['a', 'b', 'c']);
  });

  it('drops the doc when the anchor is absent, matching the official flatMap', () => {
    expect(pinAfter(base, 'z', 'gone').map((p) => p.documentId)).toEqual(['a', 'b', 'c']);
  });

  it('renumbers the order field 0..n-1 and keeps row metadata', () => {
    const rows = [
      { documentId: 'a', title: 'A', order: 5 },
      { documentId: 'b', title: 'B', order: 9 },
    ];
    expect(pinAfter(rows, 'b', null)).toEqual([
      { documentId: 'b', title: 'B', order: 0 },
      { documentId: 'a', title: 'A', order: 1 },
    ]);
  });
});

describe('the pin cap (G604)', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ documentId: `d${i}`, order: i }));

  it('caps new pins at five', () => {
    expect(PIN_LIMIT).toBe(5);
    expect(canPin(rows(4), 'new')).toBe(true);
    expect(canPin(rows(5), 'new')).toBe(false);
  });

  it('always lets an already-pinned doc be reordered', () => {
    expect(canPin(rows(5), 'd0')).toBe(true);
  });

  it('carries the official hardcoded English copy', () => {
    expect(PIN_LIMIT_COPY.title).toBe("Can't pin document");
    expect(PIN_LIMIT_COPY.description).toBe('You can only pin up to 5 documents.');
  });
});
