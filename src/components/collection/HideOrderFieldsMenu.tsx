'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSyncManager } from '@/lib/sync-core';
import {
  HIDE_ORDER_FIELDS,
  SHOW_HIDE_FIELDS,
  formatHiddenFields,
} from '@/lib/collection/field-menu-copy';

interface FieldRow {
  id: string;
  name: string;
  isVisible: boolean;
  order: number;
}

interface HideOrderFieldsMenuProps {
  properties: FieldRow[];
}

/**
 * G1537 的第二处承载面：官方把「隐藏和排序字段」放在视图工具条上（与「添加筛选器」「添加排序条件」
 * 同处一排，见 `TableView.tsx` 的 `tools`），本组件就挂在那一排。
 *
 * 面板里每行能切换该字段的显示/隐藏（官方 `collections.show.hide.fields`「显示/隐藏字段」），
 * 并用上移/下移改 `order`——**排序机制本身没有官方 key**（官方是拖拽），故两枚按钮的可及名是
 * 描述性中文，不冒充官方文案。写入一律走离线内核的 `collection_property`（白名单含 `order`／`isVisible`）。
 */
export function HideOrderFieldsMenu({ properties }: HideOrderFieldsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [busy, setBusy] = useState(false);

  const sorted = [...properties].sort((a, b) => a.order - b.order);

  // 打开时按当前服务端行铺开；关闭后再开要重读，免得留在旧快照上。
  // ☆ 放在事件里而不是 useEffect：effect 里同步 setState 会触发级联渲染（eslint 的
  //   react-hooks/set-state-in-effect 就是这么判的）。
  const openPanel = () => {
    setRows(sorted);
    setOpen(true);
  };

  const hiddenCount = rows.filter((row) => !row.isVisible).length;

  const settle = async () => {
    await getSyncManager().flushNow();
    router.refresh();
  };

  const toggleVisible = async (id: string) => {
    if (busy) return;
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    setBusy(true);
    try {
      const nextVisible = !row.isVisible;
      setRows((prev) => prev.map((item) => (item.id === id ? { ...item, isVisible: nextVisible } : item)));
      await getSyncManager().applyLocal({
        table: 'collection_property',
        id,
        patch: { isVisible: nextVisible },
      });
      await settle();
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (busy) return;
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setBusy(true);
    try {
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      const reordered = next.map((row, i) => ({ ...row, order: i }));
      setRows(reordered);
      const manager = getSyncManager();
      for (const row of reordered) {
        const before = rows.find((item) => item.id === row.id)?.order;
        if (before === row.order) continue; // 只写真的动过的那两行
        await manager.applyLocal({
          table: 'collection_property',
          id: row.id,
          patch: { order: row.order },
        });
      }
      await settle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={openPanel}>
        <SlidersHorizontal className="size-4" />
        {HIDE_ORDER_FIELDS}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{HIDE_ORDER_FIELDS}</DialogTitle>
          </DialogHeader>

          <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                <button
                  type="button"
                  aria-label={`${SHOW_HIDE_FIELDS} ${row.name}`}
                  aria-pressed={row.isVisible}
                  disabled={busy}
                  onClick={() => void toggleVisible(row.id)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  {row.isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label={`上移 ${row.name}`}
                  disabled={busy || index === 0}
                  onClick={() => void move(index, -1)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`下移 ${row.name}`}
                  disabled={busy || index === rows.length - 1}
                  onClick={() => void move(index, 1)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <p className="mr-auto text-xs text-muted-foreground" data-testid="hidden-field-count">
              {formatHiddenFields(hiddenCount)}
            </p>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
