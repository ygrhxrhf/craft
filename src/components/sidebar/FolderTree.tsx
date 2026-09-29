'use client';

import { useEffect, useState } from 'react';
import { getFolders } from '@/actions/folder/get';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { readPendingRows, mergePending } from '@/components/sync/local-records';
import { safeLoadTreeDocuments, type Document } from './DocumentTree';
import { FolderTreeItem } from './FolderTreeItem';

export interface Folder {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  isDeleted: boolean;
}

/** 纯逻辑：行集合 + 本地 pending overlay（过滤条件与 getFolders 同源）。 */
export function overlayFolderRows(
  rows: Folder[],
  pending: Map<string, import('@/components/sync/local-records').PendingRow>,
): Folder[] {
  const merged = mergePending<Folder>(rows, pending, (id) => ({
    id,
    name: '未命名文件夹',
    icon: null,
    parentId: null,
    order: 0,
    isDeleted: false,
  }));
  return merged.filter(f => !f.isDeleted);
}

async function loadTreeFolders(): Promise<Folder[]> {
  const [data, pending] = await Promise.all([
    getFolders(),
    readPendingRows('folder'),
  ]);
  return overlayFolderRows(data as Folder[], pending);
}

/**
 * I3：loader 兜底——服务端 action 失败（离线/RSC 失败）时退回
 * 「旧行 + readPendingRows overlay」，树不再悬空卡在「加载中...」。
 */
export async function safeLoadTreeFolders(prevRows: Folder[]): Promise<Folder[]> {
  try {
    return await loadTreeFolders();
  } catch {
    const pending = await readPendingRows('folder');
    return overlayFolderRows(prevRows, pending);
  }
}

export function FolderTree() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const treeVersion = useSidebarStore((s) => s.treeVersion);
  const bumpTree = useSidebarStore((s) => s.bumpTree);

  useEffect(() => {
    let alive = true;
    async function load() {
      // I3：safe 版兜底（离线 → 旧行 + pending overlay），单侧失败也不整体悬空
      const [folderData, docData] = await Promise.all([
        safeLoadTreeFolders(folders),
        safeLoadTreeDocuments(documents),
      ]);
      if (!alive) return;
      setFolders(folderData);
      setDocuments(docData);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
    // folders/documents 仅作离线兜底的旧行快照，不作为依赖（避免 overlay 后死循环）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeVersion]);

  // applyLocal 本地写 / pull 远端变化 → 重取（覆盖层保证未推送的本地意图不丢）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'folder' || table === 'document') bumpTree();
  }), [bumpTree]);

  if (loading) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">加载中...</div>;
  }

  const rootFolders = folders
    .filter(f => f.parentId === null)
    .sort((a, b) => a.order - b.order);

  if (rootFolders.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] text-muted-foreground">
        暂无文件夹
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {rootFolders.map(folder => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          allFolders={folders}
          allDocuments={documents}
          level={0}
        />
      ))}
    </div>
  );
}
