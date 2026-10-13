import { Mark, mergeAttributes, getMarksBetween } from '@tiptap/core';
import type { Node as PMNode, Mark as PMMark } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (threadId: string) => ReturnType;
      unsetComment: () => ReturnType;
      removeComment: (threadId: string) => ReturnType;
    };
  }
}

export interface CommentMarkRange {
  from: number;
  to: number;
  mark: PMMark;
}

/**
 * 找出指向指定线程的评论标记范围。
 * `unsetComment` 只作用于当前选区，而线程被删光时标记通常不在光标处，
 * 所以按 attrs 在整篇里找。无 DOM、无 editor 实例，便于直接测试。
 */
export function commentMarkRanges(doc: PMNode, threadId: string): CommentMarkRange[] {
  return getMarksBetween(0, doc.content.size, doc)
    .filter(
      ({ mark }) => mark.type.name === 'commentMark' && mark.attrs.threadId === threadId,
    )
    .map(({ mark, from, to }) => ({ from, to, mark }));
}

export const CommentMark = Mark.create({
  name: 'commentMark',
  keepOnSplit: false,

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-thread-id'),
        renderHTML: (attributes) =>
          attributes.threadId ? { 'data-thread-id': attributes.threadId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-comment': '' }), 0];
  },

  addCommands() {
    return {
      setComment:
        (threadId: string) =>
        ({ commands }: { commands: any }) =>
          commands.setMark(this.name, { threadId }),
      unsetComment:
        () =>
        ({ commands }: { commands: any }) =>
          commands.unsetMark(this.name),
      removeComment:
        (threadId: string) =>
        ({ state, dispatch }: { state: { doc: PMNode; tr: Transaction }; dispatch?: (tr: Transaction) => void }) => {
          const ranges = commentMarkRanges(state.doc, threadId);
          if (ranges.length === 0) return false;
          if (dispatch) {
            const tr = state.tr;
            for (const { from, to, mark } of ranges) tr.removeMark(from, to, mark);
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
