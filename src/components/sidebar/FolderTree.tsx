'use client';

import { FolderTreeItem } from './FolderTreeItem';
import { useSidebarSnapshot } from '@/lib/sidebar/use-sidebar-snapshot';
import type { Document } from './DocumentTree';

export interface Folder {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  isDeleted: boolean;
}

export function FolderTree() {
  const snapshot = useSidebarSnapshot();

  if (!snapshot) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">加载中...</div>;
  }

  const folders = snapshot.folders as Folder[];
  const documents = snapshot.documents as Document[];

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
