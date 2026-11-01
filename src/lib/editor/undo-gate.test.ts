import { describe, expect, it } from 'vitest';

import { undoDisposition, undoStepsFor } from './undo-gate';

/**
 * G211: the four measured undo behaviours — focus gating, sub-editor isolation, and input-session
 * coalescing.
 */
describe('the undo focus gate (G211)', () => {
  it('undoes the document when the caret is in the body', () => {
    expect(undoDisposition({ kind: 'document' })).toBe('undo-document');
  });

  it('delegates to a sub-editor rather than undoing the document', () => {
    for (const editor of ['code', 'math', 'mermaid'] as const) {
      expect(undoDisposition({ kind: 'subEditor', editor }), editor).toBe('delegate');
    }
  });

  it('does nothing at all when focus is outside the editor', () => {
    // The measured behaviour: Ctrl+Z pressed seven times with focus elsewhere changed nothing.
    expect(undoDisposition({ kind: 'outside' })).toBe('ignore');
  });
});

describe('undo step counting (G211)', () => {
  it('a typing session is one step however many characters it holds', () => {
    expect(undoStepsFor({ typedCharacters: 26, undoable: true })).toBe(1);
    expect(undoStepsFor({ typedCharacters: 1, undoable: true })).toBe(1);
  });

  it('a structural action is one step', () => {
    expect(undoStepsFor({ typedCharacters: 0, undoable: true })).toBe(1);
  });

  it('a non-undoable action adds no step', () => {
    expect(undoStepsFor({ typedCharacters: 0, undoable: false })).toBe(0);
    expect(undoStepsFor({ typedCharacters: 26, undoable: false })).toBe(0);
  });
});
