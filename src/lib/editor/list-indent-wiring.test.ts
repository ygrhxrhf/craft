import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G1546: Tab on a list item keeps stepping the flat indent instead of falling out of the editor. */
describe('list item indent wiring (G1546)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'block-indent.ts'),
    'utf8',
  );

  it('indents the list item textblock level by level', () => {
    expect(source).toMatch(/inList[\s\S]{0,400}clampIndent\(level \+ delta\)/);
    expect(source).toMatch(/delta === -1 && level === 0\) return false/);
  });
});
