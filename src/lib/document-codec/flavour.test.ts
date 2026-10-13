import { describe, expect, it } from 'vitest';

import { DEFAULT_FLAVOUR, indentFor, listMarker } from './flavour';

/**
 * The markdown flavour (G1200). One object, 29 fields, verbatim from the export package. The two
 * that a naive writer gets wrong are the capital `X` in the checked todo marker and the
 * three-space indent.
 */
describe('the default flavour', () => {
  it('has all 29 fields', () => {
    expect(Object.keys(DEFAULT_FLAVOUR)).toHaveLength(29);
  });

  it('uses a capital X for a checked todo', () => {
    expect(DEFAULT_FLAVOUR.todoListStyleChecked).toBe('- [X] ');
    expect(DEFAULT_FLAVOUR.todoListStyleUnchecked).toBe('- [ ] ');
  });

  it('indents with three spaces, not a tab or two', () => {
    expect(DEFAULT_FLAVOUR.indentationCharacters).toBe('   ');
    expect(DEFAULT_FLAVOUR.indentationCharacters).toHaveLength(3);
  });

  it('carries the block prefixes the exporter writes', () => {
    expect(DEFAULT_FLAVOUR.title).toBe('# ');
    expect(DEFAULT_FLAVOUR.subtitle).toBe('## ');
    expect(DEFAULT_FLAVOUR.heading).toBe('### ');
    expect(DEFAULT_FLAVOUR.pageCard).toBe('#### ');
    expect(DEFAULT_FLAVOUR.focus).toBe('> ');
    expect(DEFAULT_FLAVOUR.block).toBe('> ');
  });

  it('carries the four list markers', () => {
    expect(DEFAULT_FLAVOUR.bulletListStyle).toBe('- ');
    expect(DEFAULT_FLAVOUR.toggleListStyle).toBe('+ ');
    expect(DEFAULT_FLAVOUR.numberedListStyle).toBe('{number}. ');
  });

  it('carries the inline markers, highlight included', () => {
    expect(DEFAULT_FLAVOUR.bold).toBe('**');
    expect(DEFAULT_FLAVOUR.italic).toBe('*');
    expect(DEFAULT_FLAVOUR.strikethrough).toBe('~~');
    expect(DEFAULT_FLAVOUR.code).toBe('`');
    expect(DEFAULT_FLAVOUR.highlight).toBe('::');
  });

  it('carries the four boolean switches verbatim', () => {
    expect(DEFAULT_FLAVOUR.fixListOrders).toBe(true);
    expect(DEFAULT_FLAVOUR.fixIndentationLevel).toBe(false);
    expect(DEFAULT_FLAVOUR.artificialNewLines).toBe(false);
    expect(DEFAULT_FLAVOUR.base64Assets).toBe(false);
  });
});

describe('the flavour helpers', () => {
  it('reads a list marker off the flavour', () => {
    expect(listMarker(DEFAULT_FLAVOUR, 'bullet')).toBe('- ');
    expect(listMarker(DEFAULT_FLAVOUR, 'toggle')).toBe('+ ');
    expect(listMarker(DEFAULT_FLAVOUR, 'todo')).toBe('- [ ] ');
    expect(listMarker(DEFAULT_FLAVOUR, 'numbered')).toBe('{number}. ');
  });

  it('builds one indent level per depth, at three spaces', () => {
    expect(indentFor(DEFAULT_FLAVOUR, 0)).toBe('');
    expect(indentFor(DEFAULT_FLAVOUR, 1)).toBe('   ');
    expect(indentFor(DEFAULT_FLAVOUR, 2)).toBe('      ');
  });
});
