import { Node, mergeAttributes } from '@tiptap/react';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    htmlEmbed: {
      setHtmlEmbed: (attributes: { html: string }) => ReturnType;
    };
  }
}

/**
 * G40: the official `html` block. The source is rendered inside a sandboxed
 * iframe with no script permission, so an embedded document cannot reach the
 * app's DOM or storage.
 */
export const HtmlEmbed = Node.create({
  name: 'htmlBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (element) => element.querySelector('iframe')?.getAttribute('srcdoc') ?? '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="html-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'html-embed' }),
      ['iframe', { sandbox: '', srcdoc: HTMLAttributes.html ?? '' }],
    ];
  },

  addCommands() {
    return {
      setHtmlEmbed:
        (attributes) =>
        ({ commands }) => commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },
});
