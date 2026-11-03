import { Node, mergeAttributes } from '@tiptap/react';
import '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { PAGE_PREVIEW_COPY } from '@/lib/editor/style-keys';
import { PageBlockView } from './page-block-view';

interface PageBlockOptions {
  hostDocumentId: string;
}

declare module '@tiptap/core' {
  interface Storage {
    pageBlock: { hostDocumentId: string };
  }
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    pageBlock: {
      setPageBlock: (attributes?: { documentId?: string | null; title?: string | null }) => ReturnType;
    };
  }
}

/**
 * G1584：`Ctrl-Shift-P` 插出的页面块。本地没有页中页节点（G1408／G1572），这枚原子块只是
 * 子文档的指针：空着时显示官方那句预览文案，点开后由视图创建真正的子页。
 */
export const PageBlock = Node.create<PageBlockOptions>({
  name: 'pageBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return { hostDocumentId: '' };
  },

  addStorage() {
    return { hostDocumentId: this.options.hostDocumentId };
  },

  addAttributes() {
    return {
      documentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-document-id'),
        renderHTML: (attributes) =>
          attributes.documentId ? { 'data-document-id': attributes.documentId } : {},
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') ?? '',
        renderHTML: (attributes) => (attributes.title ? { 'data-title': attributes.title } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'page-block' }),
      (HTMLAttributes.title as string) || PAGE_PREVIEW_COPY,
    ];
  },

  addCommands() {
    return {
      setPageBlock:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes ?? {} }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBlockView);
  },
});
