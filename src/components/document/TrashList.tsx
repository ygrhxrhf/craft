'use client';

import { useEffect, useState } from 'react';
import { File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import { getDeletedDocuments } from '@/actions/document/get';
import { useRouter } from 'next/navigation';

interface TrashDoc {
  id: string;
  title: string;
  icon: string | null;
  deletedAt: string | null;
}

interface TrashListProps {
  documents: TrashDoc[];
}

/** 纯逻辑：服务端删除行 + 本地未推送意图 → 回收站行（过滤条件同 getDeletedDocuments）。 */
export function overlayTrashRows(serverDocs: TrashDoc[], pending: Map<string, PendingRow>): TrashDoc[] {
  const merged = mergePending<TrashDoc>(serverDocs, pending, (id, p) => ({
    id,
    title: '无标题',
    icon: null,
    deletedAt: null,
    ...(p.data as Partial<TrashDoc>),
  }));
  // getDeletedDocuments 按 isDeleted/deletedAt 过滤；pending 行要补同样的过滤
  return merged.filter(d => d.deletedAt !== null && (d as { isDeleted?: boolean }).isDeleted !== false);
}

async function overlayOnProps(serverDocs: TrashDoc[]): Promise<TrashDoc[]> {
  return overlayTrashRows(serverDocs, await readPendingRows('document'));
}

/** R-18：重取服务端权威删除行，再盖 pending overlay（ack+pull 后恢复的不回流、新删的带真实标题）。 */
export async function loadTrashRows(): Promise<TrashDoc[]> {
  const [fresh, pending] = await Promise.all([
    getDeletedDocuments(),
    readPendingRows('document'),
  ]);
  return overlayTrashRows(fresh, pending);
}

export function TrashList({ documents }: TrashListProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TrashDoc[]>(documents);

  // 首屏 / router.refresh 后的新 prop 行：只做本地 overlay（不发服务端 action，离线安全）
  useEffect(() => {
    let alive = true;
    overlayOnProps(documents).then((merged) => {
      if (alive) setRows(merged);
    });
    return () => {
      alive = false;
    };
  }, [documents]);

  // 恢复（applyLocal）/ 删除入站 / ack+pull → 在线时重取服务端权威行再 overlay（R-18）；
  // 离线不发服务端 action，退回本地 overlay（刚移入/恢复的意图仍然即时可见）
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table !== 'document') return;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    (offline ? overlayOnProps(documents) : loadTrashRows())
      .then(setRows)
      .catch(() => {});
  }), [documents]);

  async function handleRestore(id: string) {
    // 恢复 → applyLocal（patch: isDeleted:false, deletedAt:null）
    await getSyncManager().applyLocal({
      table: 'document',
      id,
      patch: { isDeleted: false, deletedAt: null },
    });
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[15px] bg-foreground/[0.03] px-6 text-center">
        <Trash2 className="mx-auto mb-2 size-8 text-foreground/40" />
        <p className="text-ui font-medium text-foreground/40">回收站是空的</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(doc => {
        const deletedDate = doc.deletedAt
          ? new Date(doc.deletedAt).toLocaleDateString('zh-CN')
          : '';

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-foreground/[0.03]"
          >
            {doc.icon ? (
              <span className="text-xl">{doc.icon}</span>
            ) : (
              <File className="size-5 shrink-0 text-foreground/40" />
            )}
            <div className="flex-1 truncate">
              <p className="truncate text-body font-medium">{doc.title}</p>
              <p className="text-meta text-foreground/55">
                删除于 {deletedDate}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md text-ui hover:bg-foreground/4"
              onClick={() => handleRestore(doc.id)}
            >
              恢复
            </Button>
          </div>
        );
      })}
    </div>
  );
}
