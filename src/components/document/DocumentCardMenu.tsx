'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  DOCUMENT_CARD_MENU,
  favoriteLabel,
  type DocumentCardMenuItemId,
} from '@/lib/document/card-menu';
import { createDocument } from '@/actions/document/create';
import { deleteDocument } from '@/actions/document/delete';
import { getFolders } from '@/actions/folder/get';
import { resolveFavoriteState, toggleFavoriteLocal } from '@/lib/favorite/toggle-local';
import { getSyncManager } from '@/lib/sync-core';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { confirmDialog } from '@/lib/dialog/show';
import { toast } from '@/components/ui/toast';
import { showFavoriteFeedback } from '@/components/ui/favorite-feedback';
import { COPY_LINK_FAILED } from '@/lib/errors/alert-copy';
import { cn } from 'cn';
import { defer } from '@/lib/react/defer';

interface DocumentCardMenuProps {
  documentId: string;
  title: string;
  /** 右键的屏幕坐标；`null` ＝菜单关着。 */
  at: { x: number; y: number } | null;
  onClose: () => void;
}

/**
 * G384／G1439 —— 文档卡片的**右键菜单（7 项）**。卡片本身没有常驻 `⋯`，入口只有右键；
 * 「移至」后面有一条分隔线再跟「删除」（红字）。名册在纯核 `card-menu.ts` 里。
 */
export function DocumentCardMenu({ documentId, title, at, onClose }: DocumentCardMenuProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [favorite, setFavorite] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 每次重新定位菜单都先把上一份状态清掉，再异步取这颗星的真实值。
  const [lastAt, setLastAt] = useState(at);
  if (lastAt !== at) {
    setLastAt(at);
    setFavorite(false);
    setMoveOpen(false);
  }

  useEffect(() => {
    if (!at) return;
    defer(() => {
      void resolveFavoriteState(documentId).then(setFavorite).catch(() => setFavorite(false));
    });
  }, [at, documentId]);

  useEffect(() => {
    if (!at) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [at, onClose]);

  if (!at) return null;

  const run = async (id: DocumentCardMenuItemId) => {
    switch (id) {
      case 'openInNewTab':
        window.open(`/documents/${documentId}`, '_blank', 'noopener');
        onClose();
        return;
      case 'copyLink':
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/documents/${documentId}`);
          toast.add({ title: '已复制链接', type: 'success' });
        } catch {
          toast.add({ title: COPY_LINK_FAILED, type: 'error' });
        }
        onClose();
        return;
      case 'favorite':
        try {
          const next = await toggleFavoriteLocal({
            documentId,
            favored: favorite,
            userId: session?.user?.id ?? null,
          });
          setFavorite(next);
          // G1446: one info toast for either direction, 1500 ms.
          showFavoriteFeedback(next);
          router.refresh();
        } catch {
          toast.add({ title: '收藏失败', type: 'error' });
        }
        onClose();
        return;
      case 'duplicate':
        try {
          await createDocument({ duplicateFrom: documentId });
          router.refresh();
        } catch {
          toast.add({ title: '创建副本失败', type: 'error' });
        }
        onClose();
        return;
      case 'moveTo':
        // 展开二级：文件夹列表（首项是「未分类」＝folderId null）。
        try {
          const list = await getFolders();
          setFolders(list.map((f) => ({ id: f.id, name: f.name })));
        } catch {
          setFolders([]);
        }
        setMoveOpen(true);
        return;
      case 'delete': {
        const ok = await confirmDialog({
          title: `删除「${title || '无标题'}」`,
          message: '删除后可在最近删除中恢复。',
          confirmLabel: '删除',
        });
        if (ok) {
          try {
            await deleteDocument(documentId);
            router.refresh();
          } catch {
            toast.add({ title: '删除失败', type: 'error' });
          }
        }
        onClose();
        return;
      }
    }
  };

  const move = async (folderId: string | null) => {
    const manager = getSyncManager();
    try {
      await manager.applyLocal({ table: 'document', id: documentId, patch: { folderId } });
      // G19：覆盖层只活到 flush ack。若不等队列清空就重取 RSC，这一卡会带着旧 folderId
      // 重新出现在原位置（收件箱列表实测约 1.5s 后回弹）。
      await manager.flushNow();
      useSidebarStore.getState().bumpTree();
      router.refresh();
    } catch {
      toast.add({ title: '移动失败', type: 'error' });
    }
    onClose();
  };

  return (
    <div
      ref={rootRef}
      data-testid="document-card-menu"
      role="menu"
      style={{ left: at.x, top: at.y }}
      className="fixed z-[60] min-w-[180px] rounded-lg border border-border bg-background p-1 shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      {moveOpen ? (
        <>
          <div className="px-2 py-1 text-[11px] text-muted-foreground">移至</div>
          {/* G19：文件夹是整棵树（craft-test 有 61 个根夹），不封高会把目标顶到视口外且滚不到。 */}
          <div className="max-h-[min(60vh,360px)] overflow-y-auto">
            <button
              type="button"
              role="menuitem"
              onClick={() => void move(null)}
              className="flex w-full rounded px-2 py-1.5 text-left text-ui hover:bg-foreground/4"
            >
              未分类
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                role="menuitem"
                onClick={() => void move(folder.id)}
                className="flex w-full truncate rounded px-2 py-1.5 text-left text-ui hover:bg-foreground/4"
              >
                {folder.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        DOCUMENT_CARD_MENU.map((item) => (
          <div key={item.id}>
            {item.separatedBefore && <div className="my-1 h-px bg-border" role="separator" />}
            <button
              type="button"
              role="menuitem"
              data-testid={`document-card-action-${item.id}`}
              onClick={() => void run(item.id)}
              className={cn(
                'flex w-full rounded px-2 py-1.5 text-left text-ui hover:bg-foreground/4',
                item.danger && 'text-destructive',
              )}
            >
              {item.id === 'favorite' ? favoriteLabel(favorite) : item.label}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
