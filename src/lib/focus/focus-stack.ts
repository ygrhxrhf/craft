/**
 * G478/G479/G491: the global focus stack. Every popup registers one entry with its key
 * definitions; a capture-phase dispatcher walks the stack **top-down** and stops at the first
 * entry that either hits a key or does not allow propagation. An entry runs only its first
 * matching key definition. Entries can be inserted above a named entry (`aboveId`) and can be
 * disabled without being removed.
 */

export interface FocusKeyDef {
  match: (event: KeyboardEvent) => boolean;
  handler: () => void;
}

export interface FocusEntry {
  id: string;
  keyDefs: FocusKeyDef[];
  /** Official default: the top entry owns the key even when nothing matched. */
  allowPropagation?: boolean;
  disabled?: boolean;
}

export class FocusStack {
  private entries: FocusEntry[] = [];

  push(entry: FocusEntry, aboveId?: string): void {
    this.remove(entry.id);
    if (aboveId) {
      const index = this.entries.findIndex((item) => item.id === aboveId);
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
   * Dispatches a key event. Returns true when a handler ran (the caller prevents default).
   * Break rule (`if (hit || !allowPropagation) break`): a top entry without a hit and without
   * `allowPropagation` blocks every lower entry. Disabled entries are skipped entirely.
   */
  dispatch(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): boolean {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (entry.disabled) continue;
      let hit = false;
      for (const def of entry.keyDefs) {
        if (def.match(event as KeyboardEvent)) {
          def.handler();
          hit = true;
          break;
        }
      }
      if (hit || !entry.allowPropagation) return hit;
    }
    return false;
  }

  clear(): void {
    this.entries = [];
  }
}

export const focusStack = new FocusStack();

export function escapeKeyDef(handler: () => void): FocusKeyDef {
  return {
    match: (event) => event.key === 'Escape',
    handler,
  };
}

/**
 * Whether the event belongs to a nested Base UI popup. Such a popup owns its own Escape; the
 * stack is skipped so opening a menu inside a dialog does not close the dialog underneath.
 */
export function eventInNestedPopup(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[role="menu"], [role="listbox"], [data-slot="popup"]'));
}
