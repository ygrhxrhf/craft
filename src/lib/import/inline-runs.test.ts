import { describe, expect, it } from 'vitest';

import { TEX_SCHEME_PREFIX, breakKindOf, breakRun, codeRun, mathFromLink, mathRun } from './inline-runs';

// G1238: inline math/code are run decorations, not node types; math rides a tex:// link.
describe('inline runs', () => {
  it('carries LaTeX in a tex:// link', () => {
    const run = mathRun([3, 8], 'x^2');
    expect(run).toEqual({ range: [3, 8], linkURL: 'tex://x^2' });
    expect(mathFromLink(run.linkURL)).toBe('x^2');
  });

  it('marks inline code with the code flag', () => {
    expect(codeRun([0, 4])).toEqual({ range: [0, 4], isCode: true });
  });

  it('reads a non-tex link as not-math', () => {
    expect(mathFromLink('https://example.com')).toBeNull();
    expect(mathFromLink(null)).toBeNull();
  });

  it('cannot tell a soft break from a hard break after import', () => {
    expect(breakRun([5, 6])).toEqual({ range: [5, 6] });
    expect(breakKindOf(breakRun([5, 6]))).toBe('break');
    expect(TEX_SCHEME_PREFIX).toBe('tex://');
  });
});
