import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS, chordFor } from './keymap';

const by = (id: string) => {
  const hit = KEY_BINDINGS.find((binding) => binding.id === id);
  if (!hit) throw new Error(`no binding with id ${id}`);
  return hit;
};

/** G1589：快速开启是同一个面板的四条弦（⌘K 之外再补三条）。 */
describe('the quick-open chords (G1589)', () => {
  it('binds ⌘O / ⌘P / ⌘⇧O to the same command family', () => {
    expect(chordFor(by('TOGGLE_QUICK_OPEN'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: false, key: 'o' });
    expect(chordFor(by('TOGGLE_QUICK_OPEN_ALT'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: false, key: 'p' });
    expect(chordFor(by('TOGGLE_QUICK_OPEN_SAFARI'), 'win')).toMatchObject({ ctrlKey: true, shiftKey: true, key: 'o' });
    expect(by('TOGGLE_QUICK_OPEN').label).toBe('快速开启');
  });

  it('opens the palette through the same matcher the table uses', () => {
    const palette = readFileSync(
      new URL('../../components/search/CommandPalette.tsx', import.meta.url),
      'utf8',
    );
    expect(palette).toContain("'TOGGLE_QUICK_OPEN_ALT'");
    expect(palette).toContain("'TOGGLE_QUICK_OPEN_SAFARI'");
    expect(palette).toContain('KEY_BINDINGS.find(');
    expect(palette).toContain('matches(');
  });
});
