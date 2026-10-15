import { describe, expect, it } from 'vitest';

import {
  BOARD_CARD_LIST_SELECTOR,
  BOARD_DRAG_EXCLUSION_SELECTOR,
  DRAG_EXCLUSION_SELECTOR,
  pressStartsDrag,
} from './activation-guard';

/**
 * A minimal `closest` stub: the predicate only asks whether the target or an ancestor matches, so
 * the test supplies the ancestry directly rather than building a DOM. `matches` is the only
 * selector-engine surface the guard touches. A matching element returns *itself*, so the guard's
 * `hit !== root` identity check is exercised for real.
 */
function element(chain: string[]): Element {
  const self = {
    closest(selector: string) {
      const selectors = selector.split(',').map((part) => part.trim());
      const hit = chain.find((name) => selectors.includes(name));
      return hit ? self : null;
    },
  } as unknown as Element;
  return self;
}

/** G269: the two selectors are the collected ones, verbatim. */
describe('the exclusion selectors are the official ones', () => {
  it('names the five control kinds, each with the disabled carve-out', () => {
    expect(DRAG_EXCLUSION_SELECTOR).toBe(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]',
    );
  });

  it('adds the board-only object id on top', () => {
    expect(BOARD_DRAG_EXCLUSION_SELECTOR).toBe(`${DRAG_EXCLUSION_SELECTOR}, [data-object-id]`);
  });

  it('names the board card-list container', () => {
    expect(BOARD_CARD_LIST_SELECTOR).toBe('[data-kanban-card-list]');
  });
});

describe('a press on a control never starts a drag', () => {
  it.each(['input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', 'button:not([disabled])', 'a[href]'])(
    'yields to %s',
    (control) => {
      expect(pressStartsDrag(element([control]))).toBe(false);
    },
  );

  it('lets a plain block start the drag', () => {
    expect(pressStartsDrag(element(['div', 'span']))).toBe(true);
  });

  it('looks at ancestors, not just the pressed node', () => {
    // Pressing the label inside a button still yields — `closest` walks up.
    expect(pressStartsDrag(element(['span', 'button:not([disabled])']))).toBe(false);
  });

  it('treats a synthetic (null) target as draggable', () => {
    expect(pressStartsDrag(null)).toBe(true);
  });

  /**
   * A sidebar row is itself a `<button>`, so the selector matches the draggable element. Passing
   * the root keeps the row draggable while still yielding to controls *inside* it.
   */
  it('does not exclude the draggable root itself', () => {
    const root = element(['button:not([disabled])']);
    expect(pressStartsDrag(root, 'general', root)).toBe(true);
  });

  it('still yields to a control nested under the root', () => {
    const root = element(['button:not([disabled])']);
    const child = element(['input:not([disabled])', 'button:not([disabled])']);
    expect(pressStartsDrag(child, 'general', root)).toBe(false);
  });
});

describe('the board variant adds its own exclusions', () => {
  it('yields on an object id, which the general variant allows', () => {
    expect(pressStartsDrag(element(['[data-object-id]']), 'board')).toBe(false);
    expect(pressStartsDrag(element(['[data-object-id]']), 'general')).toBe(true);
  });

  it('yields inside the card-list container', () => {
    expect(pressStartsDrag(element(['div', '[data-kanban-card-list]']), 'board')).toBe(false);
    expect(pressStartsDrag(element(['div', '[data-kanban-card-list]']), 'general')).toBe(true);
  });

  it('still yields to the shared control selector', () => {
    expect(pressStartsDrag(element(['button:not([disabled])']), 'board')).toBe(false);
  });
});
