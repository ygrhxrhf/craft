'use client';

import { useEffect, useState } from 'react';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { useSidebarSnapshot } from '@/lib/sidebar/use-sidebar-snapshot';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import { overlayDocumentRows, type Document } from './DocumentTree';
import { folderDocumentCounts } from '@/lib/browse/folder-counts';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';
import { FolderTreeItem } from './FolderTreeItem';
import { LOADING } from '@/lib/browse/official-copy';

export interface Folder {
  id: string;
  name: string;
  icon: string | null;
  /** G338：文件夹描述。 */
  description?: string | null;
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
    name: UNTITLED_FOLDER,
    icon: null,
    parentId: null,
    order: 0,
    isDeleted: false,
  }));
  return merged.filter(f => !f.isDeleted);
}

export function FolderTree() {
  const snapshot = useSidebarSnapshot();
  const bumpTree = useSidebarStore((s) => s.bumpTree);
  const [pendingFolders, setPendingFolders] = useState<Map<string, PendingRow>>(new Map());
  const [pendingDocs, setPendingDocs] = useState<Map<string, PendingRow>>(new Map());

  // 未推送的本地意图（applyLocal 后立刻可见）；快照每次更新后重读
  useEffect(() => {
    let alive = true;
    Promise.all([readPendingRows('folder'), readPendingRows('document')]).then(([f, d]) => {
      if (!alive) return;
      setPendingFolders(f);
      setPendingDocs(d);
    });
    return () => {
      alive = false;
    };
  }, [snapshot]);

  // applyLocal 本地写 / pull 远端变化 → 重取（覆盖层保证未推送的本地意图不丢）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'folder' || table === 'document') bumpTree();
  }), [bumpTree]);

  if (!snapshot) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">{LOADING}</div>;
  }

  const folders = overlayFolderRows(snapshot.folders as Folder[], pendingFolders);
  const documents = overlayDocumentRows(snapshot.documents as Document[], pendingDocs);
  const documentCounts = folderDocumentCounts(folders, documents);

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
          documentCounts={documentCounts}
          level={0}
        />
      ))}
    </div>
  );
}
