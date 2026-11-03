'use client';

import { useEffect } from 'react';
import { eventInNestedPopup, focusStack } from '@/lib/focus/focus-stack';

/**
 * G478/G491: one capture-phase listener feeds every registered popup. A hit consumes the key
 * (preventDefault + stopPropagation); a miss on a non-propagating entry blocks lower entries
 * without touching the event, so typing inside a dialog is unaffected. Nested Base UI popups
 * keep their own Escape.
 */
export function FocusStackBridge() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (eventInNestedPopup(event.target)) return;
      if (focusStack.dispatch(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
  return null;
}
