import { Node, mergeAttributes } from '@tiptap/react';
import { nodeInputRule } from '@tiptap/core';
import {
  DEFAULT_DIVIDER_STYLE,
  DIVIDER_PATTERN,
  DIVIDER_SIGILS,
  normalizeDividerStyle,
  type DividerStyle,
} from '@/lib/editor/divider-styles';

export { DIVIDER_PATTERN, DIVIDER_SIGILS };
export type { DividerStyle };

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    divider: {
      setDivider: (style?: DividerStyle) => ReturnType;
    };
  }
}

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      style: {
        default: DEFAULT_DIVIDER_STYLE,
        parseHTML: (element) => normalizeDividerStyle(element.getAttribute('data-style')),
        renderHTML: (attributes) => ({ 'data-style': attributes.style }),
      },
    };
  },

  parseHTML() {
    // The bare `hr` branch keeps documents written before StarterKit's horizontal
    // rule was switched off loadable.
    return [{ tag: 'hr[data-type="divider"]' }, { tag: 'hr' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-type': 'divider' })];
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: DIVIDER_PATTERN,
        type: this.type,
        getAttributes: (match) => ({ style: DIVIDER_SIGILS[match[1]] }),
      }),
    ];
  },

  addCommands() {
    return {
      setDivider:
        (style = DEFAULT_DIVIDER_STYLE) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { style },
          });
        },
    };
  },
});
