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
      // G1241：导入形状的五个伴生字段。官方恒写 uploaded=true、aspectRatio=1.5（与真实比例
      // 无关），且 url/rawUrl/fileName 三处都等于 src；本地照收集值落，渲染不使用它们。
      uploaded: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-uploaded') !== 'false',
        renderHTML: (attributes) => ({ 'data-uploaded': attributes.uploaded === false ? 'false' : 'true' }),
      },
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-url'),
        renderHTML: (attributes) => (attributes.url ? { 'data-url': attributes.url } : {}),
      },
      rawUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-raw-url'),
        renderHTML: (attributes) => (attributes.rawUrl ? { 'data-raw-url': attributes.rawUrl } : {}),
      },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-name'),
        renderHTML: (attributes) => (attributes.fileName ? { 'data-file-name': attributes.fileName } : {}),
      },
      aspectRatio: {
        default: 1.5,
        parseHTML: (element) => {
          const raw = Number(element.getAttribute('data-aspect-ratio'));
          return Number.isFinite(raw) && raw > 0 ? raw : 1.5;
        },
        renderHTML: (attributes) => ({ 'data-aspect-ratio': String(attributes.aspectRatio ?? 1.5) }),
      },
      // G504：主色按整型存，显示时才转 hex。
      primaryColor: {
        default: null,
        parseHTML: (element) => {
          const raw = Number(element.getAttribute('data-primary-color'));
          return Number.isInteger(raw) && raw >= 0 && raw <= 0xffffff ? raw : null;
        },
        renderHTML: (attributes) => {
          if (attributes.primaryColor == null) return {};
          return { 'data-primary-color': String(attributes.primaryColor) };
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
