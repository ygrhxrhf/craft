'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from '@/components/document/DocumentCard';
import { getSyncManager } from '@/lib/sync-core';
import { orderAfterDrop, orderPatches } from '@/lib/document/sibling-order';

interface StarredDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  favoriteId: string;
}

interface StarredGridProps {
  documents: StarredDoc[];
}

/**
 * G94：收藏区有自己的**整批顺序**（`starred_reorder`）——拖一张卡，就把这一区的新顺序
 * 一次性写进 `favorite.order`（0…n-1），与侧栏文档树同一条"整批而非中点"的口径。
 */
export function StarredGrid({ documents }: StarredGridProps) {
  const router = useRouter();
  const [items, setItems] = useState(documents);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<{ index: number; after: boolean } | null>(null);

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

  return (
    <BrowseGrid>
      {items.map((doc, index) => (
        <div
          key={doc.favoriteId}
          draggable
          data-testid={`starred-card-${doc.favoriteId}`}
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
          <DocumentCard document={doc} />
        </div>
      ))}
    </BrowseGrid>
  );
}
