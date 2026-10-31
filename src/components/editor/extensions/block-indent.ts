import { Extension } from '@tiptap/react';

import {
  INDENT_STEP_PX,
  INDENTABLE_TYPES,
  clampIndent,
  indentTargets,
} from '@/lib/editor/block-indent';

/**
 * G581/G912/G913: Tab indents the blocks the selection touches (paragraphs and headings),
 * Shift-Tab takes one level back. List items are left to the list extension, which already
 * sinks/lifts them — intercepting those would replace subtree movement with a flat indent.
 */
export const BlockIndent = Extension.create({
  name: 'blockIndent',

  addGlobalAttributes() {
    return [
      {
        types: [...INDENTABLE_TYPES],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = Number(element.getAttribute('data-indent'));
              return Number.isInteger(raw) && raw > 0 ? raw : 0;
            },
            renderHTML: (attributes) => {
              const level = clampIndent(attributes.indent);
              if (level === 0) return {};
              return {
                'data-indent': String(level),
                style: `--indent-w:${level * INDENT_STEP_PX}px`,
              };
            },
          },
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    const step = (delta: 1 | -1) => {
      const { state, view } = this.editor;
      const { $from } = state.selection;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const name = $from.node(depth).type.name;
        if (name === 'listItem' || name === 'taskItem') return false;
      }

      const targets = indentTargets(state.doc, state.selection.from, state.selection.to);
      if (!targets.length) return false;
      const changed = targets.filter((target) => clampIndent(target.level + delta) !== target.level);
      if (!changed.length) return false;

      const tr = state.tr;
      for (const target of changed) {
        tr.setNodeMarkup(target.pos, undefined, {
          ...target.attrs,
          indent: clampIndent(target.level + delta),
        });
      }
      view.dispatch(tr);
      return true;
    };

    return {
      Tab: () => step(1),
      'Shift-Tab': () => step(-1),
    };
  },
});
