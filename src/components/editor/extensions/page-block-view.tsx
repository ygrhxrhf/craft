'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { FileText } from 'lucide-react';

import { createDocument } from '@/actions/document/create';
import { PAGE_PREVIEW_COPY } from '@/lib/editor/style-keys';

/**
 * G1584：页面预览块。带 `documentId` 时点开已有子页；还没有子页时，点一下才真正创建
 *（本地子页是带 `parentId` 的文档，正文里只存这枚指针）。
 */
export function PageBlockView({ node, editor, updateAttributes, selected }: NodeViewProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const documentId = node.attrs.documentId as string | null;
  const title = (node.attrs.title as string) || '';

  const open = async () => {
    if (documentId) {
      router.push(`/documents/${documentId}`);
      return;
    }
    const hostDocumentId = editor.storage.pageBlock?.hostDocumentId;
    if (!hostDocumentId || busy) return;
    setBusy(true);
    try {
      const created = await createDocument({ parentId: hostDocumentId });
      updateAttributes({ documentId: created.id, title: created.title ?? '' });
      router.push(`/documents/${created.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NodeViewWrapper
      className="craft-page-block my-2"
      data-page-block-empty={title ? 'false' : 'true'}
      data-selected={selected ? 'true' : undefined}
    >
      <button
        type="button"
        contentEditable={false}
        disabled={busy}
        onClick={() => void open()}
        aria-label={title || PAGE_PREVIEW_COPY}
        className="flex w-full items-start gap-3 rounded-lg border border-foreground/8 bg-card px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
      >
        <FileText className="mt-0.5 size-4 shrink-0 text-foreground/40" />
        <span className={title ? 'text-body font-medium' : 'text-body text-foreground/45'}>
          {title || PAGE_PREVIEW_COPY}
        </span>
      </button>
    </NodeViewWrapper>
  );
}
