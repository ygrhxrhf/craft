'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HIDE_ORDER_FIELDS, SHOW_HIDE_FIELDS, formatHiddenFields } from '@/lib/collection/field-menu-copy';
import { fieldShownInView, hiddenFieldCount, type ViewFields } from '@/lib/collection/view-fields';

interface FieldRow {
  id: string;
  name: string;
  isVisible: boolean;
  order: number;
}

interface HideOrderFieldsMenuProps {
  /** 本视图实际渲染的列（顺序即屏上顺序）。 */
  rows: FieldRow[];
  hidden: ViewFields['hidden'];
  onToggle: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}

/**
 * G1537 的第二处承载面：官方把「隐藏和排序字段」放在视图工具条上（与「添加筛选器」「添加排序条件」
 * 同处一排，见 `TableView.tsx` 的 `tools`），本组件就挂在那一排。
 *
 * G81：可见性与顺序是**每个视图一套** ⇒ 这两枚动作只改视图 config（`hiddenProperties` /
 * `customPropertyOrder`），不再写 `collection_property` 行——换一个视图，字段表就跟着换。
 *
 * 眼睛与计数按**两层**算（`fieldShownInView`）：列菜单的「隐藏字段」写的是全局下线，列从表上消失
 * 后这里若只读本视图那一层，就会报「0 隐藏字段」且眼睛还是睁的。把全局那一枚点回来由 `onToggle`
 * 的持有者负责（它才知道属性行在哪），面板自己仍然只调这一枚回调。
 */
export function HideOrderFieldsMenu({ rows, hidden, onToggle, onMove }: HideOrderFieldsMenuProps) {
  const [open, setOpen] = useState(false);
  const hiddenCount = hiddenFieldCount(rows, hidden);

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        {HIDE_ORDER_FIELDS}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{HIDE_ORDER_FIELDS}</DialogTitle>
          </DialogHeader>

          <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
            {rows.map((row, index) => {
              const visible = fieldShownInView(row, hidden);
              return (
                <li key={row.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                  <button
                    type="button"
                    aria-label={`${SHOW_HIDE_FIELDS} ${row.name}`}
                    aria-pressed={visible}
                    onClick={() => onToggle(row.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label={`上移 ${row.name}`}
                    disabled={index === 0}
                    onClick={() => onMove(row.id, -1)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移 ${row.name}`}
                    disabled={index === rows.length - 1}
                    onClick={() => onMove(row.id, 1)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </li>
              );
            })}
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
