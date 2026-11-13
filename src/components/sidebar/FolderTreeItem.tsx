'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronRight, Folder } from 'lucide-react';
import { cn } from 'cn';
import { getSyncManager } from '@/lib/sync-core';
import { createDocumentLocal } from '@/components/sync/create-local';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { SIDEBAR_DOC_MIME, sidebarDragState } from '@/lib/dnd/sidebar-drag';
import { pressStartsDrag } from '@/lib/dnd/activation-guard';
import { useDragArm } from '@/lib/dnd/use-drag-arm';
import { formatDocCount } from '@/lib/browse/official-copy';
import {
  DELETE_FOLDER_LABEL,
  DELETE_FOLDER_SUBTITLE,
} from '@/lib/folder/delete-copy';
import { folderDescriptionLabel } from '@/lib/browse/folder-description';
import { confirmDialog, promptDialog } from '@/lib/dialog/show';
import { orderAfterDrop, orderPatches } from '@/lib/document/sibling-order';
import { compareFolderOrder } from '@/lib/folder/order';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Folder as FolderType } from './FolderTree';
import type { Document } from './DocumentTree';
import { DocumentTreeItem } from './DocumentTreeItem';

type DropZone = 'before' | 'after' | 'into' | null;

interface FolderTreeItemProps {
  folder: FolderType;
  allFolders: FolderType[];
  allDocuments: Document[];
  documentCounts: Map<string, number>;
  level: number;
}

function isDescendantOf(
  targetId: string,
  ancestorId: string,
  allFolders: FolderType[]
): boolean {
  const stack = [ancestorId];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === targetId) return true;
    for (const f of allFolders) {
      if (f.parentId === current) stack.push(f.id);
    }
  }
  return false;
}

