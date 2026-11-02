'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronRight, File } from 'lucide-react';
import { cn } from 'cn';
import { createDocument } from '@/actions/document/create';
import { setDocumentArchived } from '@/actions/document/archive';
import { toast } from '@/components/ui/toast';
import { COPY_LINK_FAILED } from '@/lib/errors/alert-copy';
import { OfflineBadge } from '@/components/sync/OfflineBadge';
import { getSyncManager } from '@/lib/sync-core';
import { createDocumentLocal } from '@/components/sync/create-local';
import { resolveFavoriteState, toggleFavoriteLocal } from '@/lib/favorite/toggle-local';
import { untitledFor } from '@/lib/document/untitled-copy';
import {
  MOVED_TO_RECENTLY_DELETED,
  moveToTrashConfirm,
  moveToTrashMenuTitle,
} from '@/lib/browse/trash-subcopy';
import { confirmDialog } from '@/lib/dialog/show';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import {
  SIDEBAR_DOC_MIME,
  sidebarDragState,
} from '@/lib/dnd/sidebar-drag';
import { pressStartsDrag } from '@/lib/dnd/activation-guard';
import { orderAfterDrop, orderPatches } from '@/lib/document/sibling-order';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Document } from './DocumentTree';

type DropZone = 'before' | 'after' | 'into' | null;

interface DocumentTreeItemProps {
  document: Document;
  allDocuments: Document[];
  level: number;
}

function isDescendantOf(targetId: string, ancestorId: string, allDocuments: Document[]): boolean {
  const stack = [ancestorId];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === targetId) return true;
    for (const d of allDocuments) {
      if (d.parentId === current) stack.push(d.id);
    }
  }
  return false;
}

