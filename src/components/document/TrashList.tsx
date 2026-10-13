'use client';

import { useEffect, useState } from 'react';
import { Check, File, Minus, RotateCcw, Trash2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { permanentDeleteDocument } from '@/actions/document/delete';
import { bulkDeleteAlert, bulkRestoreAlert, runBulkAction } from '@/lib/document/bulk-action';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import { getDeletedDocuments } from '@/actions/document/get';
import { TRASH_DISCLAIMER, TRASH_EMPTY } from '@/lib/browse/trash-copy';
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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const allSelected = selected.size === rows.length;
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(d => d.id)));
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function runSelected(
    action: (id: string) => Promise<void>,
    alert: (failedCount: number, totalCount: number) => string | null,
  ) {
    const ids = [...selected];
    setBusy(true);
    try {
      // Partial success: every selected document is attempted, and the alert names how many
      // failed instead of stopping at the first rejection.
      const outcome = await runBulkAction(ids, action);
      const title = alert(outcome.failed.length, ids.length);
      if (title) {
        // The official aggregate copy is the headline; the first rejection stays visible as the
        // description, which is what the batch path and the single-row path both report.
        toast.add({
          title,
          description: outcome.failed[0]?.message,
          type: 'error',
        });
      }
    } finally {
      setBusy(false);
      setConfirmOpen(false);
      exitSelection();
      router.refresh();
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[15px] bg-foreground/[0.03] px-6 text-center">
        <Trash2 className="mx-auto mb-2 size-8 text-foreground/40" />
        <p className="text-ui font-medium text-foreground/40">{TRASH_EMPTY}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={e => {
        if (e.key === 'Escape' && selecting) exitSelection();
      }}
    >
      {/* The 30-day line is conditional: the official screen only shows it once the trash has
          something in it, not in the empty state. */}
      <p className="text-meta text-foreground/55">{TRASH_DISCLAIMER}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        {selecting ? (
          <>
            <span className="text-ui text-foreground/55">
              已选 {selected.size} 项
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="还原所选"
              title="还原所选"
              disabled={!someSelected || busy}
              onClick={() => runSelected(handleRestore, (failed) => bulkRestoreAlert(failed))}
            >
              <RotateCcw />
            </Button>
            <Button
              variant="destructive"
              size="icon-sm"
              aria-label="永久删除所选"
              title="永久删除所选"
              disabled={!someSelected || busy}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-md text-ui"
            onClick={() => setSelecting(true)}
          >
            选择
          </Button>
        )}
      </div>

      {selecting && (
        <button
          type="button"
          role="checkbox"
          aria-checked={allSelected ? true : someSelected ? 'mixed' : false}
          aria-label="全选"
          onClick={toggleAll}
          className="flex w-fit items-center gap-2 text-ui text-foreground/55"
        >
          <SelectionMark state={allSelected ? 'on' : someSelected ? 'mixed' : 'off'} />
          全选
        </button>
      )}

      {rows.map(doc => {
        const deletedDate = doc.deletedAt
          ? new Date(doc.deletedAt).toLocaleDateString('zh-CN')
          : '';
        const isChecked = selected.has(doc.id);

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-foreground/[0.03]"
          >
            {selecting ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                aria-label={`选择 ${doc.title || '无标题文档'}`}
                onClick={() => toggle(doc.id)}
                className="shrink-0"
              >
                <SelectionMark state={isChecked ? 'on' : 'off'} />
              </button>
            ) : (
              doc.icon ? (
                <span className="text-xl">{doc.icon}</span>
              ) : (
                <File className="size-5 shrink-0 text-foreground/40" />
              )
            )}
            <div className="flex-1 truncate">
              <p className="truncate text-body font-medium">{doc.title}</p>
              <p className="text-meta text-foreground/55">
                删除于 {deletedDate}
              </p>
            </div>
            {!selecting && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-md text-ui hover:bg-foreground/4"
                onClick={() => handleRestore(doc.id)
                  .catch((error: unknown) => toast.add({
                    title: error instanceof Error ? error.message : '恢复失败',
                    type: 'error',
                  }))}
              >
                恢复
              </Button>
            )}
          </div>
        );
      })}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              删除 {selected.size} 个项目 你确定吗？你无法撤销此操作。
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => runSelected(permanentDeleteDocument, bulkDeleteAlert)}
            >
              {busy ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectionMark({ state }: { state: 'on' | 'off' | 'mixed' }) {
  if (state === 'on') {
    return (
      <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" />
      </span>
    );
  }
  if (state === 'mixed') {
    return (
      <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Minus className="size-3" />
      </span>
    );
  }
  return (
    <span className="block size-[18px] rounded-full border border-foreground/25" />
  );
}
