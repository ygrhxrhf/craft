import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { applyKeymapAction } = await import('./craft-keymap');
const { useCommentRequestStore } = await import('@/lib/store/use-comment-request-store');
const { useTitleRequestStore } = await import('@/lib/store/use-title-request-store');

function fakeEditor(text: string, childCount = 1, blockSelected = false) {
  return {
    state: {
      doc: {
        childCount,
        content: { size: 10 },
        child: () => ({ nodeSize: 10, textContent: text }),
      },
      // RENAME only fires on a selected block; a bare text caret leaves the key to the editor.
      selection: blockSelected ? { from: 1, node: { type: 'paragraph' } } : { from: 1 },
    },
  } as any;
}

beforeEach(() => {
  useCommentRequestStore.getState().clear();
  useCommentRequestStore.setState({ request: 0 });
  useTitleRequestStore.setState({ request: 0 });
});

describe('G14 RENAME / COMMENT wiring', () => {
  it('COMMENT asks the composer for the top-level block text', () => {
    expect(applyKeymapAction(fakeEditor('ALPHA'), 'COMMENT')).toBe(true);
    const state = useCommentRequestStore.getState();
    expect(state.request).toBe(1);
    expect(state.blockText).toBe('ALPHA');
  });

  it('COMMENT returns false when there is no top-level block', () => {
    expect(applyKeymapAction(fakeEditor('', 0), 'COMMENT')).toBe(false);
    expect(useCommentRequestStore.getState().request).toBe(0);
  });

  it('RENAME focuses the document title when a block is selected', () => {
    const querySelector = vi.fn(() => ({}));
    vi.stubGlobal('document', { querySelector });
    expect(applyKeymapAction(fakeEditor('ALPHA', 1, true), 'RENAME')).toBe(true);
    expect(querySelector).toHaveBeenCalledWith('[data-document-title]');
    expect(useTitleRequestStore.getState().request).toBe(1);
    vi.unstubAllGlobals();
  });

  it('RENAME leaves Shift-Enter inert with a plain text caret (G615)', () => {
    const querySelector = vi.fn(() => ({}));
    vi.stubGlobal('document', { querySelector });
    expect(applyKeymapAction(fakeEditor('ALPHA'), 'RENAME')).toBe(false);
    expect(querySelector).not.toHaveBeenCalled();
    expect(useTitleRequestStore.getState().request).toBe(0);
    vi.unstubAllGlobals();
  });

  it('RENAME returns false when the title is not rendered', () => {
    vi.stubGlobal('document', { querySelector: () => null });
    expect(applyKeymapAction(fakeEditor('ALPHA', 1, true), 'RENAME')).toBe(false);
    expect(useTitleRequestStore.getState().request).toBe(0);
    vi.unstubAllGlobals();
  });
});

/**
 * G628: the two block-level Backspace arms that were still falling through to ProseMirror —
 * "no previous sibling + empty ⇒ delete self" and "previous sibling is not text ⇒ delete self and
 * select it". Reading the file is the gate: the decision itself is unit-tested in
 * `format-downgrade.test.ts`, but only the branch here makes it happen in a real editor.
 */
describe('G628 block-level Backspace arms', () => {
  const source = readFileSync(new URL('./craft-keymap.ts', import.meta.url), 'utf8');

  it('takes the previous block from the sibling list, not the flattened document order', () => {
    expect(source).toContain('const { container, index, siblings } = siblingContext($from)');
    expect(source).toContain('hasPrevious: index > 0');
    expect(source).toContain('previous: previousSibling(siblings, index)');
    expect(source).not.toContain('previousBlockInfo(');
  });

  it('drives delete-self by deleting the block inside its own container', () => {
    expect(source).toContain("if (step === 'delete-self')");
    expect(source).toContain('const self = container.child(0)');
    expect(source).not.toContain("$from.depth !== 1 || index !== 0");
  });

  it('deletes the block and selects the non-text previous sibling', () => {
    expect(source).toContain("if (step === 'select-previous' && index > 0)");
    expect(source).toContain('NodeSelection.create(tr.doc, start - prev.nodeSize)');
  });
});

/**
 * G901/G896/G1026: three list-level key behaviours. G901 (leaving a task row via Backspace) and
 * G896 (Enter splitting a task row into a same-type sibling) both hinge on recognising `taskItem`
 * as a list item; G1026 needs the move transaction to carry its own history boundary.
 */
describe('G901/G896/G1026 list and move key wiring', () => {
  // The file is CRLF; normalize so multi-line assertions can use plain \n.
  const source = readFileSync(new URL('./craft-keymap.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

  it('counts task rows as list items (G901)', () => {
    expect(source).toContain("name === 'listItem' || name === 'taskItem'");
  });

  it('leaves a task row through its own list type on an empty Enter (G901)', () => {
    expect(source).toContain("if (editor.isActive('taskList')) {\n                    editor.chain().focus().liftListItem('taskItem').run();");
  });

  it('splits a list row into a same-type sibling instead of a paragraph (G896)', () => {
    expect(source).toContain("editor.isActive('taskList')\n                  ? editor.chain().focus().splitListItem('taskItem').run()");
    expect(source).toContain("editor.isActive('listItem')\n                    ? editor.chain().focus().splitListItem('listItem').run()");
    expect(source).toContain('.splitBlock().run();');
  });

  it('closes the history group around a keyboard block move (G1026)', () => {
    expect(source).toContain('editor.view.dispatch(closeHistory(tr));');
    expect(source).not.toContain('editor.view.dispatch(tr);');
  });
});
