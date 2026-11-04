import { Mark, mergeAttributes } from '@tiptap/react';
import {
  DEFAULT_HIGHLIGHT_DEGREE,
  GRADIENT_COLOR_NAMES,
  colorPair,
  parseGradient,
  serializeGradient,
} from '@/lib/editor/gradient-highlight';

export type GradientColor = 'purple' | 'red' | 'blue' | 'yellow' | 'green' | 'pink';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    gradientHighlight: {
      /** 单色档（旧入口）：一枚具名色名。 */
      setGradientHighlight: (color: GradientColor) => ReturnType;
      /** G532：按官方线格式写渐变（至少 2 个色标；少于 2 个退化为普通高亮）。 */
      setHighlightGradient: (colorNames: string[]) => ReturnType;
      unsetGradientHighlight: () => ReturnType;
    };
  }
}

/**
 * G532 —— 高亮是一枚**90° 线性渐变**，线格式 `"<色1>;<色2>;<色3>g"`。这里的属性就叫
 * `value`（与官方字段同名），存那串原始线格式；渲染时再解回色标，用 `--editor-*` 两套变量
 * 拼 `linear-gradient`——亮/暗档由主题变量自己切换，不需要为暗色另写一条规则。
 *
 * 旧档（`color: 'purple'` 这类）仍能读：没有 `g` 尾巴就不是渐变，退回单色背景。
 */
export const GradientHighlight = Mark.create({
  name: 'gradientHighlight',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-gradient') || null,
        renderHTML: (attributes) =>
          attributes.color && !attributes.value ? { 'data-gradient': attributes.color } : {},
      },
      value: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-gradient-value') || null,
        renderHTML: (attributes) => (attributes.value ? { 'data-gradient-value': attributes.value } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-gradient]' }, { tag: 'span[data-gradient-value]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // ☆ `HTMLAttributes` 里是**渲染后的属性名**（`data-gradient-value`），不是原始属性 `value`；
    //   第一版按 `HTMLAttributes.value` 读，于是解不出渐变、背景一直没画上去（屏上实测才发现）。
    const rawValue = HTMLAttributes['data-gradient-value'] ?? HTMLAttributes.value;
    const rawColor = HTMLAttributes['data-gradient'] ?? HTMLAttributes.color;
    const gradient = parseGradient(rawValue);
    if (gradient) {
      // 线格式里存的就是可直接用的 CSS 值（`var(--editor-x)` 或十六进制），不要再包一层变量。
      const stops = gradient.colorStops
        .map((stop) => `${stop.light} ${stop.percent100}%`)
        .join(', ');
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          style: `background-image: linear-gradient(${DEFAULT_HIGHLIGHT_DEGREE}deg, ${stops}); -webkit-box-decoration-break: clone; box-decoration-break: clone;`,
        }),
        0,
      ];
    }
    // 单色档：`--highlight-<name>` 是既有的 20~24% 透明底色（globals.css）。
    if (rawColor) {
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          style: `background-color: var(--highlight-${rawColor}, transparent); -webkit-box-decoration-break: clone; box-decoration-break: clone;`,
        }),
        0,
      ];
    }
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setGradientHighlight:
        (color) =>
        ({ commands }) => {
          return commands.setMark(this.name, { color, value: null });
        },

      setHighlightGradient:
        (colorNames) =>
        ({ commands }) => {
          const names = colorNames.filter((name) =>
            (GRADIENT_COLOR_NAMES as readonly string[]).includes(name),
          );
          // 单色标退化成普通色（官方同一条）：少于两枚就不写渐变尾巴。
          if (names.length < 2) {
            return names.length === 1
              ? commands.setMark(this.name, { color: names[0], value: null })
              : commands.unsetMark(this.name);
          }
          const value = serializeGradient(names.map((name) => colorPair(name)));
          return commands.setMark(this.name, { value, color: null });
        },

      unsetGradientHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
