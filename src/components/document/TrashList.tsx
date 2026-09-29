'use client';

import { useEffect, useState } from 'react';
import { File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, mergePending } from '@/components/sync/local-records';
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

/** 回收站视图 = 服务端删除行 + 本地未推送意图（刚移入的进来、恢复的先消失）。 */
async function mergeTrashRows(serverDocs: TrashDoc[]): Promise<TrashDoc[]> {
  const pending = await readPendingRows('document');
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

export function TrashList({ documents }: TrashListProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TrashDoc[]>(documents);

  useEffect(() => {
    let alive = true;
    mergeTrashRows(documents).then((merged) => {
      if (alive) setRows(merged);
    });
    return () => {
      alive = false;
    };
  }, [documents]);

  // 恢复（applyLocal）/ 删除入站 → 重算列表
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table !== 'document') return;
    mergeTrashRows(documents).then(setRows).catch(() => {});
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
