import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS, chordFor } from './keymap';
import { BINDING_SECTIONS } from './shortcut-panel';

const by = (id: string) => {
  const hit = KEY_BINDINGS.find((binding) => binding.id === id);
  if (!hit) throw new Error(`no binding with id ${id}`);
  return hit;
};

/** G1582：行内格式三条官方键位（删除线／高亮／代码）由本表接管。 */
describe('the inline format chords (G1582)', () => {
  it('binds strike, highlight and code to the collected Windows chords', () => {
    expect(chordFor(by('STRIKE_INLINE'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: '-' });
    expect(chordFor(by('HIGHLIGHT_INLINE'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: 'b' });
    expect(chordFor(by('CODE_INLINE'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: 'c' });
  });

  it('files them under the format panel section', () => {
    expect(BINDING_SECTIONS.STRIKE_INLINE).toBe('style-format');
    expect(BINDING_SECTIONS.HIGHLIGHT_INLINE).toBe('style-format');
    expect(BINDING_SECTIONS.CODE_INLINE).toBe('style-format');
  });

  it('dispatches each to its toggle command', () => {
    const keymap = readFileSync(
      new URL('../../components/editor/extensions/craft-keymap.ts', import.meta.url),
      'utf8',
    );
    expect(keymap).toContain('toggleStrike().run()');
    expect(keymap).toContain('toggleHighlight().run()');
    expect(keymap).toContain('toggleCode().run()');
  });
});
