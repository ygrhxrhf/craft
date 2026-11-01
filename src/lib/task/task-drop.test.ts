import { describe, expect, it } from 'vitest';

import { insertIndexFor, shouldSuppressIndicator, sideFor } from './task-drop';
import { deriveSubtasks, parentOf, subtaskMap, type TaskBlockRow } from './subtasks';
import { pinnedInOrder, PIN_COPY, showsEmptyState, togglePinned } from './pinned-docs';

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

  it('pins by appending and unpins by removing', () => {
    const after = togglePinned([{ documentId: 'a', order: 0 }], 'b');
    expect(after).toEqual([
      { documentId: 'a', order: 0 },
      { documentId: 'b', order: 1 },
    ]);
    expect(togglePinned(after, 'a')).toEqual([{ documentId: 'b', order: 1 }]);
  });
});
