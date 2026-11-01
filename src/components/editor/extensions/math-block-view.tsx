'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useMemo, useReducer } from 'react';
import { renderMath } from '@/lib/math/render';
import { ClipboardBoundary } from '@/components/clipboard/ClipboardBoundary';
import { initialTextEditState, startTextEdit, stopTextEdit } from '@/lib/editor/text-edit-state';

export function MathBlockView({ node, updateAttributes }: NodeViewProps) {
  // G601: entering/leaving this block's editor is the official `startTextEdit` / `stopTextEdit`
  // pair, driven by a reducer. The block is never removed on empty (`allowToBeRemovedWhenEmpty:
  // false`) — a half-typed formula is still the author's work — but the backup is kept, so the
  // caret lands where it left off on the way back in.
  const [edit, dispatch] = useReducer(
    (state: ReturnType<typeof initialTextEditState>, action: { type: 'open' } | { type: 'close' }) => {
      if (action.type === 'open') {
        return startTextEdit(state, { blockId: 'math-block', anchor: 0, head: 0 });
      }
      return stopTextEdit(state, {
        allowToBeRemovedWhenEmpty: false,
        backupSelection: true,
        blockEmpty: false,
      }).state;
    },
    undefined,
    initialTextEditState,
  );
  const editing = edit.editingBlockId !== null;
  const latex = (node.attrs.latex as string) || '';
  const rendered = useMemo(() => renderMath(latex, true), [latex]);
  const showSource = editing || rendered.empty;

  return (
    <NodeViewWrapper as="div" className="my-4">
      <div
        className="rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-border"
        onClick={() => dispatch({ type: 'open' })}
      >
        {showSource ? (
          <ClipboardBoundary className="contents">
            <textarea
              value={latex}
              onChange={(e) => updateAttributes({ latex: e.target.value })}
              onBlur={() => dispatch({ type: 'close' })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  dispatch({ type: 'close' });
                }
              }}
              autoFocus
              placeholder="输入 LaTeX 公式，Esc 退出编辑"
              className="min-h-[60px] w-full resize-none bg-transparent font-mono text-sm focus:outline-none"
            />
          </ClipboardBoundary>
        ) : (
          <div
            className="crafty-math cursor-pointer text-center"
            // The source is the author's data; KaTeX owns the presentation.
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
