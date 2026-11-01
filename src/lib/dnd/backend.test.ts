import { describe, expect, it } from 'vitest';

import { dragBackendChunk, dragBackendFor } from './backend';
import { DRAG_THRESHOLDS, isTouchPointer, pointerArmDistance, touchArmDelay } from './drag-threshold';

describe('dragBackendFor (G461)', () => {
  it('sends touch and pen to the touch backend', () => {
    expect(dragBackendFor('touch')).toBe('touch');
    expect(dragBackendFor('pen')).toBe('touch');
  });

  it('sends everything else to the HTML5 backend', () => {
    expect(dragBackendFor('mouse')).toBe('html5');
    expect(dragBackendFor('')).toBe('html5');
    expect(dragBackendFor(undefined)).toBe('html5');
    expect(dragBackendFor(null)).toBe('html5');
  });

  it('the backend choice agrees with the threshold table column', () => {
    // The two must not drift: whoever picks the backend also picks which column is read.
    for (const pointer of ['touch', 'pen', 'mouse', '', undefined]) {
      const backend = dragBackendFor(pointer);
      expect(backend === 'touch').toBe(isTouchPointer(pointer));
    }
  });

  it('names the chunk per backend', () => {
    expect(dragBackendChunk('touch')).toBe('TouchDnDProvider');
    expect(dragBackendChunk('html5')).toBe('HTML5DnDProvider');
  });
});

describe('the backend gates the general drag differently (G461 + G268)', () => {
  it('desktop arms on movement, touch on the hold', () => {
    const general = DRAG_THRESHOLDS.general;
    expect(pointerArmDistance('general', 'mouse')).toBe(general.pointerDistance);
    expect(touchArmDelay('general', 'touch')).toBe(general.touchDelay);
    // A touch pointer has no movement gate at all — the timer arms it.
    expect(pointerArmDistance('general', 'touch')).toBe(Number.POSITIVE_INFINITY);
    // A pointer device has no hold gate.
    expect(touchArmDelay('general', 'mouse')).toBe(0);
  });
});
