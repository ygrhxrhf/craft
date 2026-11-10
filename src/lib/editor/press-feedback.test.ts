import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Press feedback (G1063, `styles.md §十二.九`). Three shapes coexist in the official build:
 *
 * ① the action component darkens its foreground-surface variants on `:active`, inside a
 *    `@media (pointer: fine)` block (a mouse-only press);
 * ② the DS button family has no `:active` rule of its own;
 * ③ a global touch rule, gated on the intent attribute — press shrinks 1% and drops to 75%
 *    opacity, the resting rule pins `scale(1)` so the control springs back, and
 *    `.noPressFeedback` is the only exemption;
 * ④ six miscellaneous one-offs: close / toggle buttons at `--foreground-150`, the scrollbar
 *    thumb at `--scrollbar-thumb-active`, and link previews at `opacity: .91`.
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

  it('keys the touch rule on the intent attribute, outside any pointer media query', () => {
    // The intent attribute is what lets the keyboard/mouse/touch states differ. The touch block
    // must not be nested in a `@media (pointer: ...)` query — that is the official gate.
    const fineStart = flat.indexOf('@media (pointer: fine)');
    const touchStart = flat.indexOf("[data-whatintent='touch']");
    expect(touchStart).toBeGreaterThan(-1);
    if (fineStart !== -1) {
      const fineEnd = flat.indexOf('}', flat.indexOf('}', fineStart) + 1) + 1;
      expect(touchStart > fineEnd || touchStart < fineStart).toBe(true);
    }
  });

  it('keeps exactly one exemption hatch, on both touch rules', () => {
    expect(css.match(/:not\(\.noPressFeedback\)/g)).toHaveLength(2);
  });
});

describe('the mouse press darkens the foreground-surface variants only', () => {
  it('pins the four variants to --foreground-200 inside the fine-pointer query', () => {
    expect(ruleBody('@media (pointer: fine)')).toContain(
      "background: var(--foreground-200)",
    );
    for (const variant of ['outline', 'secondary', 'ghost', 'active']) {
      expect(flat).toContain(
        `[data-slot='button'][data-variant='${variant}']:not([data-static]):not([data-disabled]):not(:disabled):active`,
      );
    }
  });

  it('does not darken the filled CTA, which carries its own colour', () => {
    expect(flat).not.toContain(`data-variant='default']:not([data-static]):not([data-disabled]):not(:disabled):active`);
  });
});

describe('the miscellaneous press rules land on their local carriers', () => {
  it('darkens close and toggle buttons to --foreground-150', () => {
    expect(ruleBody("[data-slot='dialog-close']:active,")).toBe(
      'background: var(--foreground-150);',
    );
    expect(flat).toContain("[data-slot='sheet-close']:active");
    expect(flat).toContain("[data-slot='toggle']:active");
  });

  it('gives the scrollbar thumb the official active token', () => {
    expect(ruleBody("[data-slot='scroll-area-thumb']:active {")).toBe(
      'background: var(--scrollbar-thumb-active, var(--foreground-500));',
    );
  });

  it('drops a pressed link preview to .91 opacity without scaling it', () => {
    expect(ruleBody("[data-type='link-preview'] a:active {")).toBe('opacity: 0.91;');
  });
});

describe('the disabled and static gates are global (G1014)', () => {
  it('gives every disabled control one global opacity rule, no per-component class', () => {
    expect(ruleBody('[data-disabled] {')).toBe('opacity: 0.4; cursor: default;');
  });

  it('leaves static text with the default cursor and no state styling', () => {
    expect(ruleBody('[data-static] {')).toBe('cursor: default;');
    // Every state rule that could fire on a static control must exclude it.
    for (const probe of [
      "[data-whatintent='keyboard'] :focus:not([data-static]):not([data-disabled])",
      "[data-whatintent='keyboard'] [data-slot='button']:focus:not([data-static]):not([data-disabled])",
      "[data-whatintent='keyboard'] [role='tab']:focus:not([data-static]):not([data-disabled])",
    ]) {
      expect(flat).toContain(probe);
    }
  });

  it('never attaches a hover tint to a static or disabled control', () => {
    expect(css).toContain('&:hover:not([data-static]):not([data-disabled])');
  });
});
