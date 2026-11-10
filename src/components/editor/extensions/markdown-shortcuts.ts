import { Extension } from '@tiptap/react';
import { InputRule, nodeInputRule } from '@tiptap/core';

import { SPACE_MARK_RULES } from '@/lib/editor/markdown-mark-rules';

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',
  // TipTap flattens input rules by extension priority, and Heading generates one rule per enabled
  // level — with level 4 on, its own `/^####\s$/` rule would win the tie and turn `#### ` into a
  // fourth-level heading. G1557: the official `#### ` is the Strong style slot, so this rule runs first.
  priority: 1000,

  addInputRules() {
    const rules: InputRule[] = [];

    // G1557：官方 `#### ` 是 Strong（粗体），不是四级标题——标题只到 ###。
    // 删掉标记后把粗体放进 stored mark，后续输入即为粗体。
    if (this.editor.schema.marks.bold) {
      rules.push(
        new InputRule({
          find: /^####\s$/,
          handler: ({ state, range }) => {
            const { tr } = state;
            const $from = tr.doc.resolve(range.from);
            if ($from.parent.type.name !== 'paragraph') return;
            tr.delete(range.from, range.to);
            tr.addStoredMark(state.schema.marks.bold.create());
          },
        })
      );
    }

    // G1558: the inline marks convert on the space *after* the closing marker. StarterKit's own mark
    // rules fire at the marker, and TipTap 3 gates rules with an allowlist only (`enableInputRules`),
    // so Editor.tsx leaves bold/italic/code/strike/highlight out and these rules take their place.
    for (const rule of SPACE_MARK_RULES) {
      const type = this.editor.schema.marks[rule.mark];
      if (!type) continue;
      rules.push(
        new InputRule({
          find: rule.find,
          handler: ({ state, range, match }) => {
            const { tr, schema } = state;
            const marks =
              rule.hrefGroup === undefined
                ? [type.create()]
                : [type.create({ href: match[rule.hrefGroup] })];
            // The typed space survives; only the markers go away.
            tr.replaceWith(range.from, range.to, [
              schema.text(match[rule.textGroup], marks),
              schema.text(' '),
            ]);
          },
        })
      );
    }

    // Display math: $$\alpha$$. nodeInputRule because replacing a whole textblock
    // with a block node needs the paragraph swapped out, not a range delete.
    if (this.editor.schema.nodes.mathBlock) {
      rules.push(
        nodeInputRule({
          find: /\$\$([\s\S]+?)\$\$$/,
          type: this.editor.schema.nodes.mathBlock,
          getAttributes: (match) => ({ latex: match[1].trim() }),
        })
      );
    }

    // Inline math: $x^2$. The content must be space-free, otherwise prose like
    // "价格 $10 和 $20" converts on the second dollar sign. Spaces are common in
    // real LaTeX, which is what the $$ block rule is for.
    if (this.editor.schema.nodes.inlineMath) {
      rules.push(
        new InputRule({
          find: /(?<!\$)\$([^$\s]+)\$$/,
          handler: ({ chain, range, match }) => {
            chain()
              .deleteRange(range)
              .insertContent({ type: 'inlineMath', attrs: { latex: match[1] } })
              .run();
          },
        })
      );
    }

    // Todo: `[] ` or `[x] ` at the start of a line, Craft's shortcut. Restricted to
    // top-level paragraphs — inside a bullet list the replacement would be content the
    // schema rejects, and `- [ ]` there is the importer's job, not the editor's.
    // G358：官方表 `uF` 的 pattern 一律 `^\s*`（允许前导空白），故 `  [] ` 也应转任务块。
    // G866：官方任务四写法 `[x×☐□]`／`[ ]`／`-[]`／`[x]`，其中 `[x×]` 直接置 Checked，其余 Unchecked。
    if (this.editor.schema.nodes.taskList && this.editor.schema.nodes.taskItem) {
      rules.push(
        new InputRule({
          find: /^\s*-?\[([ xX×☐□]?)\]\s$/,
          handler: ({ state, range, match }) => {
            const $at = state.doc.resolve(range.from);
            if ($at.depth !== 1 || $at.parent.type.name !== 'paragraph') return;

            const checked = /^[xX×]$/.test(match[1]);
            const { taskList, taskItem, paragraph } = state.schema.nodes;
            const blockStart = $at.before(1);
            const tail = $at.parent.textContent.slice(range.to - blockStart - 1);
            const { tr } = state;

            tr.replaceWith(
              blockStart,
              $at.after(1),
              taskList.create(
                null,
                taskItem.create({ checked }, paragraph.create(null, tail ? state.schema.text(tail) : null))
              )
            );
          },
        })
      );
    }

    // G866: `+ ` → 折叠列表（官方 `Nt.Toggle`）。与任务规则同型：整段落包成 toggleBlock。
    if (this.editor.schema.nodes.toggleBlock) {
      rules.push(
        new InputRule({
          find: /^\s*\+\s$/,
          handler: ({ state, range }) => {
            const $at = state.doc.resolve(range.from);
            if ($at.depth !== 1 || $at.parent.type.name !== 'paragraph') return;
            const { toggleBlock, paragraph } = state.schema.nodes;
            const blockStart = $at.before(1);
            const tail = $at.parent.textContent.slice(range.to - blockStart - 1);
            const { tr } = state;
            tr.replaceWith(
              blockStart,
              $at.after(1),
              toggleBlock.create(
                { open: null },
                paragraph.create(null, tail ? state.schema.text(tail) : null)
              )
            );
          },
        })
      );
    }

    // G866: `| ` → callout（官方把 `>` 与 `|` 一起派成 `P2`）。`>` 由 Blockquote 承担。
    if (this.editor.schema.nodes.callout) {
      rules.push(
        new InputRule({
          find: /^\s*\|\s$/,
          handler: ({ state, range }) => {
            const $at = state.doc.resolve(range.from);
            if ($at.depth !== 1 || $at.parent.type.name !== 'paragraph') return;
            const { callout, paragraph } = state.schema.nodes;
            const blockStart = $at.before(1);
            const tail = $at.parent.textContent.slice(range.to - blockStart - 1);
            const { tr } = state;
            tr.replaceWith(
              blockStart,
              $at.after(1),
              callout.create(
                { type: 'info' },
                paragraph.create(null, tail ? state.schema.text(tail) : null)
              )
            );
          },
        })
      );
    }

    // G866: `• ` → 无序列表（官方 `-*•` 三记号同派 `Nt.Bullet`；StarterKit 只认前两个）。
    if (this.editor.schema.nodes.bulletList && this.editor.schema.nodes.listItem) {
      rules.push(
        new InputRule({
          find: /^\s*•\s$/,
          handler: ({ state, range }) => {
            const $at = state.doc.resolve(range.from);
            if ($at.depth !== 1 || $at.parent.type.name !== 'paragraph') return;
            const { bulletList, listItem, paragraph } = state.schema.nodes;
            const blockStart = $at.before(1);
            const tail = $at.parent.textContent.slice(range.to - blockStart - 1);
            const { tr } = state;
            tr.replaceWith(
              blockStart,
              $at.after(1),
              bulletList.create(
                null,
                listItem.create(null, paragraph.create(null, tail ? state.schema.text(tail) : null))
              )
            );
          },
        })
      );
    }

    return rules;
  },
});
