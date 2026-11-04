import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DayAtomView } from './day-atom-view';
import { dayAtomHref, parseDayAtomDate } from '@/lib/editor/inline-atoms';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    dayAtom: {
      /** 插入一枚「每日笔记日期」原子（默认今天）。 */
      insertDayAtom: (attributes?: { date?: string | null }) => ReturnType;
    };
  }
}

/**
 * `gap.md` G580 —— 官方四类原子内联元素 `math / day / mention / tag` 之一。
 *
 * `day` 是**每日笔记的日期原子**：一块内联的日期胶囊，点它打开那一天的每日笔记。它与
 * `day://` 链接不同——链接是普通 `a` 元素，原子是节点（`elementContent` 非空），
 * 因此 Backspace 在它内部要让位默认行为（同 `mention`/`math`）。
 */
export const DayAtom = Node.create({
  name: 'dayAtom',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      date: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-day') || null,
        renderHTML: (attributes) => (attributes.date ? { 'data-day': attributes.date } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="day"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const href = HTMLAttributes['data-day'] ? dayAtomHref(HTMLAttributes['data-day']) : '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'day', 'data-href': href }),
      HTMLAttributes['data-day'] ?? '',
    ];
  },

  addCommands() {
    return {
      insertDayAtom:
        (attributes) =>
        ({ commands }) => {
          const today = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const fallback = `${today.getFullYear()}.${pad(today.getMonth() + 1)}.${pad(today.getDate())}`;
          // 只接受严格日期（官方解析器 `TU` 的同一份严格性）；脏值落回今天。
          const date = parseDayAtomDate(attributes?.date) ?? fallback;
          return commands.insertContent({ type: this.name, attrs: { date } });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DayAtomView);
  },
});
