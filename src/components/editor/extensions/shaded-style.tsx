import { Extension } from '@tiptap/react';

import { DECORATED_TYPES } from '@/lib/editor/format-commands';

export type ShadeColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    shadedStyle: {
      setShadedStyle: (color: ShadeColor | null) => ReturnType;
      unsetShadedStyle: () => ReturnType;
    };
  }
}

export const ShadedStyle = Extension.create({
  name: 'shadedStyle',

  addGlobalAttributes() {
    return [
      {
        types: [...DECORATED_TYPES],
        attributes: {
          shadedColor: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-shaded-color'),
            renderHTML: (attributes) => {
              if (!attributes.shadedColor) return {};
              return { 'data-shaded-color': attributes.shadedColor };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    // 同 FocusStyle：属性在块类型上，命令名不是节点名，逐类型写才是真的写进去。
    const apply = (color: ShadeColor | null) =>
      ({ commands }: { commands: { updateAttributes: (type: string, attrs: Record<string, unknown>) => boolean } }) => {
        let updated = false;
        for (const type of DECORATED_TYPES) {
          updated = commands.updateAttributes(type, { shadedColor: color }) || updated;
        }
        return updated;
      };

    return {
      setShadedStyle: (color) => apply(color),
      unsetShadedStyle: () => apply(null),
    };
  },
});