export function DocumentTreeItem({ document: doc, allDocuments, level }: DocumentTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [zone, setZone] = useState<DropZone>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(doc.title);
  const [favorite, setFavorite] = useState<boolean | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const bumpTree = useSidebarStore((s) => s.bumpTree);

  const children = allDocuments
    .filter(d => d.parentId === doc.id)
    .sort((a, b) => a.order - b.order);

  const hasChildren = children.length > 0;

  function handleClick() {
    router.push(`/documents/${doc.id}`);
  }

  function startRename() {
    setDraftTitle(doc.title);
    setRenaming(true);
  }

  async function commitRename() {
    setRenaming(false);
    const next = draftTitle.trim();
    if (!next || next === doc.title) return;
    // 元数据改名 → applyLocal（本地立即可见，入队推送）
    await getSyncManager().applyLocal({
      table: 'document',
      id: doc.id,
      patch: { title: next },
    });
    bumpTree();
  }

  // Favourite state is not part of the tree payload, so it is read when the menu opens.
  async function handleMenuOpen(open: boolean) {
    if (!open) return;
    setFavorite(await resolveFavoriteState(doc.id));
  }

  async function createChild() {
    // brief 映射：本地先生成 id → applyLocal → flushNow 后再跳转（服务端可见）
    const childId = await createDocumentLocal({ userId: session?.user?.id, parentId: doc.id });
    setExpanded(true);
    bumpTree();
    router.push(`/documents/${childId}`);
  }

  async function duplicateSelf() {
    const copy = await createDocument({
      duplicateFrom: doc.id,
      parentId: doc.parentId ?? null,
      folderId: doc.folderId ?? null,
    });
    bumpTree();
    router.push(`/documents/${copy.id}`);
  }

  async function toggleFavoriteSelf() {
    try {
      setFavorite(await toggleFavoriteLocal({
        documentId: doc.id,
        favored: favorite === true,
        userId: session?.user?.id ?? null,
      }));
      bumpTree();
    } catch {
      // spec D7-④：写本地镜像失败（多为存储不可用）才走到这里，给反馈
      toast.add({ id: 'favorite-failed', type: 'warning', title: '收藏操作失败' });
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/documents/${doc.id}`);
    } catch {
      toast.add({ id: 'tree-copy-link-failed', type: 'error', title: COPY_LINK_FAILED });
    }
  }

  async function moveToTrash() {
    // G233 的第四件：移入回收站前先确认，确认句按数量分档（one/other）——
    // 官方四键里这一对（`MOVE_ITEM_TO_TRASH`／`MOVE_ITEMS_TO_TRASH`）此前只躺在
    // trash-subcopy 里没有生产消费者。文件夹侧早已走同一枚 confirmDialog（G241）。
    const ok = await confirmDialog({
      title: moveToTrashMenuTitle(doc.title || untitledFor('list')),
      message: moveToTrashConfirm(1),
      confirmLabel: moveToTrashMenuTitle(doc.title || untitledFor('list')),
    });
    if (!ok) return;
    try {
      // 删除 → applyLocal（不用 patch:null：同步协议的 delete 只写 deletedAt，
      // 而读侧（getDocuments/回收站/搜索）按 isDeleted 过滤，会复活/丢进回收站失败）
      await getSyncManager().applyLocal({
        table: 'document',
        id: doc.id,
        patch: { isDeleted: true, deletedAt: new Date().toISOString() },
      });
    } catch (error) {
      toast.add({
        title: error instanceof Error ? error.message : '删除失败',
        type: 'error',
      });
      return;
    }
    bumpTree();
    toast.add({ id: 'moved-to-trash', type: 'success', title: MOVED_TO_RECENTLY_DELETED });
    if (window.location.pathname.startsWith(`/documents/${doc.id}`)) router.push('/documents');
  }

  function handleDragStart(e: React.DragEvent) {
    // G269：落在表单控件或链接上的按下永不起拖（点击让给控件）。侧栏行里嵌着展开箭头，
    //   重命名态还有一个 input——从这些地方起拖会把点击吞掉。
    if (!pressStartsDrag(e.target as Element | null, 'general', e.currentTarget as Element)) {
      e.preventDefault();
      return;
    }
    const payload = { kind: 'sidebar-item' as const, type: 'doc' as const, documentId: doc.id, title: doc.title };
    sidebarDragState.payload = payload;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(SIDEBAR_DOC_MIME, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', doc.title);
  }

  function handleDragEnd() {
    sidebarDragState.payload = null;
    setZone(null);
  }

  function handleDragOver(e: React.DragEvent) {
    const payload = sidebarDragState.payload;
    if (!payload || !('type' in payload) || payload.type !== 'doc') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - rect.top) / rect.height;
    const target: DropZone = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : 'into';

    const forbidden =
      payload.documentId === doc.id ||
      (target === 'into' && isDescendantOf(doc.id, payload.documentId, allDocuments));
    const next = forbidden ? null : target;
    if (zone !== next) setZone(next);
  }

  function handleDragLeave(e: React.DragEvent) {
    const to = e.relatedTarget as Node | null;
    if (to && e.currentTarget.contains(to)) return;
    setZone(null);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const payload = sidebarDragState.payload;
    const currentZone = zone;
    setZone(null);
    sidebarDragState.payload = null;
    if (!payload || !('type' in payload) || payload.type !== 'doc') return;
    if (!currentZone || payload.documentId === doc.id) return;

    let data: { parentId?: string | null; folderId?: string | null; order?: number };
    if (currentZone === 'into') {
      if (isDescendantOf(doc.id, payload.documentId, allDocuments)) return;
      const childOrders = allDocuments
        .filter(d => d.parentId === doc.id)
        .map(d => d.order);
      data = {
        parentId: doc.id,
        folderId: doc.folderId,
        order: (childOrders.length ? Math.max(...childOrders) : 0) + 1,
      };
      setExpanded(true);
    } else {
      // G607: same-layer reorder writes the whole sibling list's order (0…n-1), like the official
      // batch `orderedIds`, instead of giving the dragged row a midpoint decimal.
      const siblings = allDocuments
        .filter(
          d =>
            d.parentId === doc.parentId &&
            d.folderId === doc.folderId &&
            d.id !== payload.documentId
        )
        .sort((a, b) => a.order - b.order);
      const ids = orderAfterDrop(
        siblings.map((sibling) => ({ id: sibling.id, order: sibling.order })),
        payload.documentId,
        doc.id,
        currentZone,
      );
      if (ids.length === 0) return;
      try {
        const manager = getSyncManager();
        for (const patch of orderPatches(ids)) {
          await manager.applyLocal({
            table: 'document',
            id: patch.id,
            patch: { parentId: doc.parentId, folderId: doc.folderId, order: patch.order },
          });
        }
        bumpTree();
      } catch (err) {
        console.error('移动文档失败', err);
      }
      return;
    }

    try {
      // 移动（parent/folder/order 变更）→ applyLocal，patch 只带变更字段
      await getSyncManager().applyLocal({
        table: 'document',
        id: payload.documentId,
        patch: data,
      });
      bumpTree();
    } catch (err) {
      console.error('移动文档失败', err);
    }
  }

  const rowClass = cn(
    'relative flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-sidebar-hover',
    'text-sidebar-fg',
    zone === 'into' && 'bg-primary/10'
  );
  const rowStyle = { paddingLeft: `${level * 16 + 8}px` };

  const rowInner = (
    <>
      {zone === 'before' && (
        <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 rounded-full bg-primary" />
      )}
      {zone === 'after' && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 rounded-full bg-primary" />
      )}
      {hasChildren && (
        <span
          className="flex size-3.5 shrink-0 items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <ChevronRight
            className={cn(
              'size-3.5 transition-transform',
              expanded && 'rotate-90'
            )}
          />
        </span>
      )}
      {!hasChildren && <span className="w-3.5" />}
      {doc.icon ? (
        <span className="text-base">{doc.icon}</span>
      ) : (
        <File className="size-4 shrink-0 text-muted-foreground" />
      )}
      {renaming ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              void commitRename();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setRenaming(false);
            }
          }}
          onBlur={() => void commitRename()}
          className="min-w-0 flex-1 rounded border border-input bg-background px-1 text-[13px] outline-none focus:border-ring"
        />
      ) : (
        <>
          <span className="truncate">{doc.title || untitledFor('list')}</span>
          {/* G237：侧栏这一行也挂同一枚离线徽标。 */}
          <OfflineBadge documentId={doc.id} listedUpdatedAt={doc.updatedAt} />
        </>
      )}
    </>
  );

  const rowButton = renaming ? (
    <div className={rowClass} style={rowStyle}>
      {rowInner}
    </div>
  ) : (
    <button
      className={rowClass}
      style={rowStyle}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {rowInner}
    </button>
  );

  return (
    <div>
      {renaming ? (
        rowButton
      ) : (
        <ContextMenu onOpenChange={handleMenuOpen}>
          <ContextMenuTrigger render={<div className="w-full" />}>
            {rowButton}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={startRename}>重命名</ContextMenuItem>
            <ContextMenuItem onClick={() => void createChild()}>新建子文档</ContextMenuItem>
            <ContextMenuItem onClick={() => void duplicateSelf()}>创建副本</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => void toggleFavoriteSelf()}>
              {favorite ? '取消收藏' : '添加到收藏'}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void copyLink()}>复制链接</ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                void setDocumentArchived(doc.id, true).then(() => bumpTree());
              }}
            >
              归档
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => void moveToTrash()}>
              {moveToTrashMenuTitle(doc.title || untitledFor('list'))}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {expanded && hasChildren && (
        <div className="flex flex-col gap-0.5">
          {children.map(child => (
            <DocumentTreeItem
              key={child.id}
              document={child}
              allDocuments={allDocuments}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
