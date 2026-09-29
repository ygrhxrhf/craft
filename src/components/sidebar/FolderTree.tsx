'use client';

import { useEffect, useState } from 'react';
import { getFolders } from '@/actions/folder/get';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { readPendingRows, mergePending } from '@/components/sync/local-records';
import { loadTreeDocuments, type Document } from './DocumentTree';
import { FolderTreeItem } from './FolderTreeItem';

export interface Folder {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  isDeleted: boolean;
}

async function loadTreeFolders(): Promise<Folder[]> {
  const [data, pending] = await Promise.all([
    getFolders(),
    readPendingRows('folder'),
  ]);
  const merged = mergePending<Folder>(data as Folder[], pending, (id) => ({
    id,
    name: '未命名文件夹',
    icon: null,
    parentId: null,
    order: 0,
    isDeleted: false,
  }));
  return merged.filter(f => !f.isDeleted);
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
      const [folderData, docData] = await Promise.all([
        loadTreeFolders(),
        loadTreeDocuments(),
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
