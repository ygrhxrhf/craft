import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ToggleBlockView } from './toggle-block-view';
import { TOGGLE_NODE, setOpenOnAllToggles } from './toggle-all';
import { parseWireFlag, serializeWireFlag, type TriStateFlag } from '@/lib/editor/wire-flag';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType;
      toggleToggleBlock: () => ReturnType;
      unsetToggleBlock: () => ReturnType;
      expandAllToggleBlocks: () => ReturnType;
      collapseAllToggleBlocks: () => ReturnType;
    };
  }
}

export const ToggleBlock = Node.create({
  name: TOGGLE_NODE,
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      open: {
        // G501: absent is its own state — a toggle that was never set is not the same as closed.
        default: null,
        parseHTML: (element) => parseWireFlag(element.getAttribute('data-open')),
        renderHTML: (attributes) => {
          const flag = serializeWireFlag(attributes.open as TriStateFlag);
          return flag === undefined ? {} : { 'data-open': flag };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-type="toggle-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-block' }), 0];
  },

  addCommands() {
    return {
      setToggleBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { open: false },
            content: [{ type: 'paragraph' }],
          });
        },

      toggleToggleBlock:
        () =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph');
        },

      unsetToggleBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },

      expandAllToggleBlocks:
        () =>
        ({ state, tr, dispatch }) => {
          const changed = setOpenOnAllToggles(state, tr, true);
          if (!changed) return false;
          dispatch?.(tr);
          return true;
        },

      collapseAllToggleBlocks:
        () =>
        ({ state, tr, dispatch }) => {
          const changed = setOpenOnAllToggles(state, tr, false);
          if (!changed) return false;
          dispatch?.(tr);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },
});
