'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Link2, Pilcrow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { anchorHref } from '@/lib/editor/block-anchor';
import { untitledFor } from '@/lib/document/untitled-copy';

export function BlockLinkView({ node }: NodeViewProps) {
  const router = useRouter();
  const documentId = node.attrs.documentId as string;
  const title = node.attrs.title as string;
  const blockId = node.attrs.blockId as string | null;
  const blockIndex = node.attrs.blockIndex as number | null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!documentId) return;
    const href = anchorHref({ documentId, blockId, blockIndex });
    const base = `/documents/${documentId}`;
    const fragment = href.startsWith(base) ? href.slice(base.length) : '';
    // A jump into the document we are already in must not go through the router: `pushState`
    // changes the address without firing `hashchange`, so nothing re-arms the anchor hunt and
    // the click silently does nothing. Assigning the hash is the one form that announces itself.
    if (fragment.startsWith('#') && window.location.pathname === base) {
      window.location.hash = fragment;
      return;
    }
    router.push(href);
  };

  return (
    <NodeViewWrapper
      as="span"
      className="inline"
      data-document-link={documentId}
      data-block-target={blockId ?? undefined}
      data-block-index={blockId === null && typeof blockIndex === 'number' ? blockIndex : undefined}
    >
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        {typeof blockIndex === 'number' || blockId ? (
          <Pilcrow className="size-3.5 text-muted-foreground" />
        ) : (
          <Link2 className="size-3.5 text-muted-foreground" />
        )}
        <span>{title || untitledFor('list')}</span>
      </button>
    </NodeViewWrapper>
  );
}
