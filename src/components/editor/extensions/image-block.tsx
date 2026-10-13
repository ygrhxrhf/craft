import { Node, mergeAttributes } from '@tiptap/react';

function readAxis(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageBlockView } from './image-block-view';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attributes: {
        src?: string | null;
        alt?: string | null;
        caption?: string | null;
      }) => ReturnType;
    };
  }
}

export const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector('img');
          return img?.getAttribute('src');
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector('img');
          return img?.getAttribute('alt');
        },
      },
      caption: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-caption'),
        renderHTML: (attributes) => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        },
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('data-width') || '100%',
        renderHTML: (attributes) => ({ 'data-width': attributes.width }),
      },
      // The crop frame (G66). Absent reads as centered and unzoomed.
      posX: {
        default: null,
        parseHTML: (element) => readAxis(element.getAttribute('data-pos-x')),
        renderHTML: (attributes) => (attributes.posX == null ? {} : { 'data-pos-x': attributes.posX }),
      },
      posY: {
        default: null,
        parseHTML: (element) => readAxis(element.getAttribute('data-pos-y')),
        renderHTML: (attributes) => (attributes.posY == null ? {} : { 'data-pos-y': attributes.posY }),
      },
      scale: {
        default: null,
        parseHTML: (element) => readAxis(element.getAttribute('data-scale')),
        renderHTML: (attributes) => (attributes.scale == null ? {} : { 'data-scale': attributes.scale }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'image-block' }),
      ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt }],
    ];
  },

  addCommands() {
    return {
      setImageBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});