export function FolderTreeItem({ folder, allFolders, allDocuments, documentCounts, level }: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [zone, setZone] = useState<DropZone>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);
  const expandTimerRef = useRef<number | null>(null);
  const bumpTree = useSidebarStore((s) => s.bumpTree);
  // G268：文件夹行与文档行同属官方「主拖拽通路」＝general 档。
  const dragArm = useDragArm('general');
  const router = useRouter();
  const { data: session } = useSession();

  function startRename() {
    setDraftName(folder.name);
    setRenaming(true);
  }

  /** G338：图标也是独立 mutation（官方 `Folder icon`），只写 `icon` 一列。 */
  async function editIcon() {
    const next = await promptDialog({
      title: '设置文件夹图标',
      placeholder: '粘贴一个 emoji，留空则移除',
      confirmLabel: '保存',
    });
    if (next === null) return;
    await getSyncManager().applyLocal({
      table: 'folder',
      id: folder.id,
      patch: { icon: next.trim() || null },
    });
    // 侧栏快照是服务端读，ack 前重取读到的仍是旧图标。
    await getSyncManager().flushNow();
    bumpTree();
  }

  /** G338：描述是独立 mutation，只写 `description` 一列，不动 name/icon。 */
  async function editDescription() {
    const next = await promptDialog({
      title: '编辑文件夹描述',
      placeholder: '写一句描述…',
      confirmLabel: '保存',
    });
    if (next === null) return;
    await getSyncManager().applyLocal({
      table: 'folder',
      id: folder.id,
      patch: { description: next.trim() || null },
    });
    await getSyncManager().flushNow();
    bumpTree();
  }

  async function commitRename() {
    setRenaming(false);
    const next = draftName.trim();
    if (!next || next === folder.name) return;
    await getSyncManager().applyLocal({
      table: 'folder',
      id: folder.id,
      patch: { name: next },
    });
    await getSyncManager().flushNow();
    bumpTree();
  }

  async function createDocumentInFolder() {
    const docId = await createDocumentLocal({
      userId: session?.user?.id,
      folderId: folder.id,
    });
    setExpanded(true);
    // 与树内「新建子文档」同因：跳转的 pathname 变化会触发快照重取，这里再 bump
    // 只是往同一条 server action 队里多排一个整棵侧栏的取数。
    router.push(`/documents/${docId}`);
  }

  async function moveToTrash() {
    // G241：删文件夹先确认，且确认句明说「不会删除文件夹中的文档」——文件夹是容器不是父级。
    const ok = await confirmDialog({
      title: DELETE_FOLDER_LABEL,
      message: DELETE_FOLDER_SUBTITLE,
      confirmLabel: DELETE_FOLDER_LABEL,
    });
    if (!ok) return;
    // 同 document 删除：读侧按 isDeleted 过滤，patch 带 isDeleted/deletedAt（见 task-13 报告）
    await getSyncManager().applyLocal({
      table: 'folder',
      id: folder.id,
      patch: { isDeleted: true, deletedAt: new Date().toISOString() },
    });
    // 与 document 删除同因：先让 push ack，再重取，免得删前快照晚到把行带回来。
    await getSyncManager().flushNow();
    bumpTree();
  }

  const childFolders = allFolders
    .filter(f => f.parentId === folder.id)
    .sort(compareFolderOrder);

  const childDocuments = allDocuments
    .filter(d => d.folderId === folder.id && d.parentId === null)
    .sort((a, b) => a.order - b.order);

  const hasChildren = childFolders.length > 0 || childDocuments.length > 0;

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) window.clearTimeout(expandTimerRef.current);
    };
  }, []);

  function handleDragStart(e: React.DragEvent) {
    // G269：落在表单控件或链接上的按下永不起拖（行内嵌着重命名 input 与展开箭头）。
    if (!pressStartsDrag(e.target as Element | null, 'general', e.currentTarget as Element)) {
      e.preventDefault();
      return;
    }
    // G268：general 档——指针没走够 8px（触摸没按满 150ms）就不起拖。
    // 浏览器自己的起拖门更松，所以先把 dragstart 现场坐标算进去，免得差几 px 被拦下后接不上。
    dragArm.track(e.clientX, e.clientY);
    if (!dragArm.isArmed()) {
      e.preventDefault();
      return;
    }
    const payload = { kind: 'sidebar-item' as const, type: 'folder' as const, folderId: folder.id, title: folder.name };
    sidebarDragState.payload = payload;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(SIDEBAR_DOC_MIME, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', folder.name);
  }

  function handleDragEnd() {
    sidebarDragState.payload = null;
    dragArm.reset();
    setZone(null);
    if (expandTimerRef.current) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  }

  function handleDragOver(e: React.DragEvent) {
    const payload = sidebarDragState.payload;
    if (!payload || !('type' in payload)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    let target: DropZone;
    if (payload.type === 'folder') {
      const draggedFolderId = payload.folderId;
      const rect = e.currentTarget.getBoundingClientRect();
      const rel = (e.clientY - rect.top) / rect.height;
      const edge = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : 'into';
      const forbidden =
        draggedFolderId === folder.id ||
        (edge === 'into' && isDescendantOf(folder.id, draggedFolderId, allFolders));
      target = forbidden ? null : edge;
    } else if (payload.type === 'doc') {
      target = 'into';
    } else {
      return;
    }

    if (zone !== target) setZone(target);

    if (target === 'into' && !expanded && expandTimerRef.current === null) {
      expandTimerRef.current = window.setTimeout(() => {
        expandTimerRef.current = null;
        setExpanded(true);
      }, 500);
    } else if (target !== 'into' && expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    const to = e.relatedTarget as Node | null;
    if (to && e.currentTarget.contains(to)) return;
    setZone(null);
    if (expandTimerRef.current) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const payload = sidebarDragState.payload;
    const currentZone = zone;
    setZone(null);
    sidebarDragState.payload = null;
    if (expandTimerRef.current) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    if (!payload || !('type' in payload) || !currentZone) return;

    try {
      // 移动 → applyLocal（cycle 前置守卫仍在上面的 isDescendantOf 检查）
      if (payload.type === 'folder') {
        const draggedFolderId = payload.folderId;
        if (
          draggedFolderId === folder.id ||
          isDescendantOf(folder.id, draggedFolderId, allFolders)
        ) {
          return;
        }
        let data: { parentId?: string | null; order?: number };
        if (currentZone === 'into') {
          const childOrders = allFolders
            .filter(f => f.parentId === folder.id)
            .map(f => f.order);
          data = {
            parentId: folder.id,
            order: (childOrders.length ? Math.max(...childOrders) : 0) + 1,
          };
          setExpanded(true);
        } else {
          // G607/G338：同层重排与文档树同一口径——整批写 0…n-1，而不是给被拖行算中点。
          const siblings = allFolders
            .filter(f => f.parentId === folder.parentId && f.id !== draggedFolderId)
            .sort(compareFolderOrder);
          const ids = orderAfterDrop(
            siblings.map(f => ({ id: f.id, order: f.order })),
            draggedFolderId,
            folder.id,
            currentZone,
          );
          if (ids.length === 0) return;
          const manager = getSyncManager();
          for (const patch of orderPatches(ids)) {
            await manager.applyLocal({
              table: 'folder',
              id: patch.id,
              patch: { parentId: folder.parentId, order: patch.order },
            });
          }
          await manager.flushNow();
          bumpTree();
          return;
        }
        await getSyncManager().applyLocal({
          table: 'folder',
          id: draggedFolderId,
          patch: data,
        });
      } else if (payload.type === 'doc') {
        const childOrders = allDocuments
          .filter(d => d.folderId === folder.id && d.parentId === null)
          .map(d => d.order);
        await getSyncManager().applyLocal({
          table: 'document',
          id: payload.documentId,
          patch: {
            parentId: null,
            folderId: folder.id,
            order: (childOrders.length ? Math.max(...childOrders) : 0) + 1,
          },
        });
        setExpanded(true);
      }
      await getSyncManager().flushNow();
      bumpTree();
    } catch (err) {
      console.error('移动失败', err);
    }
  }

  const rowClass = cn(
    // G29：13/16；写成显式长度而不是 `text-ui`——`text-ui` 会和后面的文字色类在 merge 时互相吞掉。
    'relative flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[length:13px] leading-4 transition-colors hover:bg-sidebar-hover',
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
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
        />
      )}
      {!hasChildren && <span className="w-3.5" />}
      <Folder className="size-4 shrink-0 text-muted-foreground" />
      {renaming ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
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
          <span className="truncate">{folder.name}</span>
          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatDocCount(documentCounts.get(folder.id) ?? 0)}
          </span>
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
      // G385：折叠态要在无障碍层声明"还能展开"；Web 的对应物是 `aria-expanded`。
      aria-expanded={hasChildren ? expanded : undefined}
      onPointerDown={dragArm.onPointerDown}
      onPointerMove={dragArm.onPointerMove}
      onPointerUp={dragArm.onPointerUp}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => hasChildren && setExpanded(!expanded)}
    >
      {rowInner}
    </button>
  );

  return (
    <div>
      {renaming ? (
        rowButton
      ) : (
        <ContextMenu>
          <ContextMenuTrigger render={<div className="w-full" />}>
            {rowButton}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={startRename}>重命名</ContextMenuItem>
            <ContextMenuItem onClick={() => void editIcon()}>设置图标</ContextMenuItem>
            <ContextMenuItem onClick={() => void editDescription()}>
              {folderDescriptionLabel(folder.description)}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void createDocumentInFolder()}>
              新建文档
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => void moveToTrash()}>
              移入回收站
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {expanded && hasChildren && (
        <div className="flex flex-col gap-0.5">
          {childDocuments.map(doc => (
            <DocumentTreeItem
              key={doc.id}
              document={doc}
              allDocuments={allDocuments}
              level={level + 1}
            />
          ))}
          {childFolders.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              allDocuments={allDocuments}
              documentCounts={documentCounts}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
