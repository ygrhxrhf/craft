import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The focus layer (G1064 / G1110). The official build draws focus with `outline` inside the
 * keyboard gate, not with the browser's `:focus-visible`, and three offsets coexist: the general
 * rule protrudes 1.5px, a control that is itself the focusable target tucks in at -1px, and a
 * compact tab at 2px/-2px. The editor body deliberately draws nothing.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const flat = css.replace(/\s+/g, ' ');

/** The declarations of the first rule whose selector contains `fragment`. */
function ruleBody(fragment: string): string | null {
  const start = flat.indexOf(fragment);
  if (start === -1) return null;
  const open = flat.indexOf('{', start);
  const close = flat.indexOf('}', open);
  return flat.slice(open + 1, close).trim();
}

describe('the focus ring is drawn with outline inside the keyboard gate', () => {
  it('gives the general rule a 1px ring at a 1.5px offset', () => {
    expect(ruleBody("[data-whatintent='keyboard'] :focus {")).toBe(
      'outline: 1px solid var(--craft-accent); outline-offset: 1.5px;',
    );
  });

  it('tucks the ring inside a control that is itself the focus target', () => {
    expect(ruleBody("[data-whatintent='keyboard'] [data-slot='button']:focus")).toContain(
      'outline-offset: -1px',
    );
  });

  it('gives the tab strip its own 2px ring at a -2px offset', () => {
    expect(ruleBody("[data-whatintent='keyboard'] [role='tab']:focus")).toBe(
      'outline: 2px solid var(--craft-accent); outline-offset: -2px;',
    );
  });

  it('removes the ring from the editor body, which holds focus by design', () => {
    expect(ruleBody("[data-whatintent='keyboard'] [contenteditable='true']:focus")).toBe(
      'outline: none;',
    );
  });

  it('gates on the intent attribute, which the compiled CSS uses', () => {
    expect(css).toContain("[data-whatintent='keyboard']");
  });
});
