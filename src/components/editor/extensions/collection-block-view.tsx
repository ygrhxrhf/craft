'use client';

import Link from 'next/link';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ArrowUpRight, Table2, Columns3, Image } from 'lucide-react';

import {
  COLLECTION_EMBED_LABELS,
  normalizeCollectionEmbedView,
  type CollectionEmbedView,
} from '@/lib/collection/embed-block';

const ICONS: Record<CollectionEmbedView, typeof Table2> = {
  table: Table2,
  gallery: Image,
  kanban: Columns3,
};

/**
 * G214：集合块。本地不在正文里渲染集合内容（那是路由屏），块是一枚指回集合对象的入口卡，
 * 与白板嵌入块同一形态。
 */
export function CollectionBlockView({ node, selected }: NodeViewProps) {
  const collectionId = node.attrs.collectionId as string | null;
  const title = (node.attrs.title as string) || '未命名集合';
  const view = normalizeCollectionEmbedView(node.attrs.view);
  const Icon = ICONS[view];

  return (
    <NodeViewWrapper className="my-2" data-collection-block={collectionId ?? ''} data-view={view}>
      <Link
        href={collectionId ? `/collections/${collectionId}` : '/collections'}
        contentEditable={false}
        tabIndex={-1}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-foreground/[0.03]"
        data-selected={selected ? 'true' : undefined}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground/6">
          <Icon className="size-3.5 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1 truncate text-body">{title}</span>
        <span className="shrink-0 text-meta text-foreground/45">{COLLECTION_EMBED_LABELS[view]}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-foreground/35" />
      </Link>
    </NodeViewWrapper>
  );
}
