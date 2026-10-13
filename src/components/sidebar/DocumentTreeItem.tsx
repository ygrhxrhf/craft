'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronRight, File } from 'lucide-react';
import { cn } from 'cn';
import { toggleFavorite, isDocumentFavorite } from '@/actions/document/favorite';
import { createDocument } from '@/actions/document/create';
import { toast } from '@/components/ui/toast';
import { getSyncManager } from '@/lib/sync-core';
import { createDocumentLocal } from '@/components/sync/create-local';
import { findLiveFavoriteId } from '@/components/sync/local-records';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import {
  SIDEBAR_DOC_MIME,
  sidebarDragState,
} from '@/lib/dnd/sidebar-drag';
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
    try {
      setFavorite(await isDocumentFavorite(doc.id));
    } catch {
      setFavorite(null);
    }
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
      if (favorite) {
        // 取消收藏 → applyLocal 墓碑推送（活行 id 来自本地镜像）
        const liveId = await findLiveFavoriteId(doc.id);
        if (liveId) {
          await getSyncManager().applyLocal({ table: 'favorite', id: liveId, patch: null });
          setFavorite(false);
        } else {
          // 镜像还没拉到该行 → 退回服务端 action（唯一键墓碑复用在服务端）
          setFavorite(await toggleFavorite(doc.id));
        }
        bumpTree();
        return;
      }
      // 收藏保留服务端 action：Favorite id 是服务端 uuid，墓碑行不携带 data，
      // 客户端盲建新 id 会撞 @@unique([userId,documentId]) 让整批同步 500（见 task-13 报告）
      setFavorite(await toggleFavorite(doc.id));
      bumpTree();
    } catch {
      // spec D7-④ 离线提示：收藏走服务端 action，失败（多为离线）给反馈
      toast.add({ id: 'offline-hint', type: 'warning', title: '需要网络' });
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/documents/${doc.id}`);
  }

  async function moveToTrash() {
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
    if (window.location.pathname.startsWith(`/documents/${doc.id}`)) router.push('/documents');
  }

  function handleDragStart(e: React.DragEvent) {
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
      const siblings = allDocuments
        .filter(
          d =>
            d.parentId === doc.parentId &&
            d.folderId === doc.folderId &&
            d.id !== payload.documentId
        )
        .sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex(d => d.id === doc.id);
      if (idx < 0) return;
      const order =
        currentZone === 'before'
          ? idx > 0
            ? (siblings[idx - 1].order + doc.order) / 2
            : doc.order - 1
          : idx < siblings.length - 1
            ? (doc.order + siblings[idx + 1].order) / 2
            : doc.order + 1;
      data = { parentId: doc.parentId, folderId: doc.folderId, order };
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
        <span className="truncate">{doc.title}</span>
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
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => void moveToTrash()}>
              移入回收站
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
