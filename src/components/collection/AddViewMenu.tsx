'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Columns3, LayoutList, LayoutTemplate, Plus, Sheet, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSyncManager } from '@/lib/sync-core';
import { readLocalRecords } from '@/components/sync/local-records';

const VIEW_TYPES: { type: 'table' | 'kanban' | 'calendar' | 'list' | 'gallery' | 'form'; label: string; icon: typeof Table2 }[] = [
  { type: 'table', label: '表格', icon: Table2 },
  { type: 'kanban', label: '看板', icon: Columns3 },
  { type: 'calendar', label: '日历', icon: CalendarDays },
  { type: 'list', label: '列表', icon: LayoutList },
  { type: 'gallery', label: '画廊', icon: Sheet },
  { type: 'form', label: '表单', icon: LayoutTemplate },
];

export function AddViewMenu({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const create = async (type: (typeof VIEW_TYPES)[number]['type'], label: string) => {
    setBusy(true);
    try {
      // 新视图 → 本地 id + applyLocal（order 取本地镜像内该集合的最大值+1，
      // 与服务端 createView 的算法一致）；flushNow 后 refresh 才能读到新行
      const rows = await readLocalRecords('collection_view');
      let maxOrder = -1;
      for (const r of rows) {
        if (r.op === 'delete' || r.data?.deletedAt) continue;
        if (r.data?.collectionId !== collectionId) continue;
        const order = typeof r.data.order === 'number' ? r.data.order : 0;
        if (order > maxOrder) maxOrder = order;
      }
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'collection_view',
        id: crypto.randomUUID(),
        patch: {
          collectionId,
          name: label,
          type,
          config: null,
          order: maxOrder + 1,
          isActive: false,
        },
      });
      await manager.flushNow();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" disabled={busy} />}
      >
        <Plus className="size-4" />
        视图
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {VIEW_TYPES.map((option) => (
          <DropdownMenuItem
            key={option.type}
            onClick={() => void create(option.type, option.label)}
          >
            <option.icon className="mr-2 size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
