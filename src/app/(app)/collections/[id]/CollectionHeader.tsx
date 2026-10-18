'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, MoreHorizontal } from 'lucide-react';
import { AddViewMenu } from '@/components/collection/AddViewMenu';
import { AddPropertyMenu } from '@/components/collection/AddPropertyMenu';
import { ViewActionsMenu } from '@/components/collection/ViewActionsMenu';
import { setActiveView } from '@/actions/collection/views';
import { columnsFromProperties, rowsFromItems, toCsv } from '@/lib/collection/csv';
import { getSyncManager } from '@/lib/sync-core';
import { confirmDialog, promptDialog } from '@/lib/dialog/show';
import { useRouter } from 'next/navigation';
import type { getCollection } from '@/actions/collection/collection';

type Collection = Awaited<ReturnType<typeof getCollection>>;

interface CollectionHeaderProps {
  collection: NonNullable<Collection>;
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const router = useRouter();
  const [name, setName] = useState(collection.name);
  const activeView = collection.views.find((v: { isActive: boolean }) => v.isActive) || collection.views[0];

  const handleViewChange = async (viewId: string) => {
    await setActiveView(collection.id, viewId);
    router.refresh();
  };

  // G1536：集合改名／删除。落库列都在 `collection` 白名单里 ⇒ 走 applyLocal（红线），
  // 改完 flushNow 再 refresh，否则列表读服务端权威行会读到旧名字（与白板改名同一条规则）。
  const handleRename = async () => {
    const next = await promptDialog({ title: '重命名集合', defaultValue: name, confirmLabel: '保存' });
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === name) return;
    const manager = getSyncManager();
    await manager.applyLocal({ table: 'collection', id: collection.id, patch: { name: trimmed } });
    await manager.flushNow();
    setName(trimmed);
    router.refresh();
  };

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: '删除集合',
      message: `你确定要删除“${name}”吗？`,
      confirmLabel: '删除',
    });
    if (!confirmed) return;
    const manager = getSyncManager();
    await manager.applyLocal({
      table: 'collection',
      id: collection.id,
      patch: { isDeleted: true, deletedAt: new Date().toISOString() },
    });
    await manager.flushNow();
    router.push('/collections');
  };

  // G290：集合专属导出格式「下载为 CSV」（官方 `collections.download.as.csv`）。
  const handleDownloadCsv = () => {
    const columns = columnsFromProperties(
      collection.properties.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
    );
    const rows = rowsFromItems(
      collection.items.map((item: { id?: string; values?: { propertyId: string; value: unknown }[] }) => ({
        id: String(item.id ?? ''),
        values: item.values ?? [],
      })),
    );
    const csv = toCsv(columns, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name || 'collection'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-b border-border bg-background px-[var(--editor-pad-x)] py-4">
      <div className="mb-4 flex items-center gap-3">
        {collection.icon && (
          <span className="text-3xl">{collection.icon}</span>
        )}
        <h1 className="min-w-0 truncate text-2xl font-semibold">{name}</h1>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Tabs value={activeView?.id} onValueChange={handleViewChange} className="min-w-0">
          <TabsList className="max-w-full overflow-x-auto">
            {collection.views.map((view: { id: string; name: string }) => (
              <TabsTrigger key={view.id} value={view.id}>
                {view.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {/* G1538：视图删除。Tab 里塞不下第二个按钮（TabsTrigger 本身就是 button），故单独立一个菜单 */}
        <ViewActionsMenu
          views={collection.views as { id: string; name: string; isActive: boolean }[]}
          activeViewId={activeView?.id ?? ''}
        />
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="outline" onClick={handleDownloadCsv} className="h-8 gap-1.5 text-xs">
            <Download className="size-3.5" />
            下载为 CSV
          </Button>
          <AddPropertyMenu collectionId={collection.id} />
          <AddViewMenu collectionId={collection.id} />
          {/* G1536：集合改名／删除 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label="集合操作"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRename}>重命名</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                删除集合
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
