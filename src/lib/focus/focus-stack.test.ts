import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  disableKeyDefs,
  enableKeyDefs,
  escapeKeyDef,
  eventInNestedPopup,
  FocusStack,
  imeDisabledId,
  nextTextEditorId,
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

  // G966：官方 `aboveFocusStackId` 走的是 `startsWith`——锚 id 是前缀就能命中，
  // 于是 `textEditor-2` 能插在 `textEditor` 那枚的上方。
  it('G966: resolves an aboveId by prefix, the way the official stack does', () => {
    const stack = new FocusStack();
    stack.push(entry('textEditor-1', () => undefined));
    stack.push(entry('menu', () => undefined));
    stack.push(entry('textEditor-2', () => undefined), 'textEditor');
    expect(stack.ids()).toEqual(['textEditor-1', 'textEditor-2', 'menu']);
  });

  it('replaces an entry pushed twice under the same id instead of stacking it', () => {
    const stack = new FocusStack();
    stack.push(entry('a', () => undefined));
    stack.push(entry('a', () => undefined));
    expect(stack.ids()).toEqual(['a']);
  });

  it('lets only the top entry handle a hit, and stops there', () => {
    const stack = new FocusStack();
    const calls: string[] = [];
    stack.push(entry('lower', () => calls.push('lower')));
    stack.push(entry('upper', () => calls.push('upper')));
    expect(stack.dispatch(key('Escape')).handled).toBe(true);
    expect(calls).toEqual(['upper']);
  });

  // G966：命中时默认 `{preventDefault, stopPropagation} = true`，两者可分别豁免。
  it('G966: a hit defaults to preventDefault + stopPropagation, both exposable', () => {
    const stack = new FocusStack();
    stack.push(entry('plain', () => undefined));
    expect(stack.dispatch(key('Escape'))).toEqual({ handled: true, preventDefault: true, stopPropagation: true });

    const exempt = new FocusStack();
    exempt.push(entry('scroll-through', () => ({ preventDefault: false, stopPropagation: false })));
    expect(exempt.dispatch(key('Escape'))).toEqual({ handled: true, preventDefault: false, stopPropagation: false });
  });

  it('blocks lower entries even without a hit when allowPropagation is false', () => {
    const stack = new FocusStack();
    let hit = false;
    stack.push({ id: 'lower', keyDefs: [{ match: (event) => event.key === 'Enter', handler: () => { hit = true; } }] });
    stack.push({ id: 'upper', keyDefs: [] });
    expect(stack.dispatch(key('Enter'))).toEqual({ handled: false, preventDefault: false, stopPropagation: false });
    expect(hit).toBe(false);
  });

  it('falls through when allowPropagation is true and nothing matched', () => {
    const stack = new FocusStack();
    let hit = false;
    stack.push({ id: 'lower', keyDefs: [{ match: (event) => event.key === 'Enter', handler: () => { hit = true; } }] });
    stack.push({ id: 'upper', keyDefs: [], allowPropagation: true });
    expect(stack.dispatch(key('Enter')).handled).toBe(true);
    expect(hit).toBe(true);
  });

  // G966：`keyDefs` 可以是函数——每次分发现算，弹层开合后不必重推条目。
  it('G966: resolves a function keyDefs at dispatch time', () => {
    const stack = new FocusStack();
    const calls: string[] = [];
    stack.push({
      id: 'dynamic',
      keyDefs: () => [escapeKeyDef(() => { calls.push('escape'); })],
    });
    expect(stack.dispatch(key('Escape')).handled).toBe(true);
    expect(calls).toEqual(['escape']);
    expect(stack.dispatch(key('Enter')).handled).toBe(false);
  });

  it('runs only the first matching key definition in an entry', () => {
    const stack = new FocusStack();
    const calls: string[] = [];
    stack.push({
      id: 'top',
      keyDefs: [
        { match: (event) => event.key === 'Escape', handler: () => { calls.push('first'); } },
        { match: (event) => event.key === 'Escape', handler: () => { calls.push('second'); } },
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
    expect(stack.dispatch(key('Escape')).handled).toBe(true);
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
    expect(stack.dispatch({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: true }).handled).toBe(false);
    expect(hit).toBe(false);

    // Legacy / platform keyCode 229
    expect(stack.dispatch({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, keyCode: 229 }).handled).toBe(false);
    expect(hit).toBe(false);

    // Process synthetic key
    expect(stack.dispatch({ key: 'Process', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }).handled).toBe(false);
    expect(hit).toBe(false);

    // Normal Escape runs
    expect(stack.dispatch(key('Escape')).handled).toBe(true);
    expect(hit).toBe(true);
  });

  // G966：禁用条目按**拥有者**命名 `<ownerId>disabled-for-ime`——两个编辑器同时开时，
  // 关掉一个不能顺手把另一个的键也放出来；编辑器 id 是自增的 `textEditor-N`。
  it('G966: the IME-disabled entry is per owner, so one editor cannot free another', () => {
    const stack = new FocusStack();
    stack.push(entry('other', () => undefined));
    stack.push({ id: imeDisabledId('textEditor-1'), keyDefs: [], allowPropagation: false });

    expect(imeDisabledId('textEditor-1')).toBe('textEditor-1disabled-for-ime');
    expect(nextTextEditorId()).toMatch(/^textEditor-\d+$/);

    expect(stack.ids()).toEqual(['other', 'textEditor-1disabled-for-ime']);
    stack.remove(imeDisabledId('textEditor-1'));
    expect(stack.ids()).toEqual(['other']);
    expect(disableKeyDefs).toBeTypeOf('function');
    expect(enableKeyDefs).toBeTypeOf('function');
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
