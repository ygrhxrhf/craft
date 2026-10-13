'use client';

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export function CardBlockView({ node }: NodeViewProps) {
  const bgColor = node.attrs.bgColor as string;
  const emoji = node.attrs.emoji as string | null;
  // The default white is the light surface only. Without an explicit colour the card follows the
  // theme, which is what a card that records its own interface style does (G1483).
  const followsTheme = !bgColor || bgColor.toLowerCase() === '#ffffff';

  return (
    <NodeViewWrapper className="my-2">
      <div
        className="rounded-lg border border-foreground/8 bg-card p-4 shadow-sm transition-shadow duration-150 ease-craft hover:shadow-md"
        style={followsTheme ? undefined : { backgroundColor: bgColor }}
      >
        {emoji && <div className="mb-1 text-xl leading-none">{emoji}</div>}
        <NodeViewContent className="card-block-content" />
      </div>
    </NodeViewWrapper>
  );
}
