import { describe, expect, it } from 'vitest';

import {
  attributesFor,
  intentFromEvent,
  intentFrozenFor,
  nextState,
  type InputType,
} from './input-intent';

const initial = { input: 'initial' as InputType, intent: 'initial' as InputType };

describe('event → intent mapping (G1080)', () => {
  it('maps the move events to mouse and the touch events to touch', () => {
    expect(intentFromEvent('mousemove')).toBe('mouse');
    expect(intentFromEvent('touchstart')).toBe('touch');
    expect(intentFromEvent('touchend')).toBe('touch');
  });

  it('reads the pointerType table, where a pen is a touch', () => {
    expect(intentFromEvent('pointerdown', 2)).toBe('touch');
    expect(intentFromEvent('pointerdown', 3)).toBe('touch');
    expect(intentFromEvent('pointerdown', 4)).toBe('mouse');
    expect(intentFromEvent('pointerdown', 'mouse')).toBe('mouse');
    expect(intentFromEvent('pointerdown', 'pen')).toBe('pen');
  });

  it('falls back to pointer when a pointer event carries no usable type', () => {
    expect(intentFromEvent('pointermove')).toBe('pointer');
  });
});

describe('the form-control freeze (G1131)', () => {
  it('names exactly the four controls the ledger lists', () => {
    expect(intentFrozenFor('button')).toBe(true);
    expect(intentFrozenFor('INPUT')).toBe(true);
    expect(intentFrozenFor('select')).toBe(true);
    expect(intentFrozenFor('textarea')).toBe(true);
    expect(intentFrozenFor('body')).toBe(false);
    expect(intentFrozenFor(null)).toBe(false);
  });

  it('moves both attributes for a keyboard event on the body', () => {
    expect(nextState(initial, 'keyboard', 'body')).toEqual({ input: 'keyboard', intent: 'keyboard' });
  });

  it('moves only the input type when the keyboard event lands in a form control', () => {
    const afterMouse = { input: 'mouse' as InputType, intent: 'mouse' as InputType };
    expect(nextState(afterMouse, 'keyboard', 'input')).toEqual({ input: 'keyboard', intent: 'mouse' });
  });

  it('does not freeze a pointer event, even inside a form control', () => {
    expect(nextState(initial, 'mouse', 'input')).toEqual({ input: 'mouse', intent: 'mouse' });
  });

  it('lets the two attributes hold different values at once, which is the point', () => {
    // Keyboard into an input, then a move: input stays keyboard while intent goes back to mouse.
    const frozen = nextState({ input: 'mouse', intent: 'mouse' }, 'keyboard', 'input');
    expect(frozen).toEqual({ input: 'keyboard', intent: 'mouse' });
  });
});

describe('the attributes written to the document (G1102)', () => {
  it('starts at initial rather than leaving the attributes absent (G1130)', () => {
    expect(attributesFor(initial)).toEqual({
      'data-whatinput': 'initial',
      'data-whatintent': 'initial',
    });
  });

  it('carries the two diagnostics, with the official single-space replacement', () => {
    const element = { nodeName: 'DIV', classList: { toString: () => 'a b c' } };
    expect(attributesFor({ input: 'keyboard', intent: 'keyboard' }, element)).toEqual({
      'data-whatinput': 'keyboard',
      'data-whatintent': 'keyboard',
      'data-whatelement': 'div',
      // Only the first space becomes a comma — the official `replace` has no `g` flag.
      'data-whatclasses': 'a,b c',
    });
  });
});
