import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TagAtomView } from './tag-atom-view';
import { normalizeTagAtomName } from '@/lib/editor/inline-atoms';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    tagAtom: {
      /** 插入一枚标签原子（`name` 是标签名，`tagId` 有则点它进标签页）。 */
      insertTagAtom: (attributes: { name: string; tagId?: string | null }) => ReturnType;
    };
  }
}

/**
 * `gap.md` G580 —— 官方四类原子内联元素的 `tag` 一类：正文里一枚标签胶囊。
 *
 * 与 `#标签` 纯文本不同：原子是节点，Backspace 在它内部让位默认行为（官方 `Jm` 的四类枚举）。
 * 名称归一（去 `#` 与首尾空白）在命令层做，脏名直接拒绝。
 */
export const TagAtom = Node.create({
  name: 'tagAtom',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag-name') || null,
        renderHTML: (attributes) => (attributes.name ? { 'data-tag-name': attributes.name } : {}),
      },
      tagId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag-id') || null,
        renderHTML: (attributes) => (attributes.tagId ? { 'data-tag-id': attributes.tagId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tag"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'tag' }),
      `#${HTMLAttributes['data-tag-name'] ?? ''}`,
    ];
  },

  addCommands() {
    return {
      insertTagAtom:
        (attributes) =>
        ({ commands }) => {
          const name = normalizeTagAtomName(attributes?.name);
          if (!name) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { name, tagId: attributes?.tagId ?? null },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TagAtomView);
  },
});
