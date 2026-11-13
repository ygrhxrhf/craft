import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';

import { applyReplacement, findMatches, type TextSlice } from '@/lib/find/matcher';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';

export const FIND_KEY = new PluginKey('findReplace');

/**
 * Every run of text in the document, positioned the way ProseMirror numbers them: a text node's
 * position is the slot before it, so `from` to `from + text.length` is the node's own range.
 */
function collectSlices(doc: Node): TextSlice[] {
  const slices: TextSlice[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      slices.push({ text: node.text, from: pos, to: pos + node.text.length });
    }
  });
  return slices;
}

/**
 * Recomputed on every state change rather than cached: a document edited while the panel is open
 * would otherwise leave decorations pointing at ranges that no longer exist.
 */
function currentMatches(doc: Node) {
  const { query, mode, caseSensitive, ignoreDiacritics } = useFindReplaceStore.getState();
  const result = findMatches(collectSlices(doc), query, mode, caseSensitive, ignoreDiacritics);
  return { ...result, total: result.matches.length };
}

function inRange(doc: Node, match: { from: number; to: number }): boolean {
  const size = doc.content.size;
  return match.from >= 0 && match.to >= match.from && match.to <= size;
}

/**
 * Writes the computed result back into the store, and reports whether anything actually moved.
 *
 * The return value matters: the panel listens for editor updates and calls `findRefresh`, and a
 * refresh that always wrote a fresh array would keep dispatching meta transactions and never
 * settle. Equal-by-value means "nothing to repaint", so the loop ends.
 *
 * A replacement reaches here through that listener rather than through the command's own read of
 * the document — tiptap dispatches the transaction once the command returns, so `editor.state`
 * inside the command is still the document before the replacement.
 */
function syncStore(doc: Node): boolean {
  const store = useFindReplaceStore.getState();
  const found = currentMatches(doc);
  let current = store.current;
  if (found.total === 0) current = -1;
  else if (current < 0 || current >= found.total) current = 0;

  const unchanged =
    store.matches.length === found.matches.length &&
    store.matches.every((match, index) => {
      const next = found.matches[index];
      return next !== undefined && match.from === next.from && match.to === next.to;
    }) &&
    store.current === current &&
    store.invalid === found.invalid;

  if (unchanged) return false;
  store.setResults({ matches: found.matches, current, invalid: found.invalid });
  return true;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      findRefresh: () => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      findReplaceCurrent: (replacement: string) => ReturnType;
      findReplaceAll: (replacement: string) => ReturnType;
    };
  }
}

export const FindReplace = Extension.create({
  name: 'findReplace',

  addCommands() {
    return {
      findRefresh:
        () =>
        ({ state, dispatch }) => {
          if (dispatch && syncStore(state.doc)) dispatch(state.tr.setMeta(FIND_KEY, true));
          return true;
        },

      findNext:
        () =>
        ({ state, dispatch }) => {
          const store = useFindReplaceStore.getState();
          const found = currentMatches(state.doc);
          if (found.total === 0) {
            store.setResults({ matches: [], current: -1, invalid: found.invalid });
            return false;
          }
          // Wraps: the ledger collected no end-of-list behaviour, and a find that stops at the
          // last hit reads as broken. Register as a local choice, not as an official rule.
          const next = (store.current + 1) % found.total;
          store.setResults({ matches: found.matches, current: next, invalid: found.invalid });
          if (dispatch) {
            const target = found.matches[next];
            const tr = state.tr
              .setMeta(FIND_KEY, true)
              .setSelection(TextSelection.near(state.doc.resolve(target.from)))
              .scrollIntoView();
            dispatch(tr);
          }
          return true;
        },

      findPrevious:
        () =>
        ({ state, dispatch }) => {
          const store = useFindReplaceStore.getState();
          const found = currentMatches(state.doc);
          if (found.total === 0) {
            store.setResults({ matches: [], current: -1, invalid: found.invalid });
            return false;
          }
          const previous = (store.current - 1 + found.total) % found.total;
          store.setResults({ matches: found.matches, current: previous, invalid: found.invalid });
          if (dispatch) {
            const target = found.matches[previous];
            const tr = state.tr
              .setMeta(FIND_KEY, true)
              .setSelection(TextSelection.near(state.doc.resolve(target.from)))
              .scrollIntoView();
            dispatch(tr);
          }
          return true;
        },

      findReplaceCurrent:
        (replacement) =>
        ({ state, dispatch, editor }) => {
          const store = useFindReplaceStore.getState();
          const found = currentMatches(state.doc);
          const index = store.current;
          if (found.total === 0 || index < 0 || index >= found.total) return false;
          const target = found.matches[index];
          if (!inRange(state.doc, target)) return false;
          // A function replacer keeps `$&` and `$1` literal in text mode — they only mean
          // something in regex mode, where `String.replace` is given the pattern instead.
          const value = applyReplacement(
            state.doc.textBetween(target.from, target.to),
            store.query,
            replacement,
            store.mode,
            store.caseSensitive,
            store.ignoreDiacritics,
          );
          if (dispatch) {
            const tr = state.tr.setMeta(FIND_KEY, true).insertText(value, target.from, target.to);
            dispatch(tr);
          }
          syncStore(editor.state.doc);
          return true;
        },

      findReplaceAll:
        (replacement) =>
        ({ state, dispatch, editor }) => {
          const store = useFindReplaceStore.getState();
          const found = currentMatches(state.doc);
          if (found.total === 0) return false;
          if (dispatch) {
            let tr = state.tr.setMeta(FIND_KEY, true);
            // Reverse order so earlier ranges stay valid as later ones shift the document.
            for (const target of [...found.matches].reverse()) {
              if (!inRange(state.doc, target)) continue;
              const value = applyReplacement(
                state.doc.textBetween(target.from, target.to),
                store.query,
                replacement,
                store.mode,
                store.caseSensitive,
                store.ignoreDiacritics,
              );
              tr = tr.insertText(value, target.from, target.to);
            }
            dispatch(tr);
          }
          syncStore(editor.state.doc);
          return true;
        },
    };
  },

  // The four find chords live in `src/lib/editor/keymap.ts` with the rest of the table so that
  // the shortcuts panel cannot describe bindings the editor does not actually have. They are
  // dispatched by `craft-keymap` here, one source instead of two.

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: FIND_KEY,
        props: {
          decorations(state) {
            const { open, current } = useFindReplaceStore.getState();
            if (!open) return DecorationSet.empty;
            const found = currentMatches(state.doc);
            if (found.total === 0) return DecorationSet.empty;
            const decorations = found.matches
              .filter((match) => inRange(state.doc, match))
              .map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === current ? 'find-replace-hit find-replace-current' : 'find-replace-hit',
                }),
              );
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
