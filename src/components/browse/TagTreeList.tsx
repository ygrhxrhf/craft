'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pin, PinOff } from 'lucide-react';

import { getSyncManager } from '@/lib/sync-core';
import { orderAfterDrop, orderPatches } from '@/lib/document/sibling-order';
import type { TagBrowseGroup } from '@/lib/browse/tag-browse';
import { tagLevel } from '@/lib/browse/tag-browse';
import { formatDocCount } from '@/lib/browse/official-copy';

function TagRow({ group, nested = false }: { group: TagBrowseGroup; nested?: boolean }) {
  return (
    <Link
      href={`/tags/${group.id}`}
      className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors hover:bg-foreground/4"
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
      <span className="shrink-0 text-muted-foreground">{formatDocCount(group.documentCount)}</span>
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

  /** G607 `tag_pin` / `tag_unpin`：置顶是标签自己的布尔位，不依赖整批顺序。 */
  const togglePin = async (group: TagBrowseGroup) => {
    const manager = getSyncManager();
    await manager.applyLocal({ table: 'tag', id: group.id, patch: { pinned: !group.pinned } });
    await manager.flushNow();
    router.refresh();
  };

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((group, index) => (
        <li
          key={group.id}
          draggable
          data-testid={`tag-row-${group.id}`}
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
              aria-label={group.pinned ? '取消固定' : '固定'}
              title={group.pinned ? '取消固定' : '固定'}
              onClick={() => void togglePin(group)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              {group.pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
            </button>
          </div>
          {group.children.length > 0 && (
            <ul className="ml-5 border-l border-border/60 pl-2">
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
  );
}
