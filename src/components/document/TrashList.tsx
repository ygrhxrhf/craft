'use client';

import { useEffect, useSyncExternalStore, useState } from 'react';
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
import { TRASH_DISCLAIMER, TRASH_EMPTY, TRASH_TITLE } from '@/lib/browse/trash-copy';
import {
  COULD_NOT_DELETE_DOCUMENT,
  EMPTY_TRASH_ACTION,
  EMPTY_TRASH_CONFIRM,
} from '@/lib/browse/trash-subcopy';
import { useRouter } from 'next/navigation';
import { untitledFor } from '@/lib/document/untitled-copy';
import { pendingLabel } from '@/lib/app/pending-states';
import { rowSubtitle } from '@/lib/browse/row-subtitle';
import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from './DocumentCard';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import {
  readViewMode,
  serverViewMode,
  storeViewMode,
  subscribeViewMode,
} from '@/lib/browse/view-modes';
import { relativeTime } from '@/lib/document/relative-time';

interface TrashDoc {
  id: string;
  title: string;
  icon: string | null;
  deletedAt: string | null;
  /** G20: the card's 「已更新 N」 line. */
  updatedAt: string;
  /** G997: the stored plain-text snapshot the card preview renders. */
  plainText?: string | null;
}

interface TrashListProps {
  documents: TrashDoc[];
  /** 卡片副行「已更新 N」的时钟基准，由服务端页面算一次传下来（hydration 安全）。 */
  now: number;
}

/** 纯逻辑：服务端删除行 + 本地未推送意图 → 回收站行（过滤条件同 getDeletedDocuments）。 */
export function overlayTrashRows(serverDocs: TrashDoc[], pending: Map<string, PendingRow>): TrashDoc[] {
  const merged = mergePending<TrashDoc>(serverDocs, pending, (id, p) => ({
    id,
    title: untitledFor('list'),
    icon: null,
    deletedAt: null,
    // 删除 patch 只带 isDeleted/deletedAt、不带 updatedAt——本地刚移入未推送的行用同步时钟补上，
    // 否则卡片副行只剩「最近删除 •」。
    updatedAt: p.syncTs,
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

/**
 * G20：官方「最近删除」是卡片网格，与浏览列表同一张卡——位置行写「最近删除」，
 * 预览用删除时落库的纯文本快照（G997），悬停动作是「恢复」而不是「打开」
 * （G991：删掉的页没有路由，卡片是静态磁贴）。
 */
export function TrashList({ documents, now }: TrashListProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TrashDoc[]>(documents);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // G300: permanent deletion has its own progress sentence (single vs plural).
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  // G1659：官方回收站与其它浏览屏共用同一组三档布局（网格／列表／瀑布）。
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, serverViewMode);

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
    // 与侧栏删除同因：refresh 读的是服务端行，push ack 前读到的还是「在回收站里」。
    await getSyncManager().flushNow();
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

  const renderCard = (doc: TrashDoc) => (
    <DocumentCard
      key={doc.id}
      now={now}
      document={{
        id: doc.id,
        title: doc.title,
        icon: doc.icon,
        updatedAt: doc.updatedAt,
        breadcrumb: TRASH_TITLE,
        // G997：卡片预览是已存快照的内容摘要（与浏览列表同一条回退链），
        // 不在回收站里重渲染正文。pending 行没有快照时这条不渲染。
        previewText: typeof doc.plainText === 'string'
          ? rowSubtitle({ plainText: doc.plainText })
          : null,
      }}
      // G20/G991：删除的页没有路由，卡片是静态磁贴；选择模式下点整张卡切换选中。
      href={null}
      selectable={selecting}
      selected={selected.has(doc.id)}
      onToggleSelect={toggle}
      onRestore={selecting
        ? undefined
        : (id) => void handleRestore(id).catch((error: unknown) => toast.add({
          title: error instanceof Error ? error.message : '恢复失败',
          type: 'error',
        }))}
    />
  );

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
            <ViewModeSwitcher value={viewMode} onChange={storeViewMode} />
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

      {viewMode === 'list' ? (
        <ul data-testid="trash-list" className="divide-y divide-border/60 rounded-[10px] border border-border/60">
          {rows.map(doc => (
            <li key={doc.id} className="flex h-[65px] items-center gap-3 px-3">
              {selecting ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected.has(doc.id)}
                  aria-label={doc.title || untitledFor('list')}
                  onClick={() => toggle(doc.id)}
                  className="flex shrink-0 items-center"
                >
                  <SelectionMark state={selected.has(doc.id) ? 'on' : 'off'} />
                </button>
              ) : (
                <File className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-[14px]">
                {doc.title || untitledFor('list')}
              </span>
              <span className="shrink-0 text-xs text-foreground/55">
                {relativeTime(doc.updatedAt)}
              </span>
              {!selecting && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="恢复"
                  title="恢复"
                  disabled={busy}
                  onClick={() => void handleRestore(doc.id).catch((error: unknown) => toast.add({
                    title: error instanceof Error ? error.message : '恢复失败',
                    type: 'error',
                  }))}
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : viewMode === 'waterfall' ? (
        <div data-testid="trash-waterfall" className="columns-2 gap-5 md:columns-3 xl:columns-4">
          {rows.map(doc => (
            <div key={doc.id} className="mb-5 break-inside-avoid">
              {renderCard(doc)}
            </div>
          ))}
        </div>
      ) : (
        <BrowseGrid>{rows.map(renderCard)}</BrowseGrid>
      )}

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
