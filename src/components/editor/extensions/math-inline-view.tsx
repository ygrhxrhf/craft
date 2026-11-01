'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useMemo, useReducer } from 'react';
import { renderMath } from '@/lib/math/render';
import { initialEditorMachine, reduceEditor } from '@/lib/editor/edit-drag-machine';

export function MathInlineView({ node, updateAttributes }: NodeViewProps) {
  // G591: the sub-editor's open/close is an action-machine transition, not a bare boolean — the
  // same `startCodeEdit` / `stopCodeEdit` pair the official build drives. Keeping it as a machine
  // is what lets the editor host ask "who is editing what" without a second source of truth.
  const [machine, dispatch] = useReducer(reduceEditor, undefined, initialEditorMachine);
  const editing = machine.edit.editingKind === 'code';
  const latex = (node.attrs.latex as string) || '';
  const rendered = useMemo(() => renderMath(latex), [latex]);

  const open = () => dispatch({ type: 'startCodeEdit', blockId: 'inline-math' });
  const close = () => dispatch({ type: 'stopCodeEdit' });

  if (editing || rendered.empty) {
    return (
      <NodeViewWrapper as="span">
        <input
          value={latex}
          onChange={(e) => updateAttributes({ latex: e.target.value })}
          onBlur={close}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
          autoFocus
          placeholder="LaTeX"
          aria-label="行内公式"
          className="inline-block w-40 rounded border border-border bg-muted/40 px-1 font-mono text-[0.9em] outline-none"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span">
      <span
        className="crafty-math crafty-math-inline cursor-pointer"
        title={latex}
        onClick={open}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    </NodeViewWrapper>
  );
}
