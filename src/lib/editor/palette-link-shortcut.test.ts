import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G1580 / G1586: Ctrl-Shift-K must not open the palette; plain Ctrl-K over a selection is a link. */
describe('palette vs link shortcut (G1580/G1586)', () => {
  const palette = readFileSync(
    join(process.cwd(), 'src', 'components', 'search', 'CommandPalette.tsx'),
    'utf8',
  );
  const keymap = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'craft-keymap.ts'),
    'utf8',
  );

  it('ignores modified Ctrl-K in the palette', () => {
    expect(palette).toMatch(/!e\.shiftKey && !e\.altKey && e\.key\.toLowerCase\(\) === 'k'/);
  });

  it('turns Ctrl-K over a selection into a link', () => {
    expect(keymap).toContain("setLink({ href: href.trim() })");
    expect(keymap).toMatch(/from !== to[\s\S]{0,200}stopPropagation/);
  });
});
