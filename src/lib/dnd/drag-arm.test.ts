import { describe, expect, it } from 'vitest';

import { armDecision, armGate, createDragArm } from './drag-arm';

/** G268：三档阈值各自挑哪一道门。 */
describe('armGate', () => {
  it('uses movement for a mouse on the general path', () => {
    expect(armGate('general', 'mouse')).toEqual({ kind: 'distance', px: 8 });
  });

  it('uses the hold for touch on the general path', () => {
    expect(armGate('general', 'touch')).toEqual({ kind: 'hold', ms: 150, tolerance: 5 });
  });

  it('arms on press for the eager handle on either device', () => {
    expect(armGate('handle', 'mouse')).toEqual({ kind: 'immediate' });
    expect(armGate('handle', 'touch')).toEqual({ kind: 'immediate' });
  });

  it('keeps the hold for a mouse on the board path, because the board does not care about device', () => {
    expect(armGate('board', 'mouse')).toEqual({ kind: 'hold', ms: 150, tolerance: 5 });
  });

  it('treats a missing pointer type as a pointer device', () => {
    expect(armGate('general')).toEqual({ kind: 'distance', px: 8 });
  });
});

describe('armDecision', () => {
  it('forgives up to the tolerance on a hold', () => {
    const hold = { kind: 'hold', ms: 150, tolerance: 5 } as const;
    expect(armDecision(hold, { ms: 145 })).toBe(true);
    expect(armDecision(hold, { ms: 150 })).toBe(true);
    expect(armDecision(hold, { ms: 140 })).toBe(false);
  });

  it('requires the whole distance for a movement gate', () => {
    const distance = { kind: 'distance', px: 8 } as const;
    expect(armDecision(distance, { px: 8 })).toBe(true);
    expect(armDecision(distance, { px: 7.9 })).toBe(false);
    expect(armDecision(distance, {})).toBe(false);
  });

  it('is armed right away for an immediate gate', () => {
    expect(armDecision({ kind: 'immediate' }, {})).toBe(true);
  });
});

describe('createDragArm', () => {
  it('starts unarmed, and ignores a move with no press behind it', () => {
    const arm = createDragArm('general');
    expect(arm.armed).toBe(false);
    arm.move({ x: 100, y: 100, time: 500 });
    expect(arm.armed).toBe(false);
  });

  it('arms a general mouse drag only past 8px of travel', () => {
    const arm = createDragArm('general');
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 0 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 3, y: 0, time: 10 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 6, y: 0, time: 20 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 8, y: 0, time: 30 });
    expect(arm.armed).toBe(true);
  });

  it('measures the travel in any direction', () => {
    const arm = createDragArm('general');
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 0 });
    arm.move({ x: 5, y: 5, time: 10 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 6, y: 6, time: 20 });
    expect(arm.armed).toBe(true);
  });

  it('stays armed once the gate is passed', () => {
    const arm = createDragArm('general');
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 0 });
    arm.move({ x: 20, y: 0, time: 10 });
    expect(arm.armed).toBe(true);
    arm.move({ x: 2, y: 0, time: 20 });
    expect(arm.armed).toBe(true);
  });

  it('arms a general touch only after the hold, tolerance inclusive', () => {
    const arm = createDragArm('general');
    arm.press({ x: 10, y: 10, pointerType: 'touch', time: 0 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 10, y: 10, time: 100 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 10, y: 10, time: 145 });
    expect(arm.armed).toBe(true);
  });

  it('does not let a drifting finger substitute for the hold', () => {
    const arm = createDragArm('general');
    arm.press({ x: 0, y: 0, pointerType: 'touch', time: 0 });
    arm.move({ x: 50, y: 50, time: 10 });
    expect(arm.armed).toBe(false);
  });

  it('arms the eager handle the instant the pointer presses', () => {
    const arm = createDragArm('handle');
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 0 });
    expect(arm.armed).toBe(true);
    arm.press({ x: 0, y: 0, pointerType: 'touch', time: 0 });
    expect(arm.armed).toBe(true);
  });

  it('arms a board mouse by the hold rather than by travel', () => {
    const arm = createDragArm('board');
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 0 });
    arm.move({ x: 100, y: 0, time: 10 });
    expect(arm.armed).toBe(false);
    arm.move({ x: 100, y: 0, time: 145 });
    expect(arm.armed).toBe(true);
  });

  it('releases so the next press has to clear the gate again', () => {
    const arm = createDragArm('general');
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 0 });
    arm.move({ x: 20, y: 0, time: 10 });
    expect(arm.armed).toBe(true);
    arm.release();
    expect(arm.armed).toBe(false);
    arm.press({ x: 0, y: 0, pointerType: 'mouse', time: 100 });
    expect(arm.armed).toBe(false);
  });
});
