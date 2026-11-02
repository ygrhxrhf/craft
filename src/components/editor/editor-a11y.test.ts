import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G1562: the editable region must read as a multiline textbox, not a generic node. */
describe('editor accessibility role (G1562)', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'components', 'editor', 'Editor.tsx'), 'utf8');

  it('sets role=textbox and aria-multiline on the ProseMirror root', () => {
    expect(source).toMatch(/role:\s*'textbox'/);
    expect(source).toMatch(/'aria-multiline':\s*'true'/);
  });
});
