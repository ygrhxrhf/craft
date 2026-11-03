'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from 'cn';
import type { WhiteboardItem } from '@/actions/whiteboard/whiteboard';
import { useSidebarSnapshot } from '@/lib/sidebar/use-sidebar-snapshot';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, mergePending, type PendingRow } from '@/components/sync/local-records';
import {
  SIDEBAR_WHITEBOARD_MIME,
  sidebarDragState,
} from '@/lib/dnd/sidebar-drag';
import { pressStartsDrag } from '@/lib/dnd/activation-guard';
import { useDragArm } from '@/lib/dnd/use-drag-arm';
import { LOADING } from '@/lib/browse/official-copy';

interface WhiteboardTreeItemProps {
  board: WhiteboardItem;
  isActive: boolean;
}

function WhiteboardTreeItem({ board, isActive }: WhiteboardTreeItemProps) {
  // G268：白板行和文档/文件夹行同属官方「主拖拽通路」＝general 档。
  const dragArm = useDragArm('general');

  function handleDragStart(e: React.DragEvent) {
    // G269：落在表单控件或链接上的按下永不起拖（点击让给控件）。
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
    const payload = {
      kind: 'sidebar-item' as const,
      type: 'whiteboard' as const,
      whiteboardId: board.id,
      title: board.name,
      icon: board.icon,
    };
    sidebarDragState.payload = payload;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(SIDEBAR_WHITEBOARD_MIME, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', board.name);
  }

  function handleDragEnd() {
    sidebarDragState.payload = null;
    dragArm.reset();
  }

  return (
    <Link
      href={`/whiteboards/${board.id}`}
      draggable
      onPointerDown={dragArm.onPointerDown}
      onPointerMove={dragArm.onPointerMove}
      onPointerUp={dragArm.onPointerUp}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors hover:bg-sidebar-hover',
        isActive && 'bg-sidebar-active text-sidebar-fg font-medium'
      )}
    >
      <span className="text-base leading-none">{board.icon ?? '🎨'}</span>
      <span className="truncate">{board.name}</span>
    </Link>
  );
}

/** 纯逻辑：行集合 + 本地 pending overlay（过滤条件与 getWhiteboards 同源）。 */
export function overlayWhiteboardRows(
  rows: WhiteboardItem[],
  pending: Map<string, import('@/components/sync/local-records').PendingRow>,
): WhiteboardItem[] {
  // applyLocal 的本地改名先于服务端可见（pending 覆盖）
  return mergePending<WhiteboardItem>(rows, pending, (id, p) => ({
    id,
    name: '未命名白板',
    icon: null,
    updatedAt: p.syncTs,
  })).filter((b) => !(b as { isDeleted?: boolean }).isDeleted);
}

export function WhiteboardTree() {
  const snapshot = useSidebarSnapshot();
  const pathname = usePathname();
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState<Map<string, PendingRow>>(new Map());

  // 未推送的本地意图（applyLocal 改名后立刻可见）；快照每次更新后重读
  useEffect(() => {
    let alive = true;
    readPendingRows('whiteboard').then((p) => {
      if (alive) setPending(p);
    });
    return () => {
      alive = false;
    };
  }, [snapshot, version]);

  // applyLocal 改名 / pull 远端变化 → 重取
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'whiteboard') setVersion((v) => v + 1);
  }), []);

  if (!snapshot) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">{LOADING}</div>;
  }

  const boards = overlayWhiteboardRows(snapshot.whiteboards, pending);

  if (boards.length === 0) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">暂无白板</div>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {boards.map((board) => {
        const isActive = pathname === `/whiteboards/${board.id}`;
        return <WhiteboardTreeItem key={board.id} board={board} isActive={isActive} />;
      })}
    </div>
  );
}
