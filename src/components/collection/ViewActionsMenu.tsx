'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSyncManager } from '@/lib/sync-core';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/lib/dialog/show';
import { DELETE_VIEW } from '@/lib/collection/view-menu-copy';

interface ViewActionsMenuProps {
  views: { id: string; name: string; isActive: boolean }[];
  activeViewId: string;
}

/**
 * G1538：集合视图可删（官方 `collections.delete.view`「删除视图」）。
 *
 * 落点＝集合详情页视图 Tab 右侧的「视图操作」菜单：只作用在**当前激活视图**上，
 * 确认框逐字报出要删的是哪一个视图，避免"删了哪个"靠猜。
 *
 * 写入走离线内核：`collection_view` 在 `src/lib/sync/tables.ts` 白名单内
 * （`name`／`isActive`／`order`／`deletedAt` 都可写），不走 `src/actions/collection/views.ts`
 * 的 `deleteView`——那条 server action 已被本菜单取代。
 *
 * ☆ 一处边界（别误删）：同文件的 `setActiveView` **仍在使用**——`CollectionHeader` 切换视图
 *   Tab 走的就是它（服务端写 + `router.refresh()`），并不属于"被 applyLocal 取代"的那一类。
 *   本菜单只负责删除，删除时才顺带把激活态改到存活视图上。
 *
 * ☆ 一处取舍＝**最后一个视图不可删**：集合详情页要靠一个激活视图才能渲染，
 *   删到零个会留下一个打不开的集合。故只剩一个视图时该项置灰（`disabled`），
 *   而不是删完再回退到 `/collections`——后者会让"删视图"变成"顺手离开这个集合"。
 */
export function ViewActionsMenu({ views, activeViewId }: ViewActionsMenuProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0];
  const onlyView = views.length <= 1;

  const handleDelete = async () => {
    if (busy || !activeView || onlyView) return;
    const confirmed = await confirmDialog({
      title: DELETE_VIEW,
      message: `你确定要删除“${activeView.name}”吗？`,
      confirmLabel: '删除',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const manager = getSyncManager();
      const now = new Date().toISOString();
      await manager.applyLocal({
        table: 'collection_view',
        id: activeView.id,
        patch: { deletedAt: now, isActive: false },
      });
      // 被删的是激活视图 ⇒ 把另一个存活视图顶上（与 setActiveView 同语义：一个 true、其余 false）
      const survivor = views.find((view) => view.id !== activeView.id);
      if (survivor) {
        await manager.applyLocal({
          table: 'collection_view',
          id: survivor.id,
          patch: { isActive: true },
        });
        for (const view of views) {
          if (view.id === activeView.id || view.id === survivor.id) continue;
          await manager.applyLocal({
            table: 'collection_view',
            id: view.id,
            patch: { isActive: false },
          });
        }
      }
      // 视图列表读服务端权威行（getCollection 按 order 读 collection_view）⇒ 先 flushNow 再 refresh
      await manager.flushNow();
      router.refresh();
    } catch {
      // 开库/推送失败（多为离线）：确认框已关，这里必须说一句，否则删除"点了没反应"
      toast.add({ id: 'view-delete-offline', type: 'warning', title: '需要网络' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="视图操作"
        disabled={busy}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          disabled={onlyView}
          onClick={() => void handleDelete()}
        >
          {DELETE_VIEW}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
