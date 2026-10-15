import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * G358: the official markdown input table (`uF`) allows **leading whitespace** on every entry
 * (`keyboard.md` §20.14.6, pattern `^\s*`), so `  [] ` must convert to a task block just as `[] `
 * does. The editor's input rule is a TipTap `InputRule` over live editor state, which this suite
 * cannot mount, so the pattern is pinned statically — the same move the other wiring gates make.
 */
const source = readFileSync(
  join(process.cwd(), 'src/components/editor/extensions/markdown-shortcuts.ts'),
  'utf8',
);

describe('the task input rule', () => {
  it('allows leading whitespace, as the official pattern does', () => {
    expect(source).toContain('find: /^\\s*\\[([ xX])\\]\\s$/');
  });

  it('does not anchor strictly at the paragraph start', () => {
    expect(source).not.toContain('find: /^\\[([ xX])\\]\\s$/');
  });

  it('still refuses to fire outside a top-level paragraph', () => {
    expect(source).toContain("$at.depth !== 1 || $at.parent.type.name !== 'paragraph'");
  });
});
