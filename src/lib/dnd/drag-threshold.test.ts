import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DRAG_THRESHOLDS,
  armsOnPress,
  isTouchPointer,
  pointerArmDistance,
  touchArmDelay,
} from './drag-threshold';

/**
 * G268: the official build ships three activation configurations, not one global value. The
 * numbers are verbatim from `ui-affordances.md` §7.1.
 */
describe('the three configurations', () => {
  it('general: 8px on a pointer, 150ms hold on touch', () => {
    expect(DRAG_THRESHOLDS.general).toEqual({
      pointerDistance: 8,
      touchDelay: 150,
      touchTolerance: 5,
    });
  });

  it('handle: no threshold at all', () => {
    expect(DRAG_THRESHOLDS.handle).toEqual({
      pointerDistance: 0,
      touchDelay: 0,
      touchTolerance: 0,
    });
  });

  it('board: 150ms hold regardless of device', () => {
    expect(DRAG_THRESHOLDS.board).toEqual({
      pointerDistance: 0,
      touchDelay: 150,
      touchTolerance: 5,
    });
  });
});

describe('the pointer column is the movement gate', () => {
  it('reads 8px for the general config on a mouse', () => {
    expect(pointerArmDistance('general', 'mouse')).toBe(8);
  });

  it('does not gate a touch pointer on movement', () => {
    expect(pointerArmDistance('general', 'touch')).toBe(Number.POSITIVE_INFINITY);
  });

  it('arms on press for the eager handle', () => {
    expect(pointerArmDistance('handle', 'mouse')).toBe(0);
  });
});

describe('the touch column is the hold gate', () => {
  it('waits 150ms on touch for the general config', () => {
    expect(touchArmDelay('general', 'touch')).toBe(150);
  });

  it('does not wait on a mouse', () => {
    expect(touchArmDelay('general', 'mouse')).toBe(0);
  });

  it('waits on the board even though its pointer column is 0', () => {
    expect(touchArmDelay('board', 'touch')).toBe(150);
    expect(pointerArmDistance('board', 'touch')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('the eager handle arms on press for both device kinds', () => {
  it('is the only config that does', () => {
    expect(armsOnPress('handle', 'mouse')).toBe(true);
    expect(armsOnPress('handle', 'touch')).toBe(true);
    expect(armsOnPress('general', 'mouse')).toBe(false);
    expect(armsOnPress('board', 'touch')).toBe(false);
  });
});

describe('touch pointer detection', () => {
  it('counts touch and pen, not mouse or undefined', () => {
    expect(isTouchPointer('touch')).toBe(true);
    expect(isTouchPointer('pen')).toBe(true);
    expect(isTouchPointer('mouse')).toBe(false);
    expect(isTouchPointer(undefined)).toBe(false);
    expect(isTouchPointer(null)).toBe(false);
  });
});

/**
 * The table is only worth anything if the editor's handle reads it. The handle cannot be armed in a
 * headless probe (it mounts on hover and re-resolves its block from the live DOM), so the wiring is
 * pinned statically instead: the 8px gate must come from the table, not a bare literal.
 */
describe('the editor handle reads the general threshold', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/editor/drag-handle/DragHandle.tsx'),
    'utf8',
  );

  it('imports the threshold table', () => {
    expect(source).toContain("from '@/lib/dnd/drag-threshold'");
  });

  it('gates on the general threshold through the shared helper, not a hard-coded 4', () => {
    // G461: the gate now comes from `pointerArmDistance('general', …)` so the same call decides
    // both the backend and the distance; the reading still has to be the general column.
    expect(source).toContain("pointerArmDistance('general'");
    expect(source).not.toMatch(/if \(dist < 4\)/);
  });
});
