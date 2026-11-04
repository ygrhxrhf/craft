'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { KEY_BINDINGS, detectPlatform, matches } from '@/lib/editor/keymap';
import { shellShortcutAllowed } from '@/lib/editor/shell-scope';
import { isImeComposing } from '@/lib/editor/ime-guard';
import { useFocusStore } from '@/lib/store/use-focus-store';
import { KeyContextStack, type KeyLayer } from '@/lib/editor/key-context-stack';

/**
 * The table C (shell) chords. They are global in the official build — one **document-level,
 * capture-phase** dispatcher (`document.addEventListener("keydown", tEe, opts, true)`, G489),
 * which is why official shortcuts run *before* any component's own keydown. Locally the same
 * shape: this listener sits on `document` with `capture`, so it beats every bubble-phase
 * component handler instead of waiting for them to let the event through.
 *
 * Only chords with a measured action are handled: `⌘.` opens focus mode (G11). The official web
 * build measures `⌘\` / `⌘⌥,` / `⌘⌥N` as inert (G1587/G1592/G1585), so those stay listed in the
 * binding table but are not claimed here. `COMMENT ⌘⇧M` still waits on an entry point that was
 * never collected.
 */
const HANDLED = new Set(['TOGGLE_FOCUS_MODE']);

export function ShellShortcuts() {
  const pathname = usePathname();

  useEffect(() => {
    const platform = detectPlatform();

    // G1478: the shell's chords live in a **context layer** of the key stack, not in the editor.
    // The layer is active everywhere; the editor's own layer sits above it and consumes the chords
    // it owns first, so the stack — not registration order — decides who wins a collision.
    const shellLayer: KeyLayer<string> = {
      name: 'shell',
      isActive: () => true,
      bindings: new Map(KEY_BINDINGS.filter((b) => HANDLED.has(b.id)).map((b) => [b.id, b.id])),
    };
    const stack = new KeyContextStack<string>();
    stack.push(shellLayer);

    const onKeyDown = (event: KeyboardEvent) => {
      // G490: an IME composing (`keyCode 229`) swallows the whole dispatch — the candidate window
      // owns Esc/Enter, so the shell must not act on them either.
      if (isImeComposing(event)) return;
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
      // The stack resolves the chord: an inactive layer (or one that does not own it) is skipped.
      if (stack.resolve(binding.id)?.binding !== binding.id) return;

      event.preventDefault();
      useFocusStore.getState().toggle();
    };

    // G489：官方快捷键＝**单一入口且挂 document 的 capture 阶段** ⇒ 先于任何组件自己的
    // keydown 被处理（组件若在冒泡阶段 stopPropagation，快捷键照样先跑）。
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [pathname]);

  return null;
}
