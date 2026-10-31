import { Extension } from '@tiptap/react';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { ANCHORABLE_TYPES } from '@/lib/search/anchors';

const BLOCK_ID_STAMP = 'blockIdStamp';
const ANCHORABLE = new Set(ANCHORABLE_TYPES);

/**
 * G32: every anchorable block carries a `blockId` from the moment the document
 * opens, not only after someone jumps to it. Existing ids are preserved.
 */
export function stampMissingBlockIds(state: EditorState): Transaction | null {
  const tr = state.tr;
  let changed = false;

  state.doc.descendants((node, pos) => {
    if (!ANCHORABLE.has(node.type.name)) return true;
    if (typeof node.attrs.blockId === 'string' && node.attrs.blockId) return true;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: crypto.randomUUID() });
    changed = true;
    return true;
  });

  if (!changed) return null;
  return tr.setMeta(BLOCK_ID_STAMP, true);
}

export const BlockId = Extension.create({
  name: 'blockId',

  addGlobalAttributes() {
    return [
      {
        types: ANCHORABLE_TYPES,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) =>
              attributes.blockId ? { 'data-block-id': attributes.blockId } : {},
          },
        },
      },
    ];
  },

  onCreate() {
    const tr = stampMissingBlockIds(this.editor.state);
    if (tr) this.editor.view.dispatch(tr);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockIdStamp'),
        appendTransaction(transactions, _oldState, newState) {
          if (transactions.some((transaction) => transaction.getMeta(BLOCK_ID_STAMP))) return null;
          return stampMissingBlockIds(newState);
        },
      }),
    ];
  },
});
