'use client';

import { useEffect, useState } from 'react';
import { getDocuments } from '@/actions/document/get';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { readPendingRows, mergePending } from '@/components/sync/local-records';
import { DocumentTreeItem } from './DocumentTreeItem';

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
    title: '无标题',
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

/** 服务端行 + 本地未推送意图 → 树的即时视图（重命名/删除/新建在 applyLocal 后立刻生效）。 */
export async function loadTreeDocuments(): Promise<Document[]> {
  const [data, pending] = await Promise.all([
    getDocuments(),
    readPendingRows('document'),
  ]);
  return overlayDocumentRows(data as Document[], pending);
}

/**
 * I3：loader 兜底——服务端 action 失败（离线/RSC 失败）时退回
 * 「旧行 + readPendingRows overlay」，不再让 Promise 悬空把树卡死在「加载中...」。
 */
export async function safeLoadTreeDocuments(prevRows: Document[]): Promise<Document[]> {
  try {
    return await loadTreeDocuments();
  } catch {
    const pending = await readPendingRows('document');
    return overlayDocumentRows(prevRows, pending);
  }
}

interface DocumentTreeProps {
  folderId?: string | null;
}

export function DocumentTree({ folderId = null }: DocumentTreeProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const treeVersion = useSidebarStore((s) => s.treeVersion);
  const bumpTree = useSidebarStore((s) => s.bumpTree);

  useEffect(() => {
    let alive = true;
    async function load() {
      // I3：safe 版兜底（离线 → 旧行 + pending overlay），失败也不会悬空
      const data = await safeLoadTreeDocuments(documents);
      if (!alive) return;
      setDocuments(data);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
    // documents 仅作离线兜底的旧行快照，不作为依赖（避免 overlay 后死循环）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeVersion]);

  // applyLocal 本地写 / pull 远端变化 → 重取（覆盖层保证未推送的本地意图不丢）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'document') bumpTree();
  }), [bumpTree]);

  if (loading) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">加载中...</div>;
  }

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
