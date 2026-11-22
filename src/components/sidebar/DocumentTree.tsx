'use client';

import { useEffect, useState } from 'react';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { useSidebarSnapshotState } from '@/lib/sidebar/use-sidebar-snapshot';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import { DocumentTreeItem } from './DocumentTreeItem';
import { CollapseRow } from './CollapseRow';
import { untitledFor } from '@/lib/document/untitled-copy';
import { SidebarSectionPlaceholder } from './SidebarSectionPlaceholder';
import { SECTION_COLLAPSE_THRESHOLD, collapseSection } from '@/lib/browse/section-collapse';

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
  const { snapshot, failed, retry } = useSidebarSnapshotState();
  const bumpTree = useSidebarStore((s) => s.bumpTree);
  const [pending, setPending] = useState<Map<string, PendingRow>>(new Map());
  // G391：分区超过硬编码阈值时收成"前 N 行 + 折叠行"，折叠行可再展开。
  const [showAllRows, setShowAllRows] = useState(false);
  const [mirrorVersion, setMirrorVersion] = useState(0);

  // 未推送的本地意图（applyLocal 后立刻可见）。
  // ☆ 只挂在 `[snapshot]` 上是不够的：重取是 server action，Next 按页面串行排队，
  //   本地写完到这份快照回来之间隔着别的 action（编辑器派生表、收藏兜底），实测可达 20s。
  //   所以镜像一有变动就重读一次——pending 还在时这一读就带出新标题，ack 之后
  //   pending 清空则由紧随其后的快照接上（ack 不触发本信号，不会读到"空覆盖层 + 旧行"）。
  useEffect(() => {
    let alive = true;
    readPendingRows('document').then((p) => {
      if (alive) setPending(p);
    });
    return () => {
      alive = false;
    };
  }, [snapshot, mirrorVersion]);

  // applyLocal 本地写 / pull 远端变化 → 覆盖层重读 + 重取（远端行只存在于快照里）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table !== 'document') return;
    setMirrorVersion((v) => v + 1);
    bumpTree();
  }), [bumpTree]);

  if (!snapshot) {
    return <SidebarSectionPlaceholder failed={failed} onRetry={retry} />;
  }

  const documents = overlayDocumentRows(snapshot.documents as Document[], pending);
  const rootDocuments = documents
    .filter(d => d.folderId === folderId && d.parentId === null)
    .sort((a, b) => a.order - b.order);

  if (rootDocuments.length === 0) {
    return null;
  }

  const section = collapseSection(rootDocuments, SECTION_COLLAPSE_THRESHOLD, showAllRows);

  return (
    <div className="flex flex-col gap-0.5">
      {section.visible.map(doc => (
        <DocumentTreeItem
          key={doc.id}
          document={doc}
          allDocuments={documents}
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
