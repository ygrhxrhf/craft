import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CRAFTDARK, CRAFTLIGHT, resolveCodeTheme } from './code-themes';

/**
 * The code-theme wiring (G1093 / G1108). The roster is only real once a block can pick from it
 * and the pick reaches the surface; the surface itself is resolved through `resolveCodeTheme`,
 * which reads the app's light/dark state for `auto`.
 */
const view = readFileSync(
  fileURLToPath(new URL('../../components/editor/extensions/code-block-view.tsx', import.meta.url)),
  'utf8',
);
const editor = readFileSync(
  fileURLToPath(new URL('../../components/editor/Editor.tsx', import.meta.url)),
  'utf8',
);

describe('the block carries a theme', () => {
  it('gives the node a themeId attribute with the auto default', () => {
    expect(editor).toContain("default: 'auto'");
    expect(editor).toContain("'data-theme-id': attributes.themeId");
  });

  it('offers the roster in a selector', () => {
    expect(view).toContain('CODE_THEMES.map');
    expect(view).toContain('updateAttributes({ themeId: e.target.value })');
    expect(view).toContain('aria-label="代码主题"');
  });

  it('paints the surface from the resolved palette', () => {
    expect(view).toContain('resolveCodeTheme(themeId, isDark)');
    expect(view).toContain('background: surface.background');
    expect(view).toContain('color: surface.foreground');
  });

  it('reads the app light/dark state for auto', () => {
    expect(view).toContain("classList.contains('dark')");
    // And the resolution itself is the roster's job, already covered — re-assert the mapping here.
    expect(resolveCodeTheme('auto', false)).toBe(CRAFTLIGHT);
    expect(resolveCodeTheme('auto', true)).toBe(CRAFTDARK);
  });
});
