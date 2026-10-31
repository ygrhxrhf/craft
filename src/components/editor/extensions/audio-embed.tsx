import { Node, mergeAttributes } from '@tiptap/react';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    audioEmbed: {
      setAudioEmbed: (attributes: { src: string; title?: string }) => ReturnType;
    };
  }
}

/** G40: the official block word list carries `audio`; this is its local atom node. */
export const AudioEmbed = Node.create({
  name: 'audioBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector('audio')?.getAttribute('src'),
      },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audio-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'audio-embed' }),
      ['audio', { controls: 'true', src: HTMLAttributes.src }],
    ];
  },

  addCommands() {
    return {
      setAudioEmbed:
        (attributes) =>
        ({ commands }) => commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },
});
