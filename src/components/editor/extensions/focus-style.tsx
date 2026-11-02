import { Extension } from '@tiptap/react';

import { DECORATED_TYPES } from '@/lib/editor/format-commands';

export type FocusColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    focusStyle: {
      setFocusStyle: (color: FocusColor | null) => ReturnType;
      unsetFocusStyle: () => ReturnType;
    };
  }
}

export const FocusStyle = Extension.create({
  name: 'focusStyle',

  addGlobalAttributes() {
    return [
      {
        types: [...DECORATED_TYPES],
        attributes: {
          focusColor: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-focus-color'),
            renderHTML: (attributes) => {
              if (!attributes.focusColor) return {};
              return { 'data-focus-color': attributes.focusColor };
            },
          },
          // G630: the other two decoration slots — the block background and the block text colour.
          // Leaving one level clears all three at once (see the Backspace downgrade in the keymap).
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {};
              return { style: `background-color: ${attributes.backgroundColor}` };
            },
          },
          textColor: {
            default: null,
            parseHTML: (element) => element.style.color || null,
            renderHTML: (attributes) => {
              if (!attributes.textColor) return {};
              return { style: `color: ${attributes.textColor}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    // 全局属性挂在块类型上，`updateAttributes(this.name, …)` 里的 `focusStyle` 不是节点名，
    // 那条命令实际是空转（面板第 175 批接上装饰段时才暴露）；改为逐块类型写。
    const apply = (color: FocusColor | null) =>
      ({ commands }: { commands: { updateAttributes: (type: string, attrs: Record<string, unknown>) => boolean } }) => {
        let updated = false;
        for (const type of DECORATED_TYPES) {
          updated = commands.updateAttributes(type, { focusColor: color }) || updated;
        }
        return updated;
      };

    return {
      setFocusStyle: (color) => apply(color),
      unsetFocusStyle: () => apply(null),
    };
  },
});
