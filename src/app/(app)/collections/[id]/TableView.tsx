'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { GripVertical, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/lib/use-is-mobile';
import { addItem, deleteItem, setItemValue } from '@/actions/collection/items';
import { getSyncManager } from '@/lib/sync-core';
import { canReorder, planReorder, type OrderedRow } from '@/lib/collection/item-reorder';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PropertyCell } from '@/components/collection/PropertyCell';
import { FieldMenu } from '@/components/collection/FieldMenu';
import { HideOrderFieldsMenu } from '@/components/collection/HideOrderFieldsMenu';
import { FilterBar, applyFilters } from '@/components/collection/FilterBar';
import { SortMenu, applySorts } from '@/components/collection/SortMenu';
import { GroupMenu, applyGrouping } from '@/components/collection/GroupMenu';
import type { getCollection } from '@/actions/collection/collection';
import { summarizeColumn } from '@/lib/collection/summary';

type Collection = Awaited<ReturnType<typeof getCollection>>;
type View = NonNullable<Collection>['views'][number];

interface TableViewProps {
  collection: NonNullable<Collection>;
  view: View;
}

export function TableView({ collection, view }: TableViewProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [toolsOpen, setToolsOpen] = useState(false);
  const configKey = JSON.stringify((view as any).config ?? null);
  const initialConfig = parseConfig((view as any).config);
  const [syncedView, setSyncedView] = useState({ id: view.id, key: configKey });
  /**
   * 本机写过的 config key（尾部即最新一次）。`persistConfig` 写完就 `router.refresh()`，
   * 而**前一次**写入的 refresh 可能后到：它带回的是更旧的 config，若当成"外部变更"采纳，
   * 屏上刚填好的筛选/排序就会被顶回去（实测：给筛选条件填第二个字段时整条条件被清空，
   * `string_contains` 拿到空 operand 于是全表 0 行）。所以本机写过的旧 key 一律不采纳。
   */
  const [writtenConfigKeys, setWrittenConfigKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>(initialConfig.filters ?? []);
  const [sorts, setSorts] = useState<any[]>(initialConfig.sorts ?? []);
  const [groupBy, setGroupBy] = useState<string | null>(initialConfig.groupBy ?? null);

  /**
   * 视图配置的重新同步，两条判据：
   * ① **换了视图**（id 变了）⇒ 无条件按新视图的配置重来，并丢掉上一个视图的写入记录；
   * ② **同一视图的 config 变了** ⇒ 采纳，除非它是本机写过的**旧** key（乱序回显）。
   * ☆ 代价：若这一笔被服务端拒收（G1506），屏上会保留本地值直到下一次外部变更/换视图——
   *   比"每次刷新都把用户刚做的编辑抹掉"轻，且与"本地写即时可见"的既有口径一致。
   */
  const latestWrittenKey = writtenConfigKeys.length ? writtenConfigKeys[writtenConfigKeys.length - 1] : null;
  const viewChanged = syncedView.id !== view.id;
  const configChanged = syncedView.key !== configKey;
  const staleEcho = writtenConfigKeys.includes(configKey) && configKey !== latestWrittenKey;
  if (viewChanged || (configChanged && !staleEcho)) {
    const config = parseConfig((view as any).config);
    setSyncedView({ id: view.id, key: configKey });
    if (viewChanged || configKey === latestWrittenKey) setWrittenConfigKeys([]);
    setFilters(config.filters ?? []);
    setSorts(config.sorts ?? []);
    setGroupBy(config.groupBy ?? null);
  }

  /**
   * 配置写入串行化。连续改动（添加筛选条件后马上改操作符、再填值）会并发调用 `flushNow()`，
   * 而每次 flush 推的是"调用那一刻的队列快照"——较早那次快照可能后落地，库里就留下旧配置，
   * 刷新后屏上退回旧值。串起来写，最后落地的一定是用户最后那次编辑。
   */
  const configWriteChain = useRef<Promise<void>>(Promise.resolve());

  const persistConfig = (next: { filters: any[]; sorts: any[]; groupBy: string | null }) => {
    const key = JSON.stringify(next);
    setWrittenConfigKeys((keys) => [...keys, key].slice(-8));
    configWriteChain.current = configWriteChain.current
      .then(async () => {
        const manager = getSyncManager();
        await manager.applyLocal({
          table: 'collection_view',
          id: view.id,
          patch: { config: key },
        });
        await manager.flushNow();
        router.refresh();
      })
      .catch(() => {
        // 单笔失败不该卡死后续写入；权威值由后续 pull/刷新收敛
      });
    return configWriteChain.current;
  };

  const visibleProperties = collection.properties
    .filter((p: any) => p.isVisible)
    .sort((a: any, b: any) => a.order - b.order);

  // Apply filters, sorts, and grouping
  let processedItems = collection.items;
  processedItems = applyFilters(processedItems, filters, collection.properties);
  processedItems = applySorts(processedItems, sorts, collection.properties);
  const groupedItems = applyGrouping(processedItems, groupBy, collection.properties);

  const handleSetValue = async (itemId: string, propertyId: string, value: any) => {
    await setItemValue(itemId, propertyId, value);
    router.refresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
    router.refresh();
  };

  const handleAddItem = async () => {
    await addItem(collection.id);
    router.refresh();
  };

  const getCellValue = (item: any, propertyId: string) => {
    const v = item.values?.find((val: any) => val.propertyId === propertyId);
    return v?.value ?? null;
  };

  // G1539：条目拖拽重排。带排序或分组时屏上顺序由它们决定，order 改了也看不见 ⇒ 那时不给拖。
  const reorderEnabled = canReorder({ sortCount: sorts.length, grouped: Boolean(groupBy) });
  const [dragId, setDragId] = useState<string | null>(null);

  // 手柄的可及名要能认出是哪一行 ⇒ 取第一个可见字段的值当行标签
  const rowLabel = (item: any) => {
    const first = visibleProperties[0];
    if (!first) return '未命名';
    const raw = getCellValue(item, first.id);
    const text = raw === null || raw === undefined || raw === '' ? '未命名' : String(raw);
    return text.length > 24 ? `${text.slice(0, 24)}…` : text;
  };

  const handleDrop = async (targetId: string) => {
    const sourceId = dragId;
    setDragId(null);
    if (!sourceId || sourceId === targetId || !reorderEnabled) return;
    // 拖拽按**全集**顺序重排：筛选只减少屏上行数，不改顺序来源（见 item-reorder 的 planReorder）。
    const rows: OrderedRow[] = collection.items.map((item: any) => ({
      id: String(item.id),
      order: Number(item.order ?? 0),
    }));
    const patches = planReorder(rows, sourceId, targetId);
    if (patches.length === 0) return;
    const manager = getSyncManager();
    for (const patch of patches) {
      await manager.applyLocal({
        table: 'collection_item',
        id: patch.id,
        patch: { order: patch.order },
      });
    }
    // 行序读服务端权威行（getCollection 按 order 读 collection_item）⇒ 先 flushNow 再 refresh
    await manager.flushNow();
    router.refresh();
  };

  const tools = (
    <>
      <FilterBar
        collection={collection}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          void persistConfig({ filters: next, sorts, groupBy });
        }}
      />
      <SortMenu
        collection={collection}
        sorts={sorts}
        onSortsChange={(next) => {
          setSorts(next);
          void persistConfig({ filters, sorts: next, groupBy });
        }}
      />
      <GroupMenu
        collection={collection}
        groupBy={groupBy}
        onGroupByChange={(next) => {
          setGroupBy(next);
          void persistConfig({ filters, sorts, groupBy: next });
        }}
      />
      {/* G1537：官方把「隐藏和排序字段」放在视图工具条上，与筛选/排序/分组同一排 */}
      <HideOrderFieldsMenu properties={collection.properties as any} />
    </>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-[var(--editor-pad-x)] py-2">
        {isMobile ? (
          <>
            {/* Phones keep two icons only: the view tools move into a bottom sheet. */}
            <Button variant="ghost" size="sm" onClick={() => setToolsOpen(true)} aria-label="视图工具">
              <SlidersHorizontal className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleAddItem} aria-label="新增条目">
              <Plus className="size-4" />
            </Button>
            <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
              <SheetContent side="bottom" snapPoints={[0.4, 0.7, 0.92]} className="max-h-[70dvh] gap-0 p-0">
                <SheetTitle className="sr-only">视图工具</SheetTitle>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">{tools}</div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          tools
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {groupBy ? (
          <div className="space-y-4 p-4">
            {Array.from(groupedItems.entries()).map(([groupKey, items]) => {
              const property = collection.properties.find((p: any) => p.id === groupBy);
              let groupLabel = groupKey;

              if (property?.type === 'select') {
                const config = parseConfig(property.config);
                const option = config.options?.find((o: any) => o.id === groupKey);
                groupLabel = option?.label ?? (groupKey === '__ungrouped__' ? '未分组' : groupKey);
              } else if (property?.type === 'checkbox') {
                groupLabel = groupKey === 'true' ? '是' : '否';
              }

              return (
                <div key={groupKey}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {groupLabel} ({items.length})
                  </h3>
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-[var(--st-z-sticky-header)] bg-muted/50 max-md:bg-muted">
                      <tr>
                        {visibleProperties.map((property: any) => (
                          <th
                            key={property.id}
                            className="border-b border-r border-border px-[var(--st-cell-padding-x)] py-[var(--st-cell-padding-y)] text-left typography-caption-md-500 text-muted-foreground first:border-l first:max-md:sticky first:max-md:left-0 first:max-md:z-[var(--st-z-sticky-header-index)] first:max-md:bg-muted"
                          >
                            <span className="flex items-center gap-1">
                              <span className="min-w-0 truncate">{property.name}</span>
                              <FieldMenu property={property} />
                            </span>
                          </th>
                        ))}
                        <th className="border-b border-border px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any) => (
                        <tr key={item.id} className="group h-[var(--st-row-height)] hover:bg-muted/30">
                          {visibleProperties.map((property: any) => (
                            <td
                              key={property.id}
                              className="border-b border-r border-border px-0 py-0 first:border-l first:max-md:sticky first:max-md:left-0 first:max-md:bg-background"
                            >
                              <PropertyCell
                                property={property}
                                value={getCellValue(item, property.id)}
                                onChange={(value) => handleSetValue(item.id, property.id, value)}
                                item={item}
                                properties={collection.properties as any}
                              />
                            </td>
                          ))}
                          <td className="border-b border-border px-1 py-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr data-testid="collection-summary-row" className="bg-muted/30 text-muted-foreground">
                        {visibleProperties.map((property: any) => (
                          <td
                            key={property.id}
                            className="border-r border-border px-[var(--st-cell-padding-x)] py-1 typography-ui-sm-500 first:border-l"
                          >
                            {summarizeColumn(property, items.map((item: any) => getCellValue(item, property.id)))}
                          </td>
                        ))}
                        <td className="border-border px-1 py-0" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-[var(--st-z-sticky-header)] bg-muted/50 max-md:bg-muted">
              <tr>
                {reorderEnabled && <th className="w-6 border-b border-r border-border px-0 py-0" />}
                {visibleProperties.map((property: any) => (
                  <th
                    key={property.id}
                    className="border-b border-r border-border px-[var(--st-cell-padding-x)] py-[var(--st-cell-padding-y)] text-left typography-caption-md-500 text-muted-foreground first:border-l first:max-md:sticky first:max-md:left-0 first:max-md:z-[var(--st-z-sticky-header-index)] first:max-md:bg-muted"
                  >
                    <span className="flex items-center gap-1">
                      <span className="min-w-0 truncate">{property.name}</span>
                      <FieldMenu property={property} />
                    </span>
                  </th>
                ))}
                <th className="border-b border-border px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {processedItems.map((item: any) => (
                <tr
                  key={item.id}
                  data-row-id={String(item.id)}
                  className="group h-[var(--st-row-height)] hover:bg-muted/30"
                  onDragOver={reorderEnabled ? (event) => event.preventDefault() : undefined}
                  onDrop={
                    reorderEnabled
                      ? (event) => {
                          event.preventDefault();
                          void handleDrop(String(item.id));
                        }
                      : undefined
                  }
                >
                  {reorderEnabled && (
                    <td className="w-6 border-b border-r border-border px-0 py-0 text-center">
                      <button
                        type="button"
                        draggable
                        aria-label={`拖动排序 ${rowLabel(item)}`}
                        onDragStart={(event) => {
                          setDragId(String(item.id));
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDragId(null)}
                        className="cursor-grab rounded-md p-1 text-muted-foreground/50 hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="size-3.5" />
                      </button>
                    </td>
                  )}
                  {visibleProperties.map((property: any) => (
                    <td
                      key={property.id}
                      className="border-b border-r border-border px-0 py-0 first:border-l first:max-md:sticky first:max-md:left-0 first:max-md:bg-background"
                    >
                      <PropertyCell
                        property={property}
                        value={getCellValue(item, property.id)}
                        onChange={(value) => handleSetValue(item.id, property.id, value)}
                        item={item}
                        properties={collection.properties as any}
                      />
                    </td>
                  ))}
                  <td className="border-b border-border px-1 py-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr data-testid="collection-summary-row" className="bg-muted/30 text-muted-foreground">
                {reorderEnabled && <td className="border-r border-border" />}
                {visibleProperties.map((property: any) => (
                  <td
                    key={property.id}
                    className="border-r border-border px-[var(--st-cell-padding-x)] py-1 typography-ui-sm-500 first:border-l"
                  >
                    {summarizeColumn(property, processedItems.map((item: any) => getCellValue(item, property.id)))}
                  </td>
                ))}
                <td className="border-border px-1 py-0" />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="border-t border-border p-2">
        <Button variant="ghost" size="sm" onClick={handleAddItem}>
          <Plus className="mr-2 size-4" />
          新建
        </Button>
      </div>
    </div>
  );
}

function parseConfig(config: string | null): any {
  if (!config) return {};
  try {
    return typeof config === 'string' ? JSON.parse(config) : config;
  } catch {
    return {};
  }
}
