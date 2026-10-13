import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The overlay shell (G1065). Four variables a caller can override — width, min-width, max-height,
 * search-field size — and a structural rule that asks the shell about its own children: with a
 * header the search field sits in the flow, without one it is lifted to the top and the scroll
 * viewport is padded by the field's height.
 */
const dialog = readFileSync(fileURLToPath(new URL('./dialog.tsx', import.meta.url)), 'utf8');
const command = readFileSync(fileURLToPath(new URL('./command.tsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');

describe('the overlay shell exposes the official four variables', () => {
  it('declares each with its official default', () => {
    expect(dialog).toContain('[--menu-width:auto]');
    expect(dialog).toContain('[--menu-min-width:220px]');
    expect(dialog).toContain('[--menu-max-height:none]');
    expect(dialog).toContain('[--search-field-size:2.5rem]');
  });
});

describe('the search field placement is decided by the shell structure', () => {
  it('marks the search field and the scroll viewport so :has() can find them', () => {
    expect(command).toContain('data-overlay-part="search-field"');
    expect(command).toContain('data-overlay-part="scroll-viewport"');
  });

  it('lifts the field to the top only when there is no header', () => {
    expect(css).toContain(
      "[data-slot='dialog-content']:not(:has([data-slot='dialog-header'])):has([data-overlay-part='search-field']) [data-overlay-part='search-field']",
    );
    expect(css).toContain('position: absolute;');
    expect(css).toContain('top: 0;');
  });

  it('pads the viewport by the field height so the fade covers it', () => {
    expect(css).toContain('padding-block-start: var(--search-field-size);');
    expect(css).toContain('scroll-padding-block-start: var(--search-field-size);');
  });
});
