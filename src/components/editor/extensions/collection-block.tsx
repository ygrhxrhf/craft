import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';

import {
  normalizeCollectionEmbedView,
  type CollectionEmbedView,
} from '@/lib/collection/embed-block';
import { CollectionBlockView } from './collection-block-view';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    collectionBlock: {
      setCollectionBlock: (attributes: {
        collectionId: string;
        title?: string | null;
        view?: CollectionEmbedView;
      }) => ReturnType;
    };
  }
}

/**
 * G214：文档正文里的集合块。官方的三条「插入集合」在类型层同型（都是 `collection` 块），
 * 只在初始视图上分档，所以属性里只多一枚 `view`。
 */
export const CollectionBlock = Node.create({
  name: 'collectionBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      collectionId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-collection-id'),
        renderHTML: (attributes) =>
          attributes.collectionId ? { 'data-collection-id': attributes.collectionId } : {},
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => (attributes.title ? { 'data-title': attributes.title } : {}),
      },
      view: {
        default: 'table',
        parseHTML: (element) => normalizeCollectionEmbedView(element.getAttribute('data-view')),
        renderHTML: (attributes) => ({ 'data-view': normalizeCollectionEmbedView(attributes.view) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="collection-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'collection-block' }),
      `集合：${HTMLAttributes.title || '未命名集合'}`,
    ];
  },

  addCommands() {
    return {
      setCollectionBlock:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { view: 'table', ...attributes },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollectionBlockView);
  },
});
