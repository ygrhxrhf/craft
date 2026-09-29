'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from 'cn';
import { getWhiteboards } from '@/actions/whiteboard/whiteboard';
import type { WhiteboardItem } from '@/actions/whiteboard/whiteboard';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, mergePending } from '@/components/sync/local-records';
import {
  SIDEBAR_WHITEBOARD_MIME,
  sidebarDragState,
} from '@/lib/dnd/sidebar-drag';

interface WhiteboardTreeItemProps {
  board: WhiteboardItem;
  isActive: boolean;
}

function WhiteboardTreeItem({ board, isActive }: WhiteboardTreeItemProps) {
  function handleDragStart(e: React.DragEvent) {
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
  }

  return (
    <Link
      href={`/whiteboards/${board.id}`}
      draggable
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

async function loadWhiteboards(): Promise<WhiteboardItem[]> {
  const [data, pending] = await Promise.all([
    getWhiteboards(),
    readPendingRows('whiteboard'),
  ]);
  return overlayWhiteboardRows(data, pending);
}

/**
 * I3：loader 兜底——服务端 action 失败（离线/RSC 失败）时退回
 * 「旧行 + readPendingRows overlay」，不再无 catch 悬空。
 */
export async function safeLoadWhiteboards(prevRows: WhiteboardItem[]): Promise<WhiteboardItem[]> {
  try {
    return await loadWhiteboards();
  } catch {
    const pending = await readPendingRows('whiteboard');
    return overlayWhiteboardRows(prevRows, pending);
  }
}

export function WhiteboardTree() {
  const [boards, setBoards] = useState<WhiteboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const [version, setVersion] = useState(0);

  // 旧行快照：loader 兜底时的「旧行」来源（不触发重渲染）
  const boardsRef = useRef<WhiteboardItem[]>([]);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  useEffect(() => {
    let alive = true;
    async function load() {
      // I3：safe 版兜底（离线 → 旧行 + pending overlay），finally 保证 loading 收敛
      try {
        const data = await safeLoadWhiteboards(boardsRef.current);
        if (!alive) return;
        setBoards(data);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, version]);

  // applyLocal 改名 / pull 远端变化 → 重取
  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'whiteboard') setVersion((v) => v + 1);
  }), []);

  if (loading) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">加载中...</div>;
  }

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
