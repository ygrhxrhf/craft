'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { KEY_BINDINGS, detectPlatform, matches } from '@/lib/editor/keymap';
import { shellShortcutAllowed } from '@/lib/editor/shell-scope';
import { useFocusStore } from '@/lib/store/use-focus-store';
import { useSettingsStore } from '@/lib/store/use-settings-store';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';

/**
 * The table C (shell) chords. They are global in the official build — they sit in the focus
 * stack's resident dispatcher, not in the editor — so they listen on `window` and are deliberately
 * claimed *after* the editor layer, which returns false for the ids it does not own.
 *
 * Only chords whose local target exists today are listed: `⌘.` opens focus mode (G11), `⌘\` folds
 * the sidebar, `⌘⌥,` opens the shortcuts panel (G13), `⌘⌥N` opens the daily note. `COMMENT ⌘⇧M`
 * waits on an entry point that was never collected — listing it without an action would bind a
 * key that does nothing.
 */
const HANDLED = new Set([
  'TOGGLE_LEFT_SIDEBAR',
  'OPEN_DAILY_NOTE',
  'TOGGLE_KEY_SHORTCUTS',
  'TOGGLE_FOCUS_MODE',
]);

export function ShellShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const platform = detectPlatform();

    const onKeyDown = (event: KeyboardEvent) => {
      const binding = KEY_BINDINGS.find((candidate) => {
        if (!HANDLED.has(candidate.id)) return false;
        // G624: the shortcut panel is editor-only; on browse screens the key does nothing.
        if (!shellShortcutAllowed(candidate.id, pathname)) return false;
        return matches(
          {
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            key: event.key,
            code: event.code,
          },
          candidate,
          platform,
        );
      });
      if (!binding) return;

      event.preventDefault();
      if (binding.id === 'TOGGLE_LEFT_SIDEBAR') useSidebarStore.getState().toggle();
      else if (binding.id === 'TOGGLE_KEY_SHORTCUTS') useSettingsStore.getState().openSettings('shortcuts');
      else if (binding.id === 'TOGGLE_FOCUS_MODE') useFocusStore.getState().toggle();
      else router.push('/daily-notes');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, pathname]);

  return null;
}
