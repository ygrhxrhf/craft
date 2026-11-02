import { Extension } from '@tiptap/react';

import { DECORATED_TYPES, type BlockFontId } from '@/lib/editor/format-commands';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    blockFont: {
      setBlockFont: (id: BlockFontId | null) => ReturnType;
    };
  }
}

/**
 * G208 「字体」段：四档具名字体写在块属性上（`data-block-font`），字体栈由 `globals.css`
 * 按属性给出。刻意不用内联 `style.font-family`——焦点、块底色也各输出一份 `style`，三份会互相
 * 覆盖；数据属性让每个装饰走自己的规则。
 */
export const BlockFont = Extension.create({
  name: 'blockFont',

  addGlobalAttributes() {
    return [
      {
        types: [...DECORATED_TYPES],
        attributes: {
          blockFont: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-font'),
            renderHTML: (attributes) => {
              if (!attributes.blockFont) return {};
              return { 'data-block-font': attributes.blockFont };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockFont:
        (id) =>
        ({ commands }) => {
          let updated = false;
          // 一份文档同一个属性可能落在不同块类型上，逐类型写；至少命中一处才算这条命令生效。
          for (const type of DECORATED_TYPES) {
            updated = commands.updateAttributes(type, { blockFont: id }) || updated;
          }
          return updated;
        },
    };
  },
});
