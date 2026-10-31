import { Node, mergeAttributes } from '@tiptap/core';

/**
 * `Shift-Enter` inserts a line break inside the block (G1552: four independent official runs read
 * `<br>` 0→1, the block text gaining an inline break, key not consumed). The earlier "inert" reading
 * (G615) was withdrawn in batch 300.
 *
 * The shortcut itself lives in `craft-keymap` rather than on this node: the same chord renames a
 * page block when one is selected, and one handler has to arbitrate the two meanings. This node
 * keeps the schema entry (existing documents and importers already contain `<br>`).
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
