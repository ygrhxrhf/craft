import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const keymap = readFileSync(
  new URL('../../components/editor/extensions/craft-keymap.ts', import.meta.url),
  'utf8',
);

/** G1583：官方 Esc 是「退一层」——文本光标 → 块选择 → 离开编辑器。 */
describe('the Escape ladder (G1583)', () => {
  it('turns a text caret into a block selection first', () => {
    expect(keymap).toContain("event.key === 'Escape'");
    expect(keymap).toContain('NodeSelection.create(state.doc, start)');
  });

  it('leaves the editor on the second Escape', () => {
    expect(keymap).toContain('view.dom.blur()');
  });

  it('does not claim Escape with modifiers', () => {
    const block = keymap.slice(keymap.indexOf("event.key === 'Escape'"));
    expect(block.slice(0, 400)).toContain('!event.shiftKey');
  });
});
