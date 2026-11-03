import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS, chordFor } from './keymap';
import { BINDING_SECTIONS } from './shortcut-panel';
import {
  CARD_BACKGROUND_PRESETS,
  CARD_CONFIG,
  PAGE_PREVIEW_COPY,
  STYLE_KEY_DECORATION,
  cardPresetColor,
  toggledDecoration,
} from './style-keys';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const by = (id: string) => {
  const hit = KEY_BINDINGS.find((binding) => binding.id === id);
  if (!hit) throw new Error(`no binding with id ${id}`);
  return hit;
};

/** G1584：四枚样式键在官方表 A 里都有实测落点，本地逐枚绑到已有命令上。 */
describe('the four style keys (G1584)', () => {
  it('binds PAGE and CARD to the collected chords', () => {
    expect(chordFor(by('PAGE'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: 'p' });
    expect(chordFor(by('CARD'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: 'l' });
    expect(chordFor(by('PAGE'), 'mac')).toMatchObject({ metaKey: true, shiftKey: true });
    expect(chordFor(by('CARD'), 'mac')).toMatchObject({ metaKey: true, shiftKey: true });
  });

  it('binds the two decoration keys to the collected punctuation', () => {
    expect(chordFor(by('FOCUS_DECOR'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, code: 'Backslash' });
    expect(chordFor(by('BLOCK_DECOR'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, code: 'Quote' });
  });

  it('files PAGE/CARD under 文本样式 and the decorations under 装饰', () => {
    expect(BINDING_SECTIONS.PAGE).toBe('style-text');
    expect(BINDING_SECTIONS.CARD).toBe('style-text');
    expect(BINDING_SECTIONS.FOCUS_DECOR).toBe('style-decorations');
    expect(BINDING_SECTIONS.BLOCK_DECOR).toBe('style-decorations');
  });

  it('uses the collected preview sentence and card panel copy', () => {
    expect(PAGE_PREVIEW_COPY).toBe('页面预览将显示在此处。单击以添加内容。');
    expect(CARD_CONFIG).toEqual({
      title: '配置卡片',
      style: '套用样式',
      preview: '预览',
      customBackground: '自定义背景',
      custom: '自定义',
    });
  });

  it('toggles a decoration on and back off', () => {
    expect(toggledDecoration(null)).toBe(STYLE_KEY_DECORATION);
    expect(toggledDecoration(STYLE_KEY_DECORATION)).toBeNull();
    expect(cardPresetColor('blue')).toBe('#dbeafe');
    expect(cardPresetColor('missing')).toBeNull();
    expect(CARD_BACKGROUND_PRESETS.length).toBeGreaterThan(1);
  });

  it('dispatches each key to a real command', () => {
    const keymap = read('../../components/editor/extensions/craft-keymap.ts');
    expect(keymap).toContain("if (id === 'PAGE') return editor.chain().focus().setPageBlock().run();");
    expect(keymap).toContain('useCardConfigStore.getState().ask(index)');
    expect(keymap).toContain('chain.setFocusStyle(next).run()');
    expect(keymap).toContain('chain.setShadedStyle(next).run()');
  });

  it('registers the page block and the card panel once in the editor', () => {
    const editor = read('../../components/editor/Editor.tsx');
    expect(editor).toContain('PageBlock.configure({ hostDocumentId: documentId })');
    expect(editor).toContain('<CardConfigHost editor={editor} />');
  });
});
