'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { AddViewMenu } from '@/components/collection/AddViewMenu';
import { AddPropertyMenu } from '@/components/collection/AddPropertyMenu';
import { setActiveView } from '@/actions/collection/views';
import { columnsFromProperties, rowsFromItems, toCsv } from '@/lib/collection/csv';
import { useRouter } from 'next/navigation';
import type { getCollection } from '@/actions/collection/collection';

type Collection = Awaited<ReturnType<typeof getCollection>>;

interface CollectionHeaderProps {
  collection: NonNullable<Collection>;
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const router = useRouter();
  const activeView = collection.views.find((v: { isActive: boolean }) => v.isActive) || collection.views[0];

  const handleViewChange = async (viewId: string) => {
    await setActiveView(collection.id, viewId);
    router.refresh();
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
        <h1 className="min-w-0 truncate text-2xl font-semibold">{collection.name}</h1>
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
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="outline" onClick={handleDownloadCsv} className="h-8 gap-1.5 text-xs">
            <Download className="size-3.5" />
            下载为 CSV
          </Button>
          <AddPropertyMenu collectionId={collection.id} />
          <AddViewMenu collectionId={collection.id} />
        </div>
      </div>
    </div>
  );
}
