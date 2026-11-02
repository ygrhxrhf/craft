import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { enterSelection, selectionLabel, toggleSelection } from './selection';

// G623: entering selection mode auto-selects the first card; toggling works on a set copy.
describe('browse batch selection (G623)', () => {
  it('auto-selects the first card on entry', () => {
    expect([...enterSelection(['a', 'b', 'c'])]).toEqual(['a']);
    expect([...enterSelection([])]).toEqual([]);
  });

  it('toggles one id without mutating the input set', () => {
    const start = new Set(['a']);
    const added = toggleSelection(start, 'b');
    expect([...added]).toEqual(['a', 'b']);
    expect([...start]).toEqual(['a']);
    expect([...toggleSelection(added, 'a')]).toEqual(['b']);
  });

  it('prints the official count sentence', () => {
    expect(selectionLabel(3)).toBe('已选 3 项');
  });

  it('wires the mode into the grid and the card', () => {
    const grid = readFileSync(
      join(process.cwd(), 'src', 'components', 'document', 'SortableDocGrid.tsx'),
      'utf8',
    );
    // G223 moved the 选择 entry into the toolbar's ⋯ menu.
    const toolbar = readFileSync(
      join(process.cwd(), 'src', 'components', 'document', 'BrowseToolbarMenu.tsx'),
      'utf8',
    );
    expect(toolbar).toContain('browse-enter-selection');
    expect(grid).toContain('browse-selection-bar');
    expect(grid).toContain('enterSelection(');

    const card = readFileSync(
      join(process.cwd(), 'src', 'components', 'document', 'DocumentCard.tsx'),
      'utf8',
    );
    expect(card).toContain('selectable');
    expect(card).toContain('onToggleSelect');
  });
});
