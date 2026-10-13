import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Enter inside a table adds a row (G1478) rather than splitting the cell. Shift-Enter is left
 * alone so a line break inside a cell still works.
 */
const source = readFileSync(fileURLToPath(new URL('./craft-keymap.ts', import.meta.url)), 'utf8');

describe('Enter in a table', () => {
  it('adds a row below when the caret is in a cell', () => {
    expect(source).toContain("event.key === 'Enter'");
    expect(source).toContain('addRowAfter');
    expect(source).toContain("name === 'tableCell' || name === 'tableHeader'");
  });

  it('leaves Shift-Enter to the cell', () => {
    expect(source).toContain('!event.shiftKey');
  });
});
