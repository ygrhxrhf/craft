import { Node, mergeAttributes } from '@tiptap/react';
import { nodeInputRule } from '@tiptap/core';
import {
  DEFAULT_DIVIDER_STYLE,
  DIVIDER_PATTERN,
  DIVIDER_SIGILS,
  normalizeDividerStyle,
  type DividerStyle,
} from '@/lib/editor/divider-styles';
import {
  normalizeSeparatorMaterial,
  normalizeWashiColor,
  normalizeWashiPattern,
} from '@/lib/editor/separator-material';

export { DIVIDER_PATTERN, DIVIDER_SIGILS };
export type { DividerStyle };

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    divider: {
      setDivider: (style?: DividerStyle) => ReturnType;
    };
  }
}

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      style: {
        default: DEFAULT_DIVIDER_STYLE,
        parseHTML: (element) => normalizeDividerStyle(element.getAttribute('data-style')),
        renderHTML: (attributes) => ({ 'data-style': attributes.style }),
      },
      // G1247：官方分隔线还有一条**材质轴**（`--separator washi` ＋ 图案 ＋ 颜色）。三枚 attr
      // 只在 material=washi 时生效；旧文档没有它们，默认落 `line`，渲染一字不变。
      separator: {
        default: 'line',
        parseHTML: (element) => normalizeSeparatorMaterial(element.getAttribute('data-separator')),
        renderHTML: (attributes) => ({ 'data-separator': attributes.separator }),
      },
      washiPattern: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-washi-pattern');
          return raw === null ? null : normalizeWashiPattern(raw);
        },
        renderHTML: (attributes) =>
          attributes.washiPattern ? { 'data-washi-pattern': attributes.washiPattern } : {},
      },
      washiColor: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-washi-color');
          return raw === null ? null : normalizeWashiColor(raw);
        },
        renderHTML: (attributes) => {
          if (!attributes.washiColor) return {};
          // CSS 读不出 data 属性里的十六进制值 ⇒ 顺手把颜色写成自定义属性，图案层直接用它。
          return {
            'data-washi-color': attributes.washiColor,
            style: `--washi-color: ${attributes.washiColor}`,
          };
        },
      },
    };
  },

  parseHTML() {
    // The bare `hr` branch keeps documents written before StarterKit's horizontal
    // rule was switched off loadable.
    return [{ tag: 'hr[data-type="divider"]' }, { tag: 'hr' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-type': 'divider' })];
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: DIVIDER_PATTERN,
        type: this.type,
        getAttributes: (match) => ({ style: DIVIDER_SIGILS[match[1]] }),
      }),
    ];
  },

  addCommands() {
    return {
      setDivider:
        (style = DEFAULT_DIVIDER_STYLE) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { style },
          });
        },
    };
  },
});
