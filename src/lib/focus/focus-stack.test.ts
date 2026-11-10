import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  escapeKeyDef,
  eventInNestedPopup,
  FocusStack,
  type FocusEntry,
} from './focus-stack';

function key(keyName: string): KeyboardEvent {
  return { key: keyName, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false } as KeyboardEvent;
}

function entry(id: string, handler: () => void, extra: Partial<FocusEntry> = {}): FocusEntry {
  return { id, keyDefs: [escapeKeyDef(handler)], ...extra };
}

describe('the global focus stack (G478/G479/G491)', () => {
  it('registers entries and inserts above a named one', () => {
    const stack = new FocusStack();
    stack.push(entry('a', () => undefined));
    stack.push(entry('b', () => undefined));
    stack.push(entry('c', () => undefined), 'a');
    expect(stack.ids()).toEqual(['a', 'c', 'b']);
  });

  it('lets only the top entry handle a hit, and stops there', () => {
    const stack = new FocusStack();
    const calls: string[] = [];
    stack.push(entry('lower', () => calls.push('lower')));
    stack.push(entry('upper', () => calls.push('upper')));
    expect(stack.dispatch(key('Escape'))).toBe(true);
    expect(calls).toEqual(['upper']);
  });

  it('blocks lower entries even without a hit when allowPropagation is false', () => {
    const stack = new FocusStack();
    let hit = false;
    stack.push({ id: 'lower', keyDefs: [{ match: (event) => event.key === 'Enter', handler: () => { hit = true; } }] });
    stack.push({ id: 'upper', keyDefs: [] });
    expect(stack.dispatch(key('Enter'))).toBe(false);
    expect(hit).toBe(false);
  });

  it('falls through when allowPropagation is true and nothing matched', () => {
    const stack = new FocusStack();
    let hit = false;
    stack.push({ id: 'lower', keyDefs: [{ match: (event) => event.key === 'Enter', handler: () => { hit = true; } }] });
    stack.push({ id: 'upper', keyDefs: [], allowPropagation: true });
    expect(stack.dispatch(key('Enter'))).toBe(true);
    expect(hit).toBe(true);
  });

  it('runs only the first matching key definition in an entry', () => {
    const stack = new FocusStack();
    const calls: string[] = [];
    stack.push({
      id: 'top',
      keyDefs: [
        { match: (event) => event.key === 'Escape', handler: () => calls.push('first') },
        { match: (event) => event.key === 'Escape', handler: () => calls.push('second') },
      ],
    });
    stack.dispatch(key('Escape'));
    expect(calls).toEqual(['first']);
  });

  it('skips disabled entries without removing them', () => {
    const stack = new FocusStack();
    const calls: string[] = [];
    stack.push(entry('lower', () => calls.push('lower')));
    stack.push(entry('upper', () => calls.push('upper')));
    stack.setDisabled('upper', true);
    expect(stack.dispatch(key('Escape'))).toBe(true);
    expect(calls).toEqual(['lower']);
    expect(stack.ids()).toEqual(['lower', 'upper']);
  });

  it('removes and clears entries', () => {
    const stack = new FocusStack();
    stack.push(entry('a', () => undefined));
    stack.remove('a');
    expect(stack.ids()).toEqual([]);
    stack.push(entry('b', () => undefined));
    stack.clear();
    expect(stack.ids()).toEqual([]);
  });

  it('G865: skips dispatch entirely during IME composition', () => {
    const stack = new FocusStack();
    let hit = false;
    stack.push(entry('target', () => { hit = true; }));

    // Standard isComposing
    expect(stack.dispatch({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: true })).toBe(false);
    expect(hit).toBe(false);

    // Legacy / platform keyCode 229
    expect(stack.dispatch({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, keyCode: 229 })).toBe(false);
    expect(hit).toBe(false);

    // Process synthetic key
    expect(stack.dispatch({ key: 'Process', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe(false);
    expect(hit).toBe(false);

    // Normal Escape runs
    expect(stack.dispatch(key('Escape'))).toBe(true);
    expect(hit).toBe(true);
  });

  it('leaves nested Base UI popups to their own Escape handling', () => {
    expect(eventInNestedPopup(null)).toBe(false);
  });

  it('is mounted once and used by the settings and dialog layers', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const providers = read('../../components/providers/Providers.tsx');
    const settings = read('../../components/settings/SettingsModal.tsx');
    const dialog = read('../../components/dialog/DialogHost.tsx');
    expect(providers).toContain('<FocusStackBridge />');
    expect(settings).toContain("focusStack.push({ id: 'settings'");
    expect(dialog).toContain("focusStack.push({ id: 'imperative-dialog'");
  });
});
