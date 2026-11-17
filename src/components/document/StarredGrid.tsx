'use client';

import { useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from '@/components/document/DocumentCard';
import { DocumentListView } from '@/components/document/DocumentListView';
import {
  readViewMode,
  serverViewMode,
  subscribeViewMode,
} from '@/lib/browse/view-modes';
import { getSyncManager } from '@/lib/sync-core';
import { orderAfterDrop, orderPatches } from '@/lib/document/sibling-order';
import { useDragArm } from '@/lib/dnd/use-drag-arm';

interface StarredDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  favoriteId: string;
  /** G216: 服务端生成的签名预览 URL。 */
  previewSrc?: string | null;
}

interface StarredGridProps {
  documents: StarredDoc[];
  /** 卡片副行「已更新 N」的时钟基准，由服务端页面算一次传下来（hydration 安全）。 */
  now: number;
}

/**
 * G94：收藏区有自己的**整批顺序**（`starred_reorder`）——拖一张卡，就把这一区的新顺序
 * 一次性写进 `favorite.order`（0…n-1），与侧栏文档树同一条"整批而非中点"的口径。
 */
export function StarredGrid({ documents, now }: StarredGridProps) {
  const router = useRouter();
  const [items, setItems] = useState(documents);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<{ index: number; after: boolean } | null>(null);
  // G56：触摸端长按走合成的拖拽事件，桌面仍由原生 HTML5 拖拽接管。
  const dragArm = useDragArm('general');

  const commitOrder = async (next: StarredDoc[]) => {
    setItems(next);
    const patches = orderPatches(next.map((doc) => doc.favoriteId));
    const manager = getSyncManager();
    for (const patch of patches) {
      await manager.applyLocal({ table: 'favorite', id: patch.id, patch: { order: patch.order } });
    }
    await manager.flushNow();
    router.refresh();
  };

  const handleDrop = async (targetIndex: number, after: boolean) => {
    if (dragging === null) return;
    const dragged = items[dragging];
    const target = items[targetIndex];
    setDragging(null);
    setDropAt(null);
    if (!dragged || !target || dragged.favoriteId === target.favoriteId) return;

    const ids = orderAfterDrop(
      items.map((doc, index) => ({ id: doc.favoriteId, order: index })),
      dragged.favoriteId,
      target.favoriteId,
      after ? 'after' : 'before',
    );
    const byFavorite = new Map(items.map((doc) => [doc.favoriteId, doc]));
    const next = ids.map((id) => byFavorite.get(id)).filter((doc): doc is StarredDoc => Boolean(doc));
    if (next.length === items.length) await commitOrder(next);
  };

  // G1655：官方收藏屏与其它浏览屏共用同一组三档布局切换（网格／列表／瀑布），
  // 偏好沿用 `craft.browse.viewMode` 这一处存储。
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, serverViewMode);

  const renderTile = (doc: StarredDoc, index: number) => (
    <div
      key={doc.favoriteId}
      draggable
      data-testid={`starred-card-${doc.favoriteId}`}
      onPointerDown={dragArm.onPointerDown}
      onPointerMove={dragArm.onPointerMove}
      onPointerUp={dragArm.onPointerUp}
      onDragStart={() => setDragging(index)}
      onDragEnd={() => {
        setDragging(null);
        setDropAt(null);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setDropAt({ index, after: event.clientY > rect.top + rect.height / 2 });
      }}
      onDragLeave={() => setDropAt(null)}
      onDrop={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        void handleDrop(index, event.clientY > rect.top + rect.height / 2);
      }}
      className={
        dragging === index
          ? 'opacity-50'
          : dropAt?.index === index
            ? dropAt.after
              ? 'border-b-2 border-craft-accent'
              : 'border-t-2 border-craft-accent'
            : ''
      }
    >
      <DocumentCard document={doc} now={now} />
    </div>
  );

  return (
    <div>
      {/* 切换器挂在页头（BrowseViewModeBar），这里只按档渲染内容。 */}
      {viewMode === 'list' ? (
        <DocumentListView
          documents={items.map(({ id, title, icon, updatedAt }) => ({ id, title, icon, updatedAt }))}
          now={now}
        />
      ) : viewMode === 'waterfall' ? (
        <div data-testid="starred-waterfall" className="columns-2 gap-5 md:columns-3 xl:columns-4">
          {items.map((doc, index) => (
            <div key={doc.favoriteId} className="mb-5 break-inside-avoid">
              {renderTile(doc, index)}
            </div>
          ))}
        </div>
      ) : (
        <BrowseGrid>{items.map((doc, index) => renderTile(doc, index))}</BrowseGrid>
      )}
    </div>
  );
}
