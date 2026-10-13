import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const BLOCK_EMOJI_KEY = new PluginKey('blockEmoji');

/**
 * The emoji a block carries (G1470's 添加表情). It is one attribute on every top-level block and a
 * widget in front of the block, so it shows without each block type knowing about it.
 */
export const BlockEmoji = Extension.create({
  name: 'blockEmoji',

  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'codeBlock',
          'blockquote',
          'bulletList',
          'orderedList',
          'taskList',
          'callout',
          'toggleBlock',
        ],
        attributes: {
          emoji: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-emoji'),
            renderHTML: (attributes) => (attributes.emoji ? { 'data-emoji': attributes.emoji } : {}),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: BLOCK_EMOJI_KEY,
        props: {
          decorations(state) {
            const widgets: Decoration[] = [];
            state.doc.forEach((node, offset) => {
              const emoji = node.attrs.emoji;
              if (typeof emoji !== 'string' || !emoji) return;
              const badge = document.createElement('span');
              badge.className = 'block-emoji';
              badge.textContent = emoji;
              widgets.push(Decoration.widget(offset + 1, badge, { side: -1 }));
            });
            return DecorationSet.create(state.doc, widgets);
          },
        },
      }),
    ];
  },
});
