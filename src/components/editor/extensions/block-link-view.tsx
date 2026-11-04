'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import { Link2, Pencil, Pilcrow, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { anchorHref } from '@/lib/editor/block-anchor';
import { untitledFor } from '@/lib/document/untitled-copy';

export function BlockLinkView({ node, editor, updateAttributes, deleteNode }: NodeViewProps) {
  const router = useRouter();
  // G453：已插入的区块链接要能改名或移除（官方存的是 {name,url} 快照；本地刻意留活引用）。
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const documentId = node.attrs.documentId as string;
  const title = node.attrs.title as string;
  const blockId = node.attrs.blockId as string | null;
  const blockIndex = node.attrs.blockIndex as number | null;
  // G145：官方「访客可以跳转区块链接」默认关，关着时公开页上的**跨文档**链接不动作
  //（同文档锚点不受影响——它不是跨文档权限）。读 storage 而不是渲染时快照：开关变化不重建编辑器。
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!documentId) return;
    const hostDocumentId = editor.storage.blockLink?.hostDocumentId ?? '';
    const followOthers = editor.storage.blockLink?.followOtherDocuments !== false;
    if (documentId !== hostDocumentId && !followOthers) return;
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
      className="relative inline"
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
      <button
        type="button"
        aria-label="编辑区块链接"
        data-testid="block-link-edit"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDraft(title ?? '');
          setEditing((value) => !value);
        }}
        className="ml-0.5 inline-flex size-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-foreground/8 hover:text-foreground"
      >
        <Pencil className="size-3" />
      </button>
      {editing && (
        <span
          data-testid="block-link-editor"
          className="absolute left-0 top-full z-40 mt-1 flex w-64 items-center gap-1 rounded-lg border border-border bg-background p-1.5 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            autoFocus
            value={draft}
            aria-label="链接标题"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                updateAttributes({ title: draft.trim() || title });
                setEditing(false);
              }
              if (event.key === 'Escape') {
                event.stopPropagation();
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="button"
            onClick={() => {
              updateAttributes({ title: draft.trim() || title });
              setEditing(false);
            }}
            className="rounded bg-craft-accent px-2 py-0.5 text-[12px] text-white"
          >
            保存
          </button>
          <button
            type="button"
            aria-label="移除链接"
            onClick={() => {
              setEditing(false);
              deleteNode();
            }}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
          >
            <X className="size-3.5" />
          </button>
        </span>
      )}
    </NodeViewWrapper>
  );
}
