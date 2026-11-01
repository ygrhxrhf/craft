import { describe, expect, it } from 'vitest';

import { hasHeaderContent,
  CELL_BREAK_PLACEHOLDER,
  hideCellBreaks,
  isAlignmentRow,
  prepareCell,
  restoreCellBreaks,
  splitRow,
  trimTrailingNewline,
} from './table';

/**
 * Table import (G1240). The alignment row is recognised by "nothing but hyphens", not by colon
 * markers; a cell's `<br>` makes a round trip through a placeholder; and one trailing newline is
 * dropped from the cell body.
 */
describe('splitting a row', () => {
  it('drops the outer pipes and trims each cell', () => {
    expect(splitRow('| a | b | c |')).toEqual(['a', 'b', 'c']);
  });

  it('keeps an escaped pipe inside a cell', () => {
    expect(splitRow('| a \\| b | c |')).toEqual(['a | b', 'c']);
  });

  it('keeps empty cells', () => {
    expect(splitRow('| a |  | c |')).toEqual(['a', '', 'c']);
  });
});

describe('recognising the alignment row', () => {
  it('drops a row of nothing but hyphens', () => {
    expect(isAlignmentRow(['---', '---', '---'])).toBe(true);
    expect(isAlignmentRow(['-----', '---', '------'])).toBe(true);
  });

  it('does not treat a colon marker as alignment, because only hyphens are stripped', () => {
    // The official filter removes hyphens and nothing else, so `:---` survives it and the row is
    // kept — the ledger's "not by colon markers" reading.
    expect(isAlignmentRow([':---', '---:', ':---:'])).toBe(false);
  });

  it('keeps a row whose cells have content', () => {
    expect(isAlignmentRow(['a', '---', '---'])).toBe(false);
  });

  it('counts an already-empty cell as satisfying the test', () => {
    // The official filter keeps a cell that was blank to begin with.
    expect(isAlignmentRow(['---', '', '---'])).toBe(true);
  });
});

describe('the cell break round trip', () => {
  it('hides a <br> behind the placeholder and restores it', () => {
    const cell = 'line one<br>line two';
    const hidden = hideCellBreaks(cell);
    expect(hidden).toContain(CELL_BREAK_PLACEHOLDER);
    expect(hidden).not.toContain('<br>');
    expect(restoreCellBreaks(hidden)).toBe('line one\nline two');
  });

  it('accepts the self-closing form too', () => {
    expect(restoreCellBreaks(hideCellBreaks('a<br/>b'))).toBe('a\nb');
  });
});

describe('trimming the cell body', () => {
  it('drops one trailing CRLF pair', () => {
    expect(trimTrailingNewline('body\r\n')).toBe('body');
  });

  it('drops a single LF', () => {
    expect(trimTrailingNewline('body\n')).toBe('body');
  });

  it('leaves a body without a trailing newline alone', () => {
    expect(trimTrailingNewline('body')).toBe('body');
  });
});

describe('the full cell pipeline', () => {
  it('hides, restores and trims in one step', () => {
    expect(prepareCell('a<br>b\r\n')).toBe('a\nb');
    expect(prepareCell('plain')).toBe('plain');
  });
});

// G1240: the header row is dropped when it has no non-blank cell.
describe('table header handling', () => {
  it('keeps a header row that has content', () => {
    expect(hasHeaderContent(['A', 'B'])).toBe(true);
    expect(hasHeaderContent(['A', ''])).toBe(true);
  });

  it('drops a header row that is entirely blank', () => {
    expect(hasHeaderContent(['', '  '])).toBe(false);
    expect(hasHeaderContent([])).toBe(false);
  });
});
