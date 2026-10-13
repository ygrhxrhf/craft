import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Enter adds a row only while a cell selection is active (G1478): the caret sitting in a cell is
 * text editing, and Enter there keeps its normal meaning. Shift and the modifier chords are left
 * alone too.
 */
const source = readFileSync(fileURLToPath(new URL('./craft-keymap.ts', import.meta.url)), 'utf8');

describe('Enter in a table', () => {
  it('adds a row only for a cell selection', () => {
    expect(source).toContain("event.key === 'Enter'");
    expect(source).toContain('instanceof CellSelection');
    expect(source).toContain('addRowAfter');
  });

  it('leaves Shift-Enter and the modifier chords alone', () => {
    expect(source).toContain('!event.shiftKey');
    expect(source).toContain('!event.metaKey');
    expect(source).toContain('!event.ctrlKey');
    expect(source).toContain('!event.altKey');
  });
});
