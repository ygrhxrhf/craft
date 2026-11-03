import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { tableAxisForShortcut } from './table-shortcuts';

// G1576/G1577: the three measured table keys.
describe('table shortcut axes (G1576/G1577)', () => {
  it('maps Ctrl-Enter to a row and Shift/Alt variants to a column', () => {
    expect(tableAxisForShortcut({ key: 'Enter', ctrlKey: true })).toBe('row');
    expect(tableAxisForShortcut({ key: 'Enter', metaKey: true })).toBe('row');
    expect(tableAxisForShortcut({ key: 'Enter', ctrlKey: true, shiftKey: true })).toBe('column');
    expect(tableAxisForShortcut({ key: 'Enter', ctrlKey: true, altKey: true })).toBe('column-before');
  });

  it('ignores other keys and modifier-free Enter', () => {
    expect(tableAxisForShortcut({ key: 'Enter' })).toBeNull();
    expect(tableAxisForShortcut({ key: 'a', ctrlKey: true })).toBeNull();
  });

  it('is wired into the editor keymap', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'craft-keymap.ts'),
      'utf8',
    );
    expect(source).toContain('tableAxisForShortcut');
    expect(source).toContain('addRowAfter');
    expect(source).toContain('addColumnAfter');
    expect(source).toContain('addColumnBefore');
  });

  // G1620: the measured Ctrl-⌫ inside a cell is "clear the cell", not "delete the row".
  it('binds Mod-Backspace in a table cell to clearing the cell', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'craft-keymap.ts'),
      'utf8',
    );
    expect(source).toContain("event.key === 'Backspace'");
    expect(source).toContain('(event.metaKey || event.ctrlKey)');
    expect(source).toContain("editor.isActive('table')");
    expect(source).toContain('clearCellContents(editor)');
  });
});
