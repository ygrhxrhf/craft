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

/** 服务端行 + 本地未推送意图 → 树的即时视图（重命名/删除/新建在 applyLocal 后立刻生效）。 */
export async function loadTreeDocuments(): Promise<Document[]> {
  const [data, pending] = await Promise.all([
    getDocuments(),
    readPendingRows('document'),
  ]);
  const merged = mergePending<Document>(data as Document[], pending, (id, p) => ({
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
      const data = await loadTreeDocuments();
      if (!alive) return;
      setDocuments(data);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
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
