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
import { confirmDialog, promptDialog } from '@/lib/dialog/show';
import { readLocalRecords } from '@/components/sync/local-records';
import {
  DELETE_FIELD,
  DELETE_FIELD_DESC,
  EDIT_FIELD,
  FIELD_NAME,
  HIDE_FIELDS,
  SHOW_HIDE_FIELDS,
} from '@/lib/collection/field-menu-copy';

interface FieldMenuProps {
  property: { id: string; name: string; isVisible: boolean };
}

/**
 * G1537：集合字段（列）的改名／隐藏／删除。
 *
 * 官方文案（`src/lib/collection/field-menu-copy.ts`）：「编辑字段」「字段名称」「隐藏字段」／
 * 「显示/隐藏字段」，以及删除确认句（官方 `alert.delete.field.desc`，逐字见文案模块）。
 *
 * 写入走离线内核：`collection_property` 与 `collection_value` 都在 `src/lib/sync/tables.ts`
 * 白名单内，不走 `src/actions/collection/properties.ts` 里那三枚零调用的 server action。
 * 删字段要连它的取值一起软删——否则表里会留下指向不存在列的孤儿值（与 `deleteProperty` 同语义）。
 */
export function FieldMenu({ property }: FieldMenuProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const settle = async () => {
    // 列表读服务端权威行（getCollection 按 order 读 collection_property）⇒ 先 flushNow 再 refresh
    await getSyncManager().flushNow();
    router.refresh();
  };

  const handleRename = async () => {
    const next = await promptDialog({
      title: EDIT_FIELD,
      placeholder: FIELD_NAME,
      defaultValue: property.name,
      confirmLabel: '保存',
    });
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === property.name) return;
    setBusy(true);
    try {
      await getSyncManager().applyLocal({
        table: 'collection_property',
        id: property.id,
        patch: { name: trimmed },
      });
      await settle();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVisible = async () => {
    setBusy(true);
    try {
      await getSyncManager().applyLocal({
        table: 'collection_property',
        id: property.id,
        patch: { isVisible: !property.isVisible },
      });
      await settle();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: EDIT_FIELD,
      message: DELETE_FIELD_DESC,
      confirmLabel: '删除',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const manager = getSyncManager();
      const now = new Date().toISOString();
      // 该列的取值一起软删（本地镜像里按 propertyId 找；镜像不可用时退化为只删列）
      const values = await readLocalRecords('collection_value');
      for (const row of values) {
        if (row.op === 'delete' || row.data?.deletedAt) continue;
        if (row.data?.propertyId !== property.id) continue;
        await manager.applyLocal({
          table: 'collection_value',
          id: row.id,
          patch: { deletedAt: now },
        });
      }
      await manager.applyLocal({
        table: 'collection_property',
        id: property.id,
        patch: { deletedAt: now },
      });
      await settle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={`字段操作 ${property.name}`}
        disabled={busy}
        className="rounded-md p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => void handleRename()}>{EDIT_FIELD}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleToggleVisible()}>
          {property.isVisible ? HIDE_FIELDS : SHOW_HIDE_FIELDS}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => void handleDelete()}>
          {DELETE_FIELD}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
