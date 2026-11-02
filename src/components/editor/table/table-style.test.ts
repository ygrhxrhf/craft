import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * 隔行颜色 paints even body rows of a table that opted in, and leaves the header row alone.
 */
describe('the alternating rows', () => {
  const css = readFileSync(new URL('../../../app/globals.css', import.meta.url), 'utf8');

  it('colours even rows of a table that asked for it', () => {
    // G510: the attribute now carries a theme colour id, so the rule keys on presence.
    expect(css).toContain('table[data-alternating] tr:nth-child(even) td');
  });

  it('paints body cells and not header cells', () => {
    const rule = css.slice(css.indexOf('table[data-alternating]'));
    const selector = rule.slice(0, rule.indexOf('{'));
    expect(selector).toContain(' td');
    expect(selector).not.toContain(' th');
  });

  it('takes the colour from the table attribute rather than a fixed value', () => {
    const rule = css.slice(css.indexOf('table[data-alternating]'));
    expect(rule).toContain('var(--alt-row-bg');
  });
});
