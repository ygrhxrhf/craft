import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { escapeKeyDef, focusStack } from '@/lib/focus/focus-stack';

/**
 * G456：集合单元格的弹层编辑器**按名字注册进全局焦点栈**（官方
 * `collection-v2-{…}-editor` + `onClose` + `{isDisabled: !open}`）⇒ Esc 由栈按名字路由，
 * 而不是各弹层自己挂监听。
 */
describe('cell editors register in the focus stack by name (G456)', () => {
  beforeEach(() => focusStack.clear());

  it('routes Escape to the top-most editor only, then it must be gone from the stack', () => {
    const closed: string[] = [];
    focusStack.push({
      id: 'collection-v2-select-editor',
      keyDefs: [escapeKeyDef(() => { closed.push('select'); })],
    });
    focusStack.push({
      id: 'collection-v2-multiselect-editor',
      keyDefs: [escapeKeyDef(() => { closed.push('multi'); })],
    });

    const event = { key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    expect(focusStack.dispatch(event).handled).toBe(true);
    // 栈顶先吃键：只有 multiselect 那枚关掉。
    expect(closed).toEqual(['multi']);
    // 关掉的那枚要被 remove（组件卸载的 cleanup 在真实代码里做，这里直接模拟同一动作）。
    focusStack.remove('collection-v2-multiselect-editor');
    expect(focusStack.ids()).toEqual(['collection-v2-select-editor']);

    expect(focusStack.dispatch(event).handled).toBe(true);
    expect(closed).toEqual(['multi', 'select']);
    focusStack.clear();
  });

  it('wires the three popover editors with the official-style names', () => {
    const cell = readFileSync(
      join(process.cwd(), 'src/components/collection/PropertyCell.tsx'),
      'utf8',
    );
    expect(cell).toContain("useCellEditorEscape(open, 'collection-v2-select-editor'");
    expect(cell).toContain("useCellEditorEscape(open, 'collection-v2-multiselect-editor'");
    expect(cell).toContain("useCellEditorEscape(open, 'collection-v2-relation-editor'");

    const hook = readFileSync(
      join(process.cwd(), 'src/components/collection/cell-editor-escape.ts'),
      'utf8',
    );
    expect(hook).toContain('focusStack.push({ id, keyDefs: [escapeKeyDef(');
    expect(hook).toContain('focusStack.remove(id)');
    // `close` 走 ref：注册只由 open/id 触发，不随每次渲染的 identity 变化重刷。
    expect(hook).toContain('closeRef.current = close;');
  });
});
