'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EyeOff, Pin, PinOff } from 'lucide-react';

import { getSyncManager } from '@/lib/sync-core';
import { orderAfterDrop, orderPatches } from '@/lib/document/sibling-order';
import type { TagBrowseGroup } from '@/lib/browse/tag-browse';
import { tagLevel } from '@/lib/browse/tag-browse';
import { formatDocCount } from '@/lib/browse/official-copy';
import { addIgnoreRule } from '@/actions/tag/ignore-rules';
import { TAG_ADDED_TO_IGNORE_LIST } from '@/lib/tag/ignore-copy';
import { toast } from '@/components/ui/toast';
import {
  PINNED_ERROR,
  PIN_SHOW_CHILDREN_LABEL,
  pinDecision,
  pinToggleLabel,
} from '@/lib/browse/pinned-tags';
import { confirmDialog } from '@/lib/dialog/show';
import { useDragArm } from '@/lib/dnd/use-drag-arm';

function TagRow({ group, nested = false }: { group: TagBrowseGroup; nested?: boolean }) {
  return (
    <Link
      href={`/tags/${group.id}`}
      className="flex h-8 items-center gap-2 rounded-md px-2 text-ui transition-colors hover:bg-foreground/4"
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: group.color }}
      />
      {/* A nested row sits under its parent already, so only its own level is repeated. */}
      <span className="min-w-0 flex-1 truncate">
        {nested ? tagLevel(group.name).leaf : group.name}
      </span>
      <span className="shrink-0 text-foreground/55">{formatDocCount(group.documentCount)}</span>
    </Link>
  );
}

/**
 * G94 `tag_reorder`：标签区也有自己的整批顺序。拖顶层标签时把 0…n-1 一次写进 `tag.order`
 *（与收藏区、文档树同一条口径）；子标签跟着父级走，不单独排序。
 */
export function TagTreeList({ groups }: { groups: TagBrowseGroup[] }) {
  const router = useRouter();
  const [items, setItems] = useState(groups);
  const [dragging, setDragging] = useState<number | null>(null);
  // G56：触摸端长按走合成的拖拽事件，桌面仍由原生 HTML5 拖拽接管。
  const dragArm = useDragArm('general');
  // G173：固定失败/到上限时的那一句（不是静默吞掉）。
  const [pinError, setPinError] = useState<string | null>(null);

  // router.refresh() 之后服务端重排的结果要回到本地列表（置顶切换会改变顺序）。
  useEffect(() => {
    setItems(groups);
  }, [groups]);

  const commitOrder = async (next: TagBrowseGroup[]) => {
    setItems(next);
    const patches = orderPatches(next.map((group) => group.id));
    const manager = getSyncManager();
    for (const patch of patches) {
      await manager.applyLocal({ table: 'tag', id: patch.id, patch: { order: patch.order } });
    }
    await manager.flushNow();
    router.refresh();
  };

  const handleDrop = async (targetIndex: number, after: boolean) => {
    if (dragging === null) return;
    const dragged = items[dragging];
    const target = items[targetIndex];
    setDragging(null);
    if (!dragged || !target || dragged.id === target.id) return;

    const ids = orderAfterDrop(
      items.map((group, index) => ({ id: group.id, order: index })),
      dragged.id,
      target.id,
      after ? 'after' : 'before',
    );
    const byId = new Map(items.map((group) => [group.id, group]));
    const next = ids.map((id) => byId.get(id)).filter((group): group is TagBrowseGroup => Boolean(group));
    if (next.length === items.length) await commitOrder(next);
  };

  /**
   * G607 `tag_pin` / `tag_unpin`：置顶是标签自己的布尔位，不依赖整批顺序。
   * G173：固定前有三件事——上限判据（`pinned.limit.reached`）、「固定并显示所有子项」
   * （连带把后代一并固定）、失败句（`pinned.error`）。
   */
  const togglePin = async (group: TagBrowseGroup) => {
    setPinError(null);
    const pinnedCount = items.filter((item) => item.pinned).length;
    const withChildren = group.children.length > 0 ? await confirmDialog({
      title: PIN_SHOW_CHILDREN_LABEL,
      message: `是否连同「${group.name}」的所有子标签一起固定？`,
      confirmLabel: PIN_SHOW_CHILDREN_LABEL,
    }) : false;
    const childrenOf = (id: string): string[] => {
      const find = (list: TagBrowseGroup[]): TagBrowseGroup | undefined => {
        for (const candidate of list) {
          if (candidate.id === id) return candidate;
          const nested = find(candidate.children);
          if (nested) return nested;
        }
        return undefined;
      };
      return (find(items)?.children ?? []).map((child) => child.id);
    };
    const decision = group.pinned
      ? { allowed: true, reason: null, ids: [group.id] }
      : pinDecision({ pinnedCount, withChildren, tagId: group.id, childrenOf });
    if (!decision.allowed) {
      setPinError(decision.reason ?? PINNED_ERROR);
      return;
    }
    try {
      const manager = getSyncManager();
      for (const id of decision.ids) {
        await manager.applyLocal({ table: 'tag', id, patch: { pinned: !group.pinned } });
      }
      await manager.flushNow();
      router.refresh();
    } catch {
      setPinError(PINNED_ERROR);
    }
  };

  return (
    <div>
      {pinError && (
        <p role="status" className="mb-2 text-meta text-destructive">
          {pinError}
        </p>
      )}
      <ul className="flex flex-col gap-px">
      {items.map((group, index) => (
        <li
          key={group.id}
          draggable
          data-testid={`tag-row-${group.id}`}
          onPointerDown={dragArm.onPointerDown}
          onPointerMove={dragArm.onPointerMove}
          onPointerUp={dragArm.onPointerUp}
          onDragStart={() => setDragging(index)}
          onDragEnd={() => setDragging(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            void handleDrop(index, event.clientY > rect.top + rect.height / 2);
          }}
          className={dragging === index ? 'opacity-50' : undefined}
        >
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <TagRow group={group} />
            </div>
            <button
              type="button"
              aria-label={`忽略标签 ${group.name}`}
              title="忽略"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                void addIgnoreRule(group.name)
                  .then(() => {
                    toast.add({ title: TAG_ADDED_TO_IGNORE_LIST, type: 'success' });
                    router.refresh();
                  })
                  .catch(() => toast.add({ title: '没有添加到忽略列表，请重试', type: 'error' }));
              }}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              <EyeOff className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={pinToggleLabel(Boolean(group.pinned)).label}
              title={pinToggleLabel(Boolean(group.pinned)).label}
              onClick={() => void togglePin(group)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              {group.pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
            </button>
          </div>
          {group.children.length > 0 && (
            <ul className="ml-5 flex flex-col gap-px border-l border-border/60 pl-2">
              {group.children.map((child) => (
                <li key={child.id}>
                  <TagRow group={child} nested />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
      </ul>
    </div>
  );
}
