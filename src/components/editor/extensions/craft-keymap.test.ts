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
