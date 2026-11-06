import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { selectToEdgeAction } from './select-to-edge';

const chord = (key: string, extra: Partial<Parameters<typeof selectToEdgeAction>[0]> = {}) => ({
  key,
  ctrlKey: true,
  metaKey: false,
  altKey: false,
  shiftKey: true,
  ...extra,
});

describe('G1599 选择到顶/底的弦（Windows）', () => {
  it('↑ 只拦截、焦点留在编辑器；↓/Home/End 拦截并把焦点交给 body', () => {
    expect(selectToEdgeAction(chord('ArrowUp'), 'win')).toBe('block');
    expect(selectToEdgeAction(chord('ArrowDown'), 'win')).toBe('blur');
    expect(selectToEdgeAction(chord('Home'), 'win')).toBe('blur');
    expect(selectToEdgeAction(chord('End'), 'win')).toBe('blur');
    expect(selectToEdgeAction(chord('ArrowUp'), 'win')).toBe('block');
  });

  it('缺修饰键、带 Alt 或正在组字时不接管', () => {
    expect(selectToEdgeAction(chord('ArrowUp', { shiftKey: false }), 'win')).toBeNull();
    expect(selectToEdgeAction(chord('ArrowUp', { ctrlKey: false }), 'win')).toBeNull();
    expect(selectToEdgeAction(chord('ArrowUp', { altKey: true }), 'win')).toBeNull();
    expect(selectToEdgeAction(chord('ArrowUp', { isComposing: true }), 'win')).toBeNull();
    expect(selectToEdgeAction(chord('ArrowLeft'), 'win')).toBeNull();
  });

  it('Mac 没有同组实测，不改默认行为', () => {
    expect(selectToEdgeAction(chord('ArrowUp'), 'mac')).toBeNull();
    expect(selectToEdgeAction(chord('End', { ctrlKey: false, metaKey: true }), 'mac')).toBeNull();
  });

  it('捕获阶段接管，先于 ProseMirror 的默认 selectTextUp/Down', () => {
    const source = readFileSync('src/components/editor/extensions/craft-keymap.ts', 'utf8');
    expect(source).toContain('selectToEdgeAction(');
    expect(source).toContain("this.editor.view.dom.addEventListener('keydown', handler, true)");
    expect(source).toContain('this.editor.view.dom.blur()');
  });
});