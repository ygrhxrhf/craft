'use client';

import { useEffect, useState } from 'react';

import { getSyncManager, type SyncStatus } from '@/lib/sync-core';
import { readLocalRecords, readPendingRows } from '@/components/sync/local-records';
import { offlineBadgeForDoc, offlineBadgeLabel } from '@/lib/sync/offline-badge';
import { cn } from 'cn';

/**
 * G237：列表行上的离线徽标（三态）。队列与本地镜像都在 IndexedDB 里，所以每次同步状态变化
 * 重读一次；读不到（库不可用）就退化成「无徽标」，不阻塞列表。
 */
export function OfflineBadge({
  documentId,
  listedUpdatedAt,
  className,
}: {
  documentId: string;
  listedUpdatedAt: string;
  className?: string;
}) {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [hasPendingWrite, setHasPendingWrite] = useState(false);
  const [mirrorUpdatedAt, setMirrorUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [pending, mirror] = await Promise.all([
        readPendingRows('document'),
        readLocalRecords('document'),
      ]);
      if (!alive) return;
      setHasPendingWrite(pending.has(documentId));
      setMirrorUpdatedAt(
        (mirror.find((row) => row.id === documentId)?.data?.updatedAt as string | undefined) ?? null,
      );
    };
    void refresh();
    return () => {
      alive = false;
    };
  }, [documentId, listedUpdatedAt, status]);

  useEffect(
    () =>
      getSyncManager().subscribe((next) => {
        setStatus(next);
      }),
    [],
  );

  const label = offlineBadgeLabel(
    offlineBadgeForDoc({
      offline: status === 'offline',
      hasPendingWrite,
      mirrorUpdatedAt,
      listedUpdatedAt,
    }),
  );
  if (!label) return null;

  return (
    <span
      data-testid="offline-badge"
      className={cn(
        'rounded bg-foreground/8 px-1.5 py-0.5 text-[10px] text-foreground/55',
        className,
      )}
    >
      {label}
    </span>
  );
}
