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
import { CollapseRow } from './CollapseRow';
import { LOADING } from '@/lib/browse/official-copy';
import { SECTION_COLLAPSE_THRESHOLD, collapseSection } from '@/lib/browse/section-collapse';
import { compareFolderOrder } from '@/lib/folder/order';

export interface Folder {
  id: string;
  name: string;
  icon: string | null;
  /** G338：文件夹描述。 */
  description?: string | null;
  parentId: string | null;
  order: number;
  isDeleted: boolean;
  createdAt?: string | null;
}

/** 纯逻辑：行集合 + 本地 pending overlay（过滤条件与 getFolders 同源）。 */
export function overlayFolderRows(
  rows: Folder[],
  pending: Map<string, import('@/components/sync/local-records').PendingRow>,
): Folder[] {
  const merged = mergePending<Folder>(rows, pending, (id, p) => ({
    id,
    name: UNTITLED_FOLDER,
    icon: null,
    parentId: null,
    order: 0,
    isDeleted: false,
    // 与服务端行的排序位对齐：新行 order 0、createdAt 最新 ⇒ 排在并列组末尾，
    // ack 前后位置不跳（DocumentTree 的 pending 骨架同理用 syncTs）。
    createdAt: p.syncTs,
  }));
  return merged.filter(f => !f.isDeleted);
}

export function FolderTree() {
  const snapshot = useSidebarSnapshot();
  const bumpTree = useSidebarStore((s) => s.bumpTree);
  const [pendingFolders, setPendingFolders] = useState<Map<string, PendingRow>>(new Map());
  const [pendingDocs, setPendingDocs] = useState<Map<string, PendingRow>>(new Map());
  // G391：与文档分区共用同一枚折叠行与阈值。
  const [showAllRows, setShowAllRows] = useState(false);
  const [mirrorVersion, setMirrorVersion] = useState(0);

  // 未推送的本地意图（applyLocal 后立刻可见）。
  // ☆ 只挂在 `[snapshot]` 上不够：重取是 server action，Next 按页面串行排队，本地写要等
  //   排在它前面的 action 跑完才上屏；镜像一变就重读，pending 在时当场带出本地值。
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
  }, [snapshot, mirrorVersion]);

  // applyLocal 本地写 / pull 远端变化 → 覆盖层重读 + 重取（远端行只存在于快照里）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table !== 'folder' && table !== 'document') return;
    setMirrorVersion((v) => v + 1);
    bumpTree();
  }), [bumpTree]);

  if (!snapshot) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">{LOADING}</div>;
  }

  const folders = overlayFolderRows(snapshot.folders as Folder[], pendingFolders);
  const documents = overlayDocumentRows(snapshot.documents as Document[], pendingDocs);
  const documentCounts = folderDocumentCounts(folders, documents);

  const rootFolders = folders
    .filter(f => f.parentId === null)
    .sort(compareFolderOrder);

  if (rootFolders.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] text-muted-foreground">
        暂无文件夹
      </div>
    );
  }

  const section = collapseSection(rootFolders, SECTION_COLLAPSE_THRESHOLD, showAllRows);

  return (
    <div className="flex flex-col gap-0.5">
      {section.visible.map(folder => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          allFolders={folders}
          allDocuments={documents}
          documentCounts={documentCounts}
          level={0}
        />
      ))}
      {section.collapsible && (
        <CollapseRow
          isExpanded={showAllRows}
          remainingCount={section.remainingCount}
          onToggle={() => setShowAllRows((open) => !open)}
        />
      )}
    </div>
  );
}
