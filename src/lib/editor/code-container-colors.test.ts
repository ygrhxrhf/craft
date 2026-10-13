import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CRAFTDARK, CRAFTLIGHT } from './code-themes';

/**
 * The code container colours (G1093 / G1108). The two craft palettes carry more than a
 * foreground/background pair — a selection, a line highlight, a gutter, and (only in dark) a
 * caret and a gutter border. These are the variables a theme switch actually moves.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
/** The palette constants and the stylesheet may space `rgba(...)` differently; normalise both. */
const flat = css.replace(/\s+/g, ' ').replace(/,\s+/g, ',');

describe('the code container variables match the craft palettes', () => {
  it('writes craftlight verbatim', () => {
    expect(flat).toContain(`--code-background: ${CRAFTLIGHT.background};`);
    expect(flat).toContain(`--code-foreground: ${CRAFTLIGHT.foreground};`);
    expect(flat).toContain(`--code-selection: ${CRAFTLIGHT.selection};`);
    expect(flat).toContain(`--code-line-highlight: ${CRAFTLIGHT.lineHighlight};`);
    expect(flat).toContain(`--code-gutter-foreground: ${CRAFTLIGHT.gutterForeground};`);
  });

  it('writes craftdark verbatim, caret and gutter border included', () => {
    expect(flat).toContain(`--code-background: ${CRAFTDARK.background};`);
    expect(flat).toContain(`--code-caret: ${CRAFTDARK.caret};`);
    expect(flat).toContain(`--code-selection: ${CRAFTDARK.selection};`);
    expect(flat).toContain(`--code-gutter-border: ${CRAFTDARK.gutterBorder};`);
  });

  it('leaves the light palette without a caret, as the official one has none', () => {
    expect(CRAFTLIGHT.caret).toBeUndefined();
    // The light block runs from its background to its comment line; no caret is invented there.
    const start = css.indexOf('--code-background: #FBFBFB');
    const end = css.indexOf('--code-comment: #6a737d', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(css.slice(start, end)).not.toContain('--code-caret');
  });
});
