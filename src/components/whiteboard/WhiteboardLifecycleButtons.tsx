'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/lib/dialog/show';
import { getSyncManager } from '@/lib/sync-core';
import { whiteboardMetaPatch } from '@/components/whiteboard/whiteboard-meta';

interface WhiteboardDeleteButtonProps {
  id: string;
  name: string;
}

/**
 * 白板删除。走离线内核的 `applyLocal`（`isDeleted`/`deletedAt` 都在 whiteboard 白名单内），
 * 删完跳到列表——已删除的白板 `getWhiteboard` 会返回 null，停在详情页只会看到 404 式的跳走。
 */
export function WhiteboardDeleteButton({ id, name }: WhiteboardDeleteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const moveToTrash = async () => {
    const confirmed = await confirmDialog({
      title: '删除白板',
      message: `你确定要删除“${name}”吗？`,
      confirmLabel: '删除',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'whiteboard',
        id,
        patch: whiteboardMetaPatch.delete(new Date().toISOString()),
      });
      await manager.flushNow();
      router.push('/whiteboards');
      router.refresh();
    } catch (error) {
      toast.add({
        id: 'whiteboard-delete',
        type: 'error',
        title: error instanceof Error ? error.message : '删除失败',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void moveToTrash()}
      disabled={busy}
      aria-label="删除白板"
      title="删除"
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

interface WhiteboardRestoreButtonProps {
  id: string;
}

/** 「最近删除」里的恢复入口。 */
export function WhiteboardRestoreButton({ id }: WhiteboardRestoreButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'whiteboard',
        id,
        patch: whiteboardMetaPatch.restore(new Date().toISOString()),
      });
      await manager.flushNow();
      router.refresh();
    } catch (error) {
      toast.add({
        id: 'whiteboard-restore',
        type: 'error',
        title: error instanceof Error ? error.message : '恢复失败',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void restore()}
      disabled={busy}
      aria-label="恢复白板"
      title="恢复"
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <RotateCcw className="size-4" />
    </button>
  );
}
