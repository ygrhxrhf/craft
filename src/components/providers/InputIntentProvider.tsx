'use client';

import { useEffect } from 'react';

import {
  attributesFor,
  intentFromEvent,
  nextState,
  type InputType,
} from '@/lib/input-intent';

/**
 * Mounts the input-intent gate (G1080): writes `data-whatinput` / `data-whatintent` on
 * `document.documentElement` so CSS can tell a keyboard focus from a pointer one.
 *
 * Both attributes start at `initial` rather than being absent (G1130) — a selector written as
 * "anything but mouse means keyboard" would otherwise behave differently on the first frame.
 *
 * The two event groups are not symmetric (G1099): a *real* input event updates both attributes
 * (with the form-control freeze from `nextState`), while a move only updates the intent. That is
 * why `keyboard` + `mouse` can hold at the same time.
 */
export function InputIntentProvider() {
  useEffect(() => {
    const root = document.documentElement;
    let state: { input: InputType; intent: InputType } = { input: 'initial', intent: 'initial' };
    let lastInput: InputType = 'initial';

    const write = (element?: Element | null) => {
      const attributes = attributesFor(state, element);
      for (const [name, value] of Object.entries(attributes)) {
        root.setAttribute(name, value);
      }
    };

    write();

    const realInput = (event: Event, kind: InputType) => {
      const target = event.target as Element | null;
      state = nextState(state, kind, target?.tagName ?? null);
      lastInput = state.input;
      write(target);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      realInput(event, 'keyboard');
    };
    const onPointerDown = (event: PointerEvent) => {
      realInput(event, intentFromEvent('pointerdown', event.pointerType));
    };
    const onTouchStart = () => realInput(new Event('touchstart'), 'touch');

    // Moves only ever touch the intent — never the input type.
    const onPointerMove = (event: PointerEvent) => {
      state = { input: lastInput, intent: intentFromEvent('pointermove', event.pointerType) };
      write(event.target as Element | null);
    };
    const onMouseMove = () => {
      state = { input: lastInput, intent: 'mouse' };
      write();
    };
    const onWheel = () => {
      state = { input: lastInput, intent: 'mouse' };
      write();
    };

    // `focusout` clears the diagnostics (G1102).
    const onFocusOut = () => {
      root.removeAttribute('data-whatelement');
      root.removeAttribute('data-whatclasses');
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onTouchStart, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('wheel', onWheel, true);
    document.addEventListener('focusout', onFocusOut, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('focusout', onFocusOut, true);
    };
  }, []);

  return null;
}
