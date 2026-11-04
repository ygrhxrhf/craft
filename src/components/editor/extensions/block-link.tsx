import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BlockLinkView } from './block-link-view';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    blockLink: {
      setBlockLink: (attributes: {
        documentId: string;
        title: string;
        blockId?: string | null;
        blockIndex?: number | null;
      }) => ReturnType;
    };
  }
}

interface BlockLinkOptions {
  /** 本文档 id（判断一条区块链接是不是跨文档）。 */
  hostDocumentId: string;
  /**
   * G145：公开页访客跟不跟得上**跨文档**区块链接（官方 `enableObjectLinks`，默认关）。
   * 关着时同文档的锚点跳转照常，指向别的文档的那条不动作。
   */
  followOtherDocuments: boolean;
}

declare module '@tiptap/core' {
  interface Storage {
    blockLink: { hostDocumentId: string; followOtherDocuments: boolean };
  }
}

export const BlockLink = Node.create<BlockLinkOptions>({
  name: 'blockLink',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { hostDocumentId: '', followOtherDocuments: true };
  },

  addStorage() {
    return {
      hostDocumentId: this.options.hostDocumentId,
      followOtherDocuments: this.options.followOtherDocuments,
    };
  },
  addAttributes() {
    return {
      documentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-document-id'),
        renderHTML: (attributes) => ({ 'data-document-id': attributes.documentId }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-target'),
        renderHTML: (attributes) =>
          attributes.blockId ? { 'data-block-target': attributes.blockId } : {},
      },
      blockIndex: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-block-index');
          return raw === null ? null : Number(raw);
        },
        renderHTML: (attributes) =>
          typeof attributes.blockIndex === 'number'
            ? { 'data-block-index': String(attributes.blockIndex) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="block-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'block-link' }),
      `[[${HTMLAttributes.title || '...'}]]`,
    ];
  },

  addCommands() {
    return {
      setBlockLink:
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
    return ReactNodeViewRenderer(BlockLinkView);
  },
});
