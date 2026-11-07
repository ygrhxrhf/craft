import { Extension } from '@tiptap/react';

import {
  INDENT_STEP_PX,
  INDENTABLE_TYPES,
  clampIndent,
  indentTargetsWithChildren,
} from '@/lib/editor/block-indent';

/**
 * G581/G912/G913: Tab indents the blocks the selection touches (paragraphs and headings),
 * Shift-Tab takes one level back.
 *
 * G627/G912: the unit is the block **together with its indented children** — the official
 * `sm([id], map, ±1)` unions `Ft.getIndentChildrenOfBlock` in and then applies `og(ids, δ)` once,
 * so a 0-level parent followed by two 1-level blocks moves all three by 28px. `indentTargetsWithChildren`
 * is that union; a following block at the *same* level is not a child (G613's measurement).
 *
 * G1546: inside a list item the official build keeps increasing the block's `--indent-w`
 * (28→56→84px) instead of stopping when there is no previous sibling to sink under. So a list
 * item's textblock is indented the same way; Shift-Tab at level 0 falls through to the list
 * extension, which lifts the item as before.
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
      let inList = false;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const name = $from.node(depth).type.name;
        if (name === 'listItem' || name === 'taskItem') {
          inList = true;
          break;
        }
      }

      if (inList) {
        // G1546: continue the flat indent on the list item's textblock, level after level.
        const textblock = $from.parent;
        if (!textblock.isTextblock) return false;
        const level = clampIndent(textblock.attrs?.indent);
        if (delta === -1 && level === 0) return false; // let the list extension lift it
        const next = clampIndent(level + delta);
        if (next === level) return true; // same-direction keystrokes are idempotent at the ceiling
        this.editor.chain().focus().updateAttributes(textblock.type.name, { indent: next }).run();
        return true;
      }

      const targets = indentTargetsWithChildren(state.doc, state.selection.from, state.selection.to);
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
