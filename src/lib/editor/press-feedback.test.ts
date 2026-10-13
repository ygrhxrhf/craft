import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The touch press feedback (G1063, `styles.md §十二.九`): the official build has exactly one
 * global press rule and it is gated on the intent attribute, not on a media query. Press shrinks
 * 1% and drops to 75% opacity; the resting rule pins `scale(1)` so the control springs back, and
 * `.noPressFeedback` is the only exemption.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
/** The file wraps long selectors across lines; collapse whitespace so a selector is one string. */
const flat = css.replace(/\s+/g, ' ');

/** The rule body for a selector, whitespace collapsed so the assertions read like the ledger. */
function ruleBody(fragment: string): string | null {
  const start = flat.indexOf(fragment);
  if (start === -1) return null;
  const open = flat.indexOf('{', start);
  const close = flat.indexOf('}', open);
  return flat.slice(open + 1, close).trim();
}

const SELECTOR =
  "[data-whatintent='touch'] :where(button, a[href], [role='button'], [role='option'], [role='menuitem'], [role='tab'], [data-interactive]):not(.noPressFeedback)";

describe('the touch press feedback is gated on the intent attribute', () => {
  it('pins the resting state so the control springs back', () => {
    expect(ruleBody(`${SELECTOR} {`)).toBe(
      'transform: scale(1); opacity: 1; will-change: transform, opacity; transition-property: transform, opacity !important; transition-duration: 0.2s !important; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;',
    );
  });

  it('presses to scale(.99) and 75% opacity', () => {
    expect(ruleBody(`${SELECTOR}:active {`)).toBe('transform: scale(0.99); opacity: 0.75;');
  });

  it('keys on the intent attribute, so a mouse press never scales', () => {
    // A `@media (pointer: fine)` variant would be the wrong gate: the official rule is an
    // attribute selector, which is what lets the keyboard/mouse/touch states differ.
    expect(css).toContain("[data-whatintent='touch']");
    expect(css).not.toContain('pointer: fine');
  });

  it('keeps exactly one exemption hatch, on both rules', () => {
    expect(css.match(/:not\(\.noPressFeedback\)/g)).toHaveLength(2);
  });
});
