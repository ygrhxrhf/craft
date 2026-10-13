import { Node, mergeAttributes } from '@tiptap/core';

/**
 * `Shift-Enter` on a document page does nothing in official Craft: measured twice on two blocks
 * (`150,894→150,894`, `152,940→152,940`, `<br>` count stays 0) with a same-cell control where
 * plain `Enter` added a block — so the path was live and the key was genuinely inert. The static
 * side agrees: the official handler only returns `preventDefault: false`, not even the browser's
 * contenteditable default fires (`gap.md` G615).
 *
 * This build's StarterKit ships the default HardBreak bound to `Shift-Enter`, which is why the
 * local editor *did* insert `<br>` — "doing more than official" rather than missing something.
 * The replacement keeps the node itself in the schema (documents already contain `<br>` and the
 * importers emit them) but contributes no keyboard shortcut, which is the measured behaviour.
 *
 * Scope note: this is the document editor. In a collection table `Shift-Enter` means 「添加一行」
 * (`keyboard.md` §合集), a different surface that never reaches this keymap.
 */
export const OfficialHardBreak = Node.create({
  name: 'hardBreak',

  group: 'inline',

  inline: true,

  selectable: false,

  parseHTML() {
    return [{ tag: 'br' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['br', mergeAttributes(HTMLAttributes)];
  },

  renderText({ node }) {
    return node.attrs.text ?? '\n';
  },

  addCommands() {
    return {
      setHardBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
