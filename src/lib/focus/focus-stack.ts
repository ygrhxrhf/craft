/**
 * G478/G479/G491: the global focus stack. Every popup registers one entry with its key
 * definitions; a capture-phase dispatcher walks the stack **top-down** and stops at the first
 * entry that either hits a key or does not allow propagation. An entry runs only its first
 * matching key definition. Entries can be inserted above a named entry (`aboveId`) and can be
 * disabled without being removed.
 *
 * G966 alignment with the official `bn` object: `keyDefs` may be a **function** (recomputed on
 * every dispatch), a hit returns `{preventDefault, stopPropagation}` (a key definition may exempt
 * either), `aboveId` matches by **prefix** (derived ids like `BlockTask-<id>` find their host),
 * and the IME guard entry is per-owner (`<id>disabled-for-ime`, literal concatenation).
 */

import { isImeComposing } from '@/lib/editor/ime-guard';

/** What a hit asks the caller to do; both default to true (official `{preventDefault,stopPropagation}`). */
export interface FocusKeyResult {
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface FocusKeyDef {
  match: (event: KeyboardEvent) => boolean;
  handler: () => void | FocusKeyResult;
}

export type FocusKeyDefs = FocusKeyDef[] | (() => FocusKeyDef[]);

export interface FocusEntry {
  id: string;
  keyDefs: FocusKeyDefs;
  /** Official default: the top entry owns the key even when nothing matched. */
  allowPropagation?: boolean;
  disabled?: boolean;
}

/** Result of one dispatch; `handled` drives the bridge's `preventDefault`/`stopPropagation`. */
export interface FocusDispatchResult {
  handled: boolean;
  preventDefault: boolean;
  stopPropagation: boolean;
}

const NOT_HANDLED: FocusDispatchResult = { handled: false, preventDefault: false, stopPropagation: false };

export class FocusStack {
  private entries: FocusEntry[] = [];

  /** Insert above the first entry whose id **starts with** `aboveId` (official `findIndex(startsWith)`). */
  push(entry: FocusEntry, aboveId?: string): void {
    this.remove(entry.id);
    if (aboveId) {
      const index = this.entries.findIndex((item) => item.id.startsWith(aboveId));
      if (index >= 0) {
        this.entries.splice(index + 1, 0, entry);
        return;
      }
    }
    this.entries.push(entry);
  }

  remove(id: string): void {
    this.entries = this.entries.filter((entry) => entry.id !== id);
  }

  setDisabled(id: string, disabled: boolean): void {
    const entry = this.entries.find((item) => item.id === id);
    if (entry) entry.disabled = disabled;
  }

  /** Ids from bottom to top — useful for tests and for restoring an `aboveId` anchor. */
  ids(): string[] {
    return this.entries.map((entry) => entry.id);
  }

  /**
   * Dispatches a key event. `handled` is true when a handler ran. Break rule
   * (`if (hit || !allowPropagation) break`): a top entry without a hit and without
   * `allowPropagation` blocks every lower entry. Disabled entries are skipped entirely.
   *
   * G865: an IME composition owns the key — the official dispatcher returns before walking the
   * stack, so a candidate-window Escape never closes a popup and a candidate-confirm Enter never
   * submits a cell. The check sits here, at the single entry point, instead of at each caller.
   *
   * G966: a hit's return value may exempt `preventDefault` / `stopPropagation`; anything else on a
   * hit gets both, which is the official default.
   */
  dispatch(
    event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> &
      Partial<Pick<KeyboardEvent, 'keyCode' | 'isComposing'>>
  ): FocusDispatchResult {
    if (isImeComposing(event)) return NOT_HANDLED;
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (entry.disabled) continue;
      const defs = typeof entry.keyDefs === 'function' ? entry.keyDefs() : entry.keyDefs;
      let result: FocusKeyResult | null = null;
      for (const def of defs) {
        if (def.match(event as KeyboardEvent)) {
          result = def.handler() ?? {};
          break;
        }
      }
      if (result !== null) {
        return {
          handled: true,
          preventDefault: result.preventDefault ?? true,
          stopPropagation: result.stopPropagation ?? true,
        };
      }
      if (!entry.allowPropagation) return NOT_HANDLED;
    }
    return NOT_HANDLED;
  }

  clear(): void {
    this.entries = [];
  }
}

export const focusStack = new FocusStack();

export function escapeKeyDef(handler: () => void | FocusKeyResult): FocusKeyDef {
  return {
    match: (event) => event.key === 'Escape',
    handler,
  };
}

/**
 * G966: the official block editor's id is `textEditor-${++instanceCount}` — a module-level
 * counter, not a `useId` and not stable across sessions. The IME entry hangs off it, so two
 * editors composing at once do not share one disabled entry.
 */
let textEditorCount = 0;

export function nextTextEditorId(): string {
  textEditorCount += 1;
  return `textEditor-${textEditorCount}`;
}

/** The official `disabledId` is `id + "disabled-for-ime"` — literal concatenation, no separator. */
export function imeDisabledId(ownerId: string): string {
  return `${ownerId}disabled-for-ime`;
}

/** G865/G966: push one empty, non-propagating entry on top for the composing owner. */
export function disableKeyDefs(ownerId = 'text-editor'): void {
  focusStack.push({ id: imeDisabledId(ownerId), keyDefs: [], allowPropagation: false });
}

export function enableKeyDefs(ownerId = 'text-editor'): void {
  focusStack.remove(imeDisabledId(ownerId));
}

/**
 * Whether the event belongs to a nested Base UI popup. Such a popup owns its own Escape; the
 * stack is skipped so opening a menu inside a dialog does not close the dialog underneath.
 */
export function eventInNestedPopup(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[role="menu"], [role="listbox"], [data-slot="popup"]'));
}
