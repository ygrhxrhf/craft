import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The code block geometry (G1176). The official surface forces a 24px line at 14px type, and the
 * gutter keeps a 36.8px floor. The theme layer picks colours; this layer picks geometry, so the
 * two are independent of which theme is selected.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const view = readFileSync(
  fileURLToPath(new URL('../../components/editor/extensions/code-block-view.tsx', import.meta.url)),
  'utf8',
);

describe('the code surface geometry', () => {
  it('sets 14px type on a 24px line', () => {
    const at = css.indexOf('pre {');
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('font-size: 14px;');
    expect(body).toContain('line-height: 24px;');
  });

  it('does not fall back to a unitless ratio for the code surface', () => {
    const at = css.indexOf('pre {');
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).not.toContain('line-height: 1.6;');
  });

  it('keeps the block on the mono face', () => {
    expect(view).toContain('font-mono');
  });
});
