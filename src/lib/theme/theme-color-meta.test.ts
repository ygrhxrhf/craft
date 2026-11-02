import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G1223: scheme switches also repaint the browser UI via meta[name=theme-color]. */
describe('theme-color meta (G1223)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'theme', 'ThemeProvider.tsx'),
    'utf8',
  );

  it('creates or updates the meta from the page background', () => {
    expect(source).toContain('meta[name="theme-color"]');
    expect(source).toContain("meta.name = 'theme-color'");
    expect(source).toMatch(/getComputedStyle\(document\.body\)\.backgroundColor/);
    expect(source).toContain('<ThemeColorWriter />');
  });
});
