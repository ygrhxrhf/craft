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

describe('the #### rule (G1557)', () => {
  it('turns "#### " into bold text instead of a fourth-level heading', () => {
    expect(source).toContain('find: /^####\\s$/');
    expect(source).toContain("state.schema.marks.bold.create()");
    expect(source).toContain('tr.addStoredMark(');
  });

  it('keeps the #### entry ahead of the generated heading rule', () => {
    // Level 4 is in the schema because `Ctrl-Shift-4` (the Strong slot) needs it, so Heading's own
    // `/^####\s$/` rule exists too — this extension has to win it.
    const editor = readFileSync(
      join(process.cwd(), 'src/components/editor/Editor.tsx'),
      'utf8',
    );
    expect(editor).toContain('levels: [1, 2, 3, 4],');
    expect(editor).toContain("'linkPreview', 'heading']");
    expect(source).toContain('priority: 1000,');
  });
});

/**
 * G1558: inline marks convert on the trailing space. TipTap 3 has no per-extension rule switch —
 * `enableInputRules` is an allowlist of extension names — so the five StarterKit mark extensions have
 * to be absent from it, and every other rule provider in the editor has to be present or its
 * markdown entry would silently stop working.
 */
describe('the inline marks are space-triggered (G1558)', () => {
  const editor = readFileSync(join(process.cwd(), 'src/components/editor/Editor.tsx'), 'utf8');
  const allowlist = editor.slice(
    editor.indexOf('enableInputRules: ['),
    editor.indexOf(']', editor.indexOf('enableInputRules: [')),
  );

  it('builds its rules from the shared rule table', () => {
    expect(source).toContain("from '@/lib/editor/markdown-mark-rules'");
    expect(source).toContain('for (const rule of SPACE_MARK_RULES)');
    expect(source).not.toContain('schema.marks.strikethrough');
  });

  it('drops the five mark extensions from the allowlist', () => {
    for (const mark of ['bold', 'italic', 'code', 'strike', 'highlight']) {
      expect(allowlist, `${mark} would keep its marker-triggered rule`).not.toContain(`'${mark}'`);
    }
  });

  it('keeps every other rule provider named in the allowlist', () => {
    for (const name of [
      'markdownShortcuts',
      'heading',
      'bulletList',
      'orderedList',
      'blockquote',
      'taskItem',
      'codeBlock',
      'divider',
      'typography',
      'link',
    ]) {
      expect(allowlist, `missing ${name}`).toContain(`'${name}'`);
    }
  });
});
