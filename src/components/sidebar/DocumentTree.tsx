'use client';

import { useEffect, useState } from 'react';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { useSidebarSnapshot } from '@/lib/sidebar/use-sidebar-snapshot';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import { DocumentTreeItem } from './DocumentTreeItem';
import { untitledFor } from '@/lib/document/untitled-copy';

export interface Document {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  folderId: string | null;
  isDeleted: boolean;
  isDailyNote: boolean;
  updatedAt: string;
  order: number;
}

/** 纯逻辑：行集合 + 本地 pending overlay（过滤条件与 getDocuments 同源）。 */
export function overlayDocumentRows(
  rows: Document[],
  pending: Map<string, import('@/components/sync/local-records').PendingRow>,
): Document[] {
  const merged = mergePending<Document>(rows, pending, (id, p) => ({
    id,
    title: untitledFor('list'),
    icon: null,
    parentId: null,
    folderId: null,
    isDeleted: false,
    isDailyNote: false,
    updatedAt: p.syncTs,
    order: 0,
  }));
  // 服务端 action 已按这些条件过滤；pending 合并进来的行要补同样的过滤
  return merged.filter(d => !d.isDeleted && !d.isDailyNote);
}

interface DocumentTreeProps {
  folderId?: string | null;
}

export function DocumentTree({ folderId = null }: DocumentTreeProps) {
  const snapshot = useSidebarSnapshot();
  const bumpTree = useSidebarStore((s) => s.bumpTree);
  const [pending, setPending] = useState<Map<string, PendingRow>>(new Map());

  // 未推送的本地意图（applyLocal 后立刻可见）；快照每次更新后重读
  useEffect(() => {
    let alive = true;
    readPendingRows('document').then((p) => {
      if (alive) setPending(p);
    });
    return () => {
      alive = false;
    };
  }, [snapshot]);

  // applyLocal 本地写 / pull 远端变化 → 重取（覆盖层保证未推送的本地意图不丢）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'document') bumpTree();
  }), [bumpTree]);

  if (!snapshot) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">加载中...</div>;
  }

  const documents = overlayDocumentRows(snapshot.documents as Document[], pending);
  const rootDocuments = documents
    .filter(d => d.folderId === folderId && d.parentId === null)
    .sort((a, b) => a.order - b.order);

  if (rootDocuments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {rootDocuments.map(doc => (
        <DocumentTreeItem
          key={doc.id}
          document={doc}
          allDocuments={documents}
          level={0}
        />
      ))}
    </div>
  );
}
