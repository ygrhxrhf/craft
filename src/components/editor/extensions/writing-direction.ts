import { Extension } from '@tiptap/react';
import type { Editor } from '@tiptap/react';

import {
  ALIGNABLE_TYPES,
  applyWritingDirection,
  CSS_WRITING_MODE,
  writingModeFromCss,
  type WritingMode,
} from '@/lib/editor/format-presence';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    writingDirection: {
      setWritingDirection: (mode: WritingMode) => ReturnType;
    };
  }
}

/**
 * 官方「格式」面板里方向那一族的两枚控件落到正文上的样子（`gap.md` G1484）。
 * 与对齐共用同一份可定向块清单：面板点亮哪一档，正文就必须写得进哪一档。
 * 判定与写侧都在 `format-presence.ts`，这里只剩 TipTap 的接线。
 */
export const DIRECTION_TYPES = ALIGNABLE_TYPES;

/** 单独抽出来，属性两侧的换算就能在没有编辑器、没有 DOM 的情况下被直接测到。 */
export const DIRECTION_ATTRIBUTE = {
  default: null as WritingMode | null,
  parseHTML: (element: HTMLElement) =>
    element.style.writingMode ? writingModeFromCss(element.style.writingMode) : null,
  renderHTML: (attributes: { writingDirection?: WritingMode | null }) => {
    const css = attributes.writingDirection ? CSS_WRITING_MODE[attributes.writingDirection] : null;
    return css ? { style: `writing-mode: ${css}` } : {};
  },
};

export const WritingDirection = Extension.create({
  name: 'writingDirection',

  addGlobalAttributes() {
    return [
      {
        types: DIRECTION_TYPES,
        attributes: { writingDirection: DIRECTION_ATTRIBUTE },
      },
    ];
  },

  addCommands() {
    return {
      setWritingDirection:
        (mode: WritingMode) =>
        ({ editor }: { editor: Editor }) => {
          const tr = applyWritingDirection(editor.state, mode, DIRECTION_TYPES);
          if (tr) editor.view.dispatch(tr.scrollIntoView());
          return Boolean(tr);
        },
    };
  },
});
