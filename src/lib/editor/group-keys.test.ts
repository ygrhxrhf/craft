import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS, chordFor } from './keymap';

const by = (id: string) => {
  const hit = KEY_BINDINGS.find((binding) => binding.id === id);
  if (!hit) throw new Error(`no binding with id ${id}`);
  return hit;
};

/** G1588 / G1594：组合与取消组合各有键位。 */
describe('the group chords (G1588, G1594)', () => {
  it('binds Ctrl-G to group and Ctrl-Shift-G to ungroup', () => {
    expect(chordFor(by('GROUP_BLOCKS'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: false, key: 'g' });
    expect(chordFor(by('UNGROUP_BLOCKS'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: 'g' });
  });

  it('dispatches both to the group helpers', () => {
    const keymap = readFileSync(
      new URL('../../components/editor/extensions/craft-keymap.ts', import.meta.url),
      'utf8',
    );
    expect(keymap).toContain("if (id === 'GROUP_BLOCKS') {");
    expect(keymap).toContain('applyGroupIndices(editor.state, editor.view.dispatch, selection.indices)');
    expect(keymap).toContain("if (id === 'UNGROUP_BLOCKS') return applyUngroup(");
  });

  it('keeps the find panel on text selections only', () => {
    const keymap = readFileSync(
      new URL('../../components/editor/extensions/craft-keymap.ts', import.meta.url),
      'utf8',
    );
    expect(keymap).toContain('const isTextSelection = !(view.state.selection instanceof NodeSelection);');
    expect(keymap).toContain('if (from !== to && isTextSelection)');
  });
});
