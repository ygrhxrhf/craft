import { Extension } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { topLevelIndexOf } from '@/lib/editor/block-move';
import { selectionChromeRanges } from '@/lib/editor/block-selection-chrome';
import { useBlockSelectStore } from '@/lib/store/use-block-select-store';

export const BLOCK_SELECTION_CHROME_KEY = new PluginKey('blockSelectionChrome');

/**
 * The indices that carry chrome: the block-select set when the state is on, otherwise the single
 * node-selected top-level block (a click on the drag handle, `⌘D`'s duplicate, Escape's first
 * rung). Anything else — a caret, a text range, a table cell — renders nothing.
 */
function chromeIndices(doc: PMNode, selection: EditorState['selection']): number[] {
  const store = useBlockSelectStore.getState();
  if (store.active && store.indices.length > 0) return store.indices;
  if (selection instanceof NodeSelection && selection.$from.depth === 0) {
    const index = topLevelIndexOf(doc, selection.from);
    if (index >= 0) return [index];
  }
  return [];
}

/** The per-block badge: a real node, so "selected" is observable in the DOM, not only in CSS. */
function chromeBadge(): HTMLElement {
  const badge = document.createElement('span');
  badge.setAttribute('data-block-selection-chrome', 'badge');
  badge.setAttribute('contenteditable', 'false');
  badge.setAttribute('aria-hidden', 'true');
  badge.className =
    'pointer-events-none ml-1 inline-flex select-none items-center rounded-sm border border-current px-1 align-middle text-[10px] leading-4 text-(--craft-accent) opacity-70';
  badge.textContent = '已选择';
  return badge;
}

/** The decoration set for one editor state. Exported so a test can assert the chrome exists. */
export function buildBlockSelectionChrome(
  doc: PMNode,
  selection: EditorState['selection'],
): DecorationSet {
  const decorations: Decoration[] = [];
  for (const range of selectionChromeRanges(doc, chromeIndices(doc, selection))) {
    decorations.push(
      Decoration.node(range.from, range.to, {
        class: 'block-selection-chrome outline-2 outline-offset-2 outline-(--craft-accent)/50',
        'data-block-selected': 'true',
      }),
    );
    decorations.push(Decoration.widget(range.from, chromeBadge, { side: -1 }));
  }
  return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

/**
 * G618: block selection needs chrome. The local block-select state was invisible — only a
 * `NodeSelection` (ProseMirror's own highlight) or a store flag nobody rendered. Each selected
 * block now gets an outline **and** a badge node, which is what makes the state observable both
 * visually and in the DOM (the official `Ctrl+A` grows the tree by ~14 KB for the same reason).
 */
export const BlockSelectionChrome = Extension.create({
  name: 'blockSelectionChrome',

  addStorage() {
    return { unsubscribe: null as null | (() => void) };
  },

  onCreate() {
    // Decorations are recomputed per transaction, so a store-only change (Escape / Shift-arrow /
    // clear) has to nudge one through or the chrome would lag behind the state.
    this.storage.unsubscribe = useBlockSelectStore.subscribe(() => {
      const view = this.editor.view;
      if (view && !view.isDestroyed) view.dispatch(view.state.tr);
    });
  },

  onDestroy() {
    this.storage.unsubscribe?.();
    this.storage.unsubscribe = null;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: BLOCK_SELECTION_CHROME_KEY,
        state: {
          init: (_config, state) => buildBlockSelectionChrome(state.doc, state.selection),
          apply: (_tr, _previous, _previousState, nextState) =>
            buildBlockSelectionChrome(nextState.doc, nextState.selection),
        },
        props: {
          decorations(state) {
            return BLOCK_SELECTION_CHROME_KEY.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});