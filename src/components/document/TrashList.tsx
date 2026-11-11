'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, File, Minus, MoreHorizontal, RotateCcw, Trash2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { emptyTrash, permanentDeleteDocument } from '@/actions/document/delete';
import { bulkDeleteAlert, bulkRestoreAlert, runBulkAction } from '@/lib/document/bulk-action';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import { getDeletedDocuments } from '@/actions/document/get';
import { TRASH_DISCLAIMER, TRASH_EMPTY } from '@/lib/browse/trash-copy';
import { visibleRowWindow, scheduleScrollUpdate } from '@/lib/collection/virtual-rows';
import {
  COULD_NOT_DELETE_DOCUMENT,
  EMPTY_TRASH_ACTION,
  EMPTY_TRASH_CONFIRM,
  PERMANENT_DELETE_DOCUMENT,
} from '@/lib/browse/trash-subcopy';
import { useRouter } from 'next/navigation';
import { untitledFor } from '@/lib/document/untitled-copy';
import { pendingLabel } from '@/lib/app/pending-states';
import { rowSubtitle } from '@/lib/browse/row-subtitle';

interface TrashDoc {
  id: string;
  title: string;
  icon: string | null;
  deletedAt: string | null;
  /** G997: the stored plain-text snapshot the row's summary line renders. */
  plainText?: string | null;
}

const TRASH_VIRTUAL_THRESHOLD = 60;
/** Row step 42 = 40 row + 2 gap, the same 40/8/42 geometry the other list surfaces use. */
const TRASH_ROW_STEP = 42;
const TRASH_VIEWPORT_HEIGHT = 480;

interface TrashListProps {
  documents: TrashDoc[];
}

/** 纯逻辑：服务端删除行 + 本地未推送意图 → 回收站行（过滤条件同 getDeletedDocuments）。 */
export function overlayTrashRows(serverDocs: TrashDoc[], pending: Map<string, PendingRow>): TrashDoc[] {
  const merged = mergePending<TrashDoc>(serverDocs, pending, (id, p) => ({
    id,
    title: untitledFor('list'),
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
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  // G300: permanent deletion has its own progress sentence (single vs plural).
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

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

  async function handleEmptyTrash() {
    setBusy(true);
    setBusyLabel(pendingLabel('deletingDocuments'));
    try {
      await emptyTrash();
      setEmptyConfirmOpen(false);
      exitSelection();
      router.refresh();
    } catch (error) {
      toast.add({
        title: error instanceof Error ? error.message : COULD_NOT_DELETE_DOCUMENT,
        type: 'error',
      });
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
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
    progressLabel?: string,
  ) {
    const ids = [...selected];
    setBusy(true);
    setBusyLabel(progressLabel ?? null);
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
      setBusyLabel(null);
      setConfirmOpen(false);
      exitSelection();
      router.refresh();
    }
  }

  // G273：长回收站也走窗口渲染（行高固定、overscan 2、滚动 rAF + 150ms）。
  const virtualized = rows.length > TRASH_VIRTUAL_THRESHOLD;
  const trashWindow = virtualized
    ? visibleRowWindow({
        scrollTop,
        viewportHeight: TRASH_VIEWPORT_HEIGHT,
        rowCount: rows.length,
        rowHeight: TRASH_ROW_STEP,
        overscan: 2,
      })
    : null;
  const renderRows = trashWindow ? rows.slice(trashWindow.start, trashWindow.end) : rows;

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[15px] bg-foreground/[0.03] px-6 text-center">
        <Trash2 className="mx-auto mb-2 size-8 text-foreground/40" />
        <p className="text-ui leading-[15.6px] text-foreground/55">{TRASH_EMPTY}</p>
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
      {busyLabel && (
        <p role="status" aria-live="polite" className="text-meta text-foreground/55">
          {busyLabel}
        </p>
      )}
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
          <>
            {/* G242：回收站屏的 ⋯ 是按屏裁剪的子集——官方这里是「选择」＋「清空最近删除」，
                没有所有文档 ⋯ 里的排序方式／导入／导出／空间设置。 */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="更多"
                    title="更多"
                    disabled={busy}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelecting(true)}>选择</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEmptyConfirmOpen(true)}>
                  {EMPTY_TRASH_ACTION}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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

      <div
        data-testid="trash-rows"
        className={
          virtualized
            ? 'flex max-h-[480px] flex-col gap-0.5 overflow-y-auto pr-1'
            : 'flex flex-col gap-0.5'
        }
        onScroll={(event) => {
          if (!virtualized) return;
          const top = event.currentTarget.scrollTop;
          scheduleScrollUpdate(() => setScrollTop(top));
        }}
      >
      {trashWindow && <div aria-hidden style={{ height: trashWindow.topPad }} />}
      {renderRows.map(doc => {
        const deletedDate = doc.deletedAt
          ? new Date(doc.deletedAt).toLocaleDateString('zh-CN')
          : '';
        const isChecked = selected.has(doc.id);

        return (
          <div
            key={doc.id}
            className="flex h-10 items-center gap-3 rounded-md px-2 transition-colors duration-150 hover:bg-foreground/[0.03]"
          >
            {selecting ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                aria-label={`选择 ${doc.title || untitledFor('list')}`}
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
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-ui font-medium">{doc.title || untitledFor('list')}</p>
              {/* G997：行副标题是已存快照的内容摘要（与浏览列表同一条回退链），
                  不在回收站里重渲染正文。pending 行没有快照时这条不渲染。 */}
              {typeof doc.plainText === 'string' && (
                <p className="truncate text-meta text-foreground/55">
                  {rowSubtitle({ plainText: doc.plainText })}
                </p>
              )}
            </div>
            <span className="shrink-0 text-meta text-foreground/55">
              删除于 {deletedDate}
            </span>
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
      {trashWindow && <div aria-hidden style={{ height: trashWindow.bottomPad }} />}
      </div>

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
              onClick={() => runSelected(permanentDeleteDocument, bulkDeleteAlert, pendingLabel(selected.size > 1 ? 'deletingDocuments' : 'deletingDocument'))}
            >
              {busy ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={emptyConfirmOpen} onOpenChange={setEmptyConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{EMPTY_TRASH_CONFIRM}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setEmptyConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={handleEmptyTrash}
            >
              {busy ? '删除中…' : EMPTY_TRASH_ACTION}
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
