'use client';

import { useEffect, useState } from 'react';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, type PendingRow } from '@/components/sync/local-records';
import { overlayDocumentRows, type Document } from '@/components/sidebar/DocumentTree';
import { unsortedDocuments } from '@/lib/browse/inbox';
import { INBOX_EMPTY } from '@/lib/browse/official-copy';
import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from './DocumentCard';

/** The card needs a signed preview; `buildPreviewSrc` runs on the server in `inbox/page.tsx`. */
export interface InboxDocument extends Document {
  previewSrc: string | null;
}

interface InboxListProps {
  documents: InboxDocument[];
  /** 卡片副行「已更新 N」的时钟基准，由服务端页面算一次传下来（hydration 安全）。 */
  now: number;
}

/**
 * G19：官方收件箱是**卡片网格**（208×260，与「所有文档」同一张卡），不是本地此前那种 40 高
 * 列表行。标题下只有一行副标题（`已更新 N`，没有位置——它们本来就没有位置），唯一动作是
 * 卡片的右键菜单（「移至…」把文档归档到某个文件夹）。
 */
export function InboxList({ documents, now }: InboxListProps) {
  const [pending, setPending] = useState<Map<string, PendingRow>>(new Map());

  // 未推送的本地意图也要立刻反映在列表里（归档后该行就离开未分类）
  useEffect(() => {
    let alive = true;
    readPendingRows('document').then((rows) => {
      if (alive) setPending(rows);
    });
    return () => {
      alive = false;
    };
  }, [documents]);

  useEffect(
    () =>
      getSyncManager().onStoreChanged((table) => {
        if (table !== 'document') return;
        readPendingRows('document').then(setPending);
      }),
    []
  );

  const rows = unsortedDocuments(overlayDocumentRows(documents, pending));
  // pending-only 的行还没有服务端数据，也就没有签名预览——按 id 取，取不到就不画预览层。
  const previewById = new Map(documents.map((doc) => [doc.id, doc.previewSrc]));

  if (rows.length === 0) {
    return <p className="text-ui leading-[15.6px] text-foreground/55">{INBOX_EMPTY}</p>;
  }

  return (
    <BrowseGrid>
      {rows.map((doc) => (
        <DocumentCard
          key={doc.id}
          now={now}
          document={{
            id: doc.id,
            title: doc.title,
            icon: doc.icon,
            updatedAt: doc.updatedAt,
            previewSrc: previewById.get(doc.id) ?? null,
          }}
        />
      ))}
    </BrowseGrid>
  );
}
