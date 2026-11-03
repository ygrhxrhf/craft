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
 * pinned statically instead.
 */
describe('the editor handle reads the eager threshold', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/editor/drag-handle/DragHandle.tsx'),
    'utf8',
  );

  it('imports the threshold table', () => {
    expect(source).toContain("from '@/lib/dnd/drag-threshold'");
  });

  it('takes both gates from the handle column, not a hard-coded 4', () => {
    // G268: the block handle belongs to the official 「无阈值」 bucket, so both the movement gate and
    // the touch hold read the `handle` row (0/0). G461 still requires them to come from the table.
    expect(source).toContain("pointerArmDistance('handle'");
    expect(source).toContain("touchArmDelay('handle'");
    expect(source).not.toContain("pointerArmDistance('general'");
    expect(source).not.toMatch(/if \(dist < 4\)/);
  });
});
