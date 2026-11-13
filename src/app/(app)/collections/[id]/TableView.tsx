'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ExternalLink, Copy, FolderMinus, GripVertical, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useIsMobile } from '@/lib/use-is-mobile';
import { addItem, clearGroupValues, deleteItem, duplicateItem, removeItemFromCollection, setItemValue } from '@/actions/collection/items';
import { createDocument } from '@/actions/document/create';
import { toast } from '@/components/ui/toast';
import { operationFailed } from '@/lib/errors/alert-copy';
import { confirmDialog } from '@/lib/dialog/show';
import { getSyncManager } from '@/lib/sync-core';
import { parseCellValue } from '@/lib/collection/cell-value';
import { canReorder, planReorder, type OrderedRow } from '@/lib/collection/item-reorder';
import {
  COLUMN_DROP_MIME,
  columnDragState,
  columnLocationAt,
  columnOrderAfterLocation,
  type AfterTableColumnLocation,
} from '@/lib/collection/column-drop';
import { TABLE_OVERSCAN, createVirtualizationLatch, estimateRowHeight, scheduleScrollUpdate, visibleRowWindow } from '@/lib/collection/virtual-rows';
import { snapToDevicePixels, snappedRowHeightCss } from '@/lib/collection/row-height';
import { useDevicePixelRatio } from '@/components/collection/use-device-pixel-ratio';
import { titleColumnLabel } from '@/lib/collection/title-column';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { PropertyCell } from '@/components/collection/PropertyCell';
import { SummaryCell, aggregationFromConfig } from '@/components/collection/SummaryCell';
import { FieldMenu } from '@/components/collection/FieldMenu';
import { HideOrderFieldsMenu } from '@/components/collection/HideOrderFieldsMenu';
import { FilterBar, applyFilters } from '@/components/collection/FilterBar';
import { SortMenu, applySorts } from '@/components/collection/SortMenu';
import { GroupMenu, applyGrouping } from '@/components/collection/GroupMenu';
import type { getCollection } from '@/actions/collection/collection';
import type { AggregationId } from '@/lib/collection/summary';
import {
  calculationRowToggle,
  readShowCalculationRow,
  withShowCalculationRow,
} from '@/lib/collection/summary-row';
import {
  fieldsForView,
  moveField,
  readViewFields,
  toggleFieldHidden,
  type ViewFields,
} from '@/lib/collection/view-fields';
import { filterChipText, groupChipText, sortChipText, withTitleFirst } from '@/lib/collection/view-chips';
// G291: the status line reads the official one/x copy per lane instead of a bare count template.
import { collectionStatusLabel } from '@/lib/browse/plural';
import { OPERATORS } from '@/lib/collection/filter-operators';

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
  // G286：计算行整行可显隐，缺省显示。
  const [showSummary, setShowSummary] = useState(() => readShowCalculationRow(initialConfig));
  // G81：字段可见性与顺序是每视图一套。
  const [viewFields, setViewFields] = useState<ViewFields>(() => readViewFields(initialConfig));
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
    setShowSummary(readShowCalculationRow(config));
    setViewFields(readViewFields(config));
  }

  /**
   * 配置写入串行化。连续改动（添加筛选条件后马上改操作符、再填值）会并发调用 `flushNow()`，
   * 而每次 flush 推的是"调用那一刻的队列快照"——较早那次快照可能后落地，库里就留下旧配置，
   * 刷新后屏上退回旧值。串起来写，最后落地的一定是用户最后那次编辑。
   */
  const configWriteChain = useRef<Promise<void>>(Promise.resolve());
  // G484：大表格按窗口渲染（行数 × 可见列 > 600 才启用）。
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const cancelScrollUpdate = useRef<(() => void) | null>(null);
  // G497：判定 latch 只置 true、永不复位 ⇒ 删行或隐藏列不会立刻退回全量渲染。
  const virtualizationLatch = useRef(createVirtualizationLatch()).current;

  useEffect(
    () => () => {
      // 卸载时两条挂起任务都要清（rAF 与 150ms 防抖）。
      cancelScrollUpdate.current?.();
      cancelScrollUpdate.current = null;
    },
    [],
  );

  const persistConfig = (
    next: { filters: any[]; sorts: any[]; groupBy: string | null; fields?: ViewFields },
    showOverride?: boolean,
  ) => {
    const fields = next.fields ?? viewFields;
    const key = JSON.stringify(
      withShowCalculationRow(
        {
          filters: next.filters,
          sorts: next.sorts,
          groupBy: next.groupBy,
          hiddenProperties: [...fields.hidden],
          customPropertyOrder: [...fields.order],
        },
        showOverride ?? showSummary,
      ),
    );
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

  // G105: the title column (first text property) is always first when fields are merged.
  // G81：列序先吃本视图的 customPropertyOrder / hiddenProperties，再回落到属性行的 order。
  const visibleProperties = withTitleFirst(
    fieldsForView(collection.properties as any[], viewFields) as any[],
  );

  // 面板里列的是**全部字段**（含本视图隐藏的），顺序与屏上一致，供取消隐藏与上/下移。
  const menuRows = (() => {
    const rank = new Map(viewFields.order.map((id, index) => [id, index]));
    return [...(collection.properties as any[])]
      .slice()
      .sort((left, right) => {
        const leftRank = rank.get(left.id);
        const rightRank = rank.get(right.id);
        if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
        if (leftRank !== undefined) return -1;
        if (rightRank !== undefined) return 1;
        return left.order - right.order;
      })
      .map((property) => ({
        id: property.id as string,
        name: property.name as string,
        isVisible: property.isVisible === true,
        order: property.order as number,
      }));
  })();

  const toggleField = (id: string) => {
    // 全局下线（列菜单「隐藏字段」写的 `isVisible=false`）压在视图之上：视图这层只能再加隐藏，
    // 不能反向打开。眼睛要把这种列点回来，就得改属性行，否则那一下点了没反应。
    const row = menuRows.find((entry) => entry.id === id);
    if (row && !row.isVisible) {
      const manager = getSyncManager();
      void manager
        .applyLocal({ table: 'collection_property', id, patch: { isVisible: true } })
        .then(() => manager.flushNow())
        .then(() => router.refresh());
      if (viewFields.hidden.includes(id)) {
        const next = toggleFieldHidden(viewFields, id);
        setViewFields(next);
        void persistConfig({ filters, sorts, groupBy, fields: next });
      }
      return;
    }
    const next = toggleFieldHidden(viewFields, id);
    setViewFields(next);
    void persistConfig({ filters, sorts, groupBy, fields: next });
  };

  const moveFieldBy = (id: string, delta: -1 | 1) => {
    const next = moveField(viewFields, visibleProperties.map((property: any) => property.id), id, delta);
    if (next === viewFields) return;
    setViewFields(next);
    void persistConfig({ filters, sorts, groupBy, fields: next });
  };

  // Apply filters, sorts, and grouping
  let processedItems = collection.items;
  processedItems = applyFilters(processedItems, filters, collection.properties);
  processedItems = applySorts(processedItems, sorts, collection.properties);
  const groupedItems = applyGrouping(processedItems, groupBy, collection.properties);
  // G497：latch 只前进不复位；`regressed` 是"曾大今小"那条退化边沿，用来在尺寸回落后
  // 仍然接着滚动，等行数再涨回去时窗口立刻接得上。分组渲染另有表头行，行高按两枚常数估。
  const rowHeightDpr = useDevicePixelRatio();
  const rowHeightCss = snappedRowHeightCss(rowHeightDpr);
  const rowHeight = snapToDevicePixels(estimateRowHeight(Boolean(groupBy)), rowHeightDpr);
  const { virtualize: latched, regressed } = virtualizationLatch.decide(
    processedItems.length,
    visibleProperties.length,
  );
  const virtualized = !groupBy && latched;
  const rowWindow = virtualized
    ? visibleRowWindow({
        scrollTop,
        viewportHeight,
        rowCount: processedItems.length,
        rowHeight,
        overscan: TABLE_OVERSCAN,
      })
    : null;
  const renderedItems = rowWindow ? processedItems.slice(rowWindow.start, rowWindow.end) : processedItems;

  const handleSetValue = async (itemId: string, propertyId: string, value: any) => {
    await setItemValue(itemId, propertyId, value);
    router.refresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
    router.refresh();
  };

  // G834: `collections.duplicate.row` — the copy keeps the same collection memberships.
  const handleDuplicateItem = async (itemId: string) => {
    await duplicateItem(itemId);
    router.refresh();
  };

  // G289: 「移出集合」只摘归属；最后一项归属时才随行删除（服务端判定）。
  const handleMoveOut = async (itemId: string) => {
    await removeItemFromCollection(itemId, collection.id);
    router.refresh();
  };

  // G284：删分组＝清该组的值，项目本身不删（官方确认句逐字）。
  const handleDeleteGroup = async (
    propertyId: string,
    groupKey: string,
    label: string,
    count: number,
  ) => {
    const ok = await confirmDialog({
      title: '删除分组',
      message: `这将删除 ${count} 个项目中的“${label}”值。项目本身不会被删除。`,
      confirmLabel: '删除',
    });
    if (!ok) return;
    await clearGroupValues(collection.id, propertyId, groupKey);
    router.refresh();
  };

  const handleAddItem = async () => {
    await addItem(collection.id);
    router.refresh();
  };

  /** G91：汇总格的选择写进列 config；「默认」= 删掉该键。 */
  const handleSummaryPick = async (property: { id: string; config?: unknown }, next: AggregationId | null) => {
    const config = { ...parseConfig(typeof property.config === 'string' ? property.config : null) };
    if (next) config.summaryCalculation = next;
    else delete config.summaryCalculation;
    const manager = getSyncManager();
    await manager.applyLocal({
      table: 'collection_property',
      id: property.id,
      patch: { config: JSON.stringify(config) },
    });
    await manager.flushNow();
    router.refresh();
  };

  const getCellValue = (item: any, propertyId: string) => {
    const v = item.values?.find((val: any) => val.propertyId === propertyId);
    return parseCellValue(v?.value);
  };

  // G1539/G283：带筛选、排序或分组时屏上顺序不由 order 决定 ⇒ 三态任一激活都不给拖。
  const reorderEnabled = canReorder({
    sortCount: sorts.length,
    grouped: Boolean(groupBy),
    filterCount: filters.length,
  });
  const [dragId, setDragId] = useState<string | null>(null);

  // G397：列拖拽走的是**独立于块寻址的第二套落点协议**（`afterTableColumnLocation`），
  // 与行拖拽（`dragId`）分开一条线——载荷、落点、写回各管各的。
  // 「在拖哪一列」走模块级载荷（同侧栏 `sidebarDragState`）：`dragover` 读不到 dataTransfer，
  // React state 又要等一轮渲染，两处都会让落点判定扑空。
  const [columnDropTarget, setColumnDropTarget] = useState<{
    id: string;
    side: 'before' | 'after';
    location: AfterTableColumnLocation;
  } | null>(null);

  const visibleIds = visibleProperties.map((property: any) => String(property.id));

  /** 落点侧认载荷：dataTransfer 优先，坏掉或缺失时退回内存那份。 */
  const readColumnPayload = (event: ReactDragEvent<HTMLTableCellElement>) => {
    const raw = event.dataTransfer?.getData(COLUMN_DROP_MIME);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { column?: unknown };
        if (typeof parsed.column === 'string') return { tableId: view.id, column: parsed.column };
      } catch {
        // 载荷坏掉时退回内存载荷，不让一次脏数据把拖拽整个废掉。
      }
    }
    return columnDragState.payload;
  };

  const sideAtPointer = (event: ReactDragEvent<HTMLTableCellElement>): 'before' | 'after' => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX > rect.left + rect.width / 2 ? 'after' : 'before';
  };

  const locationAtPointer = (event: ReactDragEvent<HTMLTableCellElement>, index: number) =>
    columnLocationAt({ tableId: view.id, visibleIds, index, side: sideAtPointer(event) });

  const handleColumnDragOver = (
    event: ReactDragEvent<HTMLTableCellElement>,
    index: number,
    propertyId: string,
  ) => {
    if (!columnDragState.payload || !reorderEnabled) return;
    const location = locationAtPointer(event, index);
    if (!location) return; // 第一列左边没有「after」语义 ⇒ 这一格不收落点
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const side = sideAtPointer(event);
    if (columnDropTarget?.id !== propertyId || columnDropTarget.side !== side) {
      setColumnDropTarget({ id: propertyId, side, location });
    }
  };

  const handleColumnDrop = (event: ReactDragEvent<HTMLTableCellElement>, index: number) => {
    const sourceId = readColumnPayload(event)?.column ?? null;
    columnDragState.payload = null;
    setColumnDropTarget(null);
    if (!sourceId || !reorderEnabled) return;
    const location = locationAtPointer(event, index);
    if (!location) return;
    const nextOrder = columnOrderAfterLocation(visibleIds, sourceId, location);
    if (nextOrder.join(' ') === visibleIds.join(' ')) return;
    const next: ViewFields = { ...viewFields, order: nextOrder };
    setViewFields(next);
    void persistConfig({ filters, sorts, groupBy, fields: next });
  };

  const COLUMN_HEADER_CLASS =
    'border-b border-r border-border px-[var(--st-cell-padding-x)] py-[var(--st-cell-padding-y)] text-left typography-caption-md-500 text-muted-foreground first:border-l first:max-md:sticky first:max-md:left-0 first:max-md:z-[var(--st-z-sticky-header-index)] first:max-md:bg-muted';

  const columnHeaderProps = (property: any, index: number) => {
    const dropSide = columnDropTarget?.id === String(property.id) ? columnDropTarget.side : null;
    return {
      // 标题列由 withTitleFirst 钉在第一位（G105）⇒ 不给拖；带筛选/排序/分组时也不给拖。
      draggable: reorderEnabled && index > 0,
      'data-column-drop': dropSide ?? undefined,
      className:
        COLUMN_HEADER_CLASS +
        (dropSide === 'after'
          ? ' border-r-2 border-r-primary'
          : dropSide === 'before'
            ? ' border-l-2 border-l-primary'
            : ''),
      onDragStart: (event: ReactDragEvent<HTMLTableCellElement>) => {
        columnDragState.payload = { tableId: view.id, column: String(property.id) };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(
          COLUMN_DROP_MIME,
          JSON.stringify({ tableId: view.id, column: property.id }),
        );
      },
      onDragEnd: () => {
        columnDragState.payload = null;
        setColumnDropTarget(null);
      },
      onDragOver: (event: ReactDragEvent<HTMLTableCellElement>) =>
        handleColumnDragOver(event, index, String(property.id)),
      onDragLeave: () => setColumnDropTarget(null),
      onDrop: (event: ReactDragEvent<HTMLTableCellElement>) => handleColumnDrop(event, index),
    };
  };

  // 手柄的可及名要能认出是哪一行 ⇒ 取第一个可见字段的值当行标签
  const rowLabel = (item: any) => {
    const first = visibleProperties[0];
    if (!first) return '未命名';
    const raw = getCellValue(item, first.id);
    const text = raw === null || raw === undefined || raw === '' ? '未命名' : String(raw);
    return text.length > 24 ? `${text.slice(0, 24)}…` : text;
  };

  // G677：行＝页面。已有 documentId 直接进入；没有时新建一篇文档并把行指过去，
  // 正文改走文档/块编辑通路（不是把内容塞进集合值）。
  const openRowPage = async (item: any) => {
    if (item.documentId) {
      router.push(`/documents/${item.documentId}`);
      return;
    }
    const raw = visibleProperties[0] ? getCellValue(item, visibleProperties[0].id) : null;
    const title = raw === null || raw === undefined || raw === '' ? '' : String(raw).slice(0, 80);
    try {
      const doc = await createDocument({ title });
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'collection_item',
        id: item.id,
        patch: { documentId: doc.id },
      });
      await manager.flushNow();
      router.push(`/documents/${doc.id}`);
    } catch {
      toast.add({ type: 'error', title: operationFailed(null) });
    }
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
      <HideOrderFieldsMenu
        rows={menuRows}
        hidden={viewFields.hidden}
        onToggle={toggleField}
        onMove={moveFieldBy}
      />
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

      {(filters.length > 0 || sorts.length > 0 || groupBy) && (
        <div
          className="flex flex-wrap gap-1.5 border-b border-border px-[var(--editor-pad-x)] py-1.5"
          data-testid="collection-view-chips"
          aria-label={collectionStatusLabel({
            filters: filters.length,
            sorts: sorts.length,
            grouped: Boolean(groupBy),
          })}
        >
          {filters.map((filter: any) => {
            const property = collection.properties.find((p: any) => p.id === filter.propertyId);
            const definition = OPERATORS[filter.operator as keyof typeof OPERATORS];
            return (
              <button
                key={filter.id}
                type="button"
                aria-label="移除筛选"
                onClick={() => {
                  const next = filters.filter((f: any) => f.id !== filter.id);
                  setFilters(next);
                  void persistConfig({ filters: next, sorts, groupBy });
                }}
                className="flex items-center gap-1 rounded-full border border-border bg-foreground/4 px-2 py-0.5 text-[11px] text-foreground/70 hover:bg-foreground/8"
              >
                {filterChipText(
                  property?.name ?? '',
                  definition?.label ?? filter.operator,
                  filter.value,
                  definition?.takesValue ?? true,
                )}
                <X className="size-3" />
              </button>
            );
          })}
          {sorts.map((sort: any) => {
            const property = collection.properties.find((p: any) => p.id === sort.propertyId);
            return (
              <button
                key={sort.id}
                type="button"
                aria-label="移除排序"
                onClick={() => {
                  const next = sorts.filter((s: any) => s.id !== sort.id);
                  setSorts(next);
                  void persistConfig({ filters, sorts: next, groupBy });
                }}
                className="flex items-center gap-1 rounded-full border border-border bg-foreground/4 px-2 py-0.5 text-[11px] text-foreground/70 hover:bg-foreground/8"
              >
                {sortChipText(property?.name ?? '', sort.direction)}
                <X className="size-3" />
              </button>
            );
          })}
          {groupBy && (
            <button
              type="button"
              aria-label="移除分组"
              onClick={() => {
                setGroupBy(null);
                void persistConfig({ filters, sorts, groupBy: null });
              }}
              className="flex items-center gap-1 rounded-full border border-border bg-foreground/4 px-2 py-0.5 text-[11px] text-foreground/70 hover:bg-foreground/8"
            >
              {groupChipText(collection.properties.find((p: any) => p.id === groupBy)?.name ?? '')}
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      <div
        className="flex-1 overflow-auto"
        onScroll={(event) => {
          // 尺寸回落后（regressed）仍要跟着滚，等行数再涨回来窗口接得上；分组档不窗口化。
          if (groupBy || (!virtualized && !regressed)) return;
          const el = event.currentTarget;
          cancelScrollUpdate.current?.();
          cancelScrollUpdate.current = scheduleScrollUpdate(() => {
            setScrollTop(el.scrollTop);
            setViewportHeight(el.clientHeight);
          });
        }}
      >
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
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <span>
                      {groupLabel} ({items.length})
                    </span>
                    {property && ['select', 'multi_select'].includes(property.type) && groupKey !== '__ungrouped__' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-ui font-normal text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDeleteGroup(property.id, groupKey, groupLabel, items.length)}
                      >
                        删除分组
                      </Button>
                    )}
                  </h3>
                  <table
                    className="w-full border-collapse"
                    style={{ ['--st-row-height' as string]: rowHeightCss }}
                  >
                    <thead className="sticky top-0 z-[var(--st-z-sticky-header)] bg-muted/50 max-md:bg-muted">
                      <tr>
                        {visibleProperties.map((property: any, index: number) => (
                          <th key={property.id} {...columnHeaderProps(property, index)}>
                            <span className="flex items-center gap-1">
                              <span className="min-w-0 truncate">
                                {index === 0
                                  ? titleColumnLabel(collection.titleColumn, property.type) || property.name
                                  : property.name}
                              </span>
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
                              aria-label="打开页面" title="打开页面"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => void openRowPage(item)}
                            >
                              <ExternalLink className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="移出行（测试版）" title="移出行（测试版）"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => void handleMoveOut(item.id)}
                            >
                              <FolderMinus className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="复制条目" title="复制条目"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => void handleDuplicateItem(item.id)}
                            >
                              <Copy className="size-4 text-muted-foreground" />
                            </Button>
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
                    {showSummary && (
                    <tfoot>
                      <tr data-testid="collection-summary-row" className="bg-muted/30 text-muted-foreground">
                        {visibleProperties.map((property: any) => (
                          <td
                            key={property.id}
                            className="border-r border-border px-[var(--st-cell-padding-x)] py-1 typography-ui-sm-500 first:border-l"
                          >
                            <SummaryCell
                              type={property.type}
                              current={aggregationFromConfig(property.config)}
                              values={items.map((item: any) => getCellValue(item, property.id))}
                              rowCount={collection.items.length}
                              onPick={(next) => void handleSummaryPick(property, next)}
                            />
                          </td>
                        ))}
                        <td className="border-border px-1 py-0" />
                      </tr>
                    </tfoot>
                    )}
                  </table>
                </div>
              );
            })}
          </div>
        ) : (
          <table
            className="w-full border-collapse"
            style={{ ['--st-row-height' as string]: rowHeightCss }}
          >
            <thead className="sticky top-0 z-[var(--st-z-sticky-header)] bg-muted/50 max-md:bg-muted">
              <tr>
                {reorderEnabled && <th className="w-6 border-b border-r border-border px-0 py-0" />}
                {visibleProperties.map((property: any, index: number) => (
                  <th key={property.id} {...columnHeaderProps(property, index)}>
                    <span className="flex items-center gap-1">
                      <span className="min-w-0 truncate">
                        {index === 0
                          ? titleColumnLabel(collection.titleColumn, property.type) || property.name
                          : property.name}
                      </span>
                      <FieldMenu property={property} />
                    </span>
                  </th>
                ))}
                <th className="border-b border-border px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rowWindow && rowWindow.topPad > 0 && (
                <tr aria-hidden>
                  <td colSpan={visibleProperties.length + 2} style={{ height: rowWindow.topPad, padding: 0, border: 0 }} />
                </tr>
              )}
              {renderedItems.map((item: any) => (
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
                      aria-label="打开页面" title="打开页面"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => void openRowPage(item)}
                    >
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="移出行（测试版）" title="移出行（测试版）"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => void handleMoveOut(item.id)}
                    >
                      <FolderMinus className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="复制条目" title="复制条目"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => void handleDuplicateItem(item.id)}
                    >
                      <Copy className="size-4 text-muted-foreground" />
                    </Button>
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
              {rowWindow && rowWindow.bottomPad > 0 && (
                <tr aria-hidden>
                  <td colSpan={visibleProperties.length + 2} style={{ height: rowWindow.bottomPad, padding: 0, border: 0 }} />
                </tr>
              )}
            </tbody>
            {showSummary && (
            <tfoot>
              <tr data-testid="collection-summary-row" className="bg-muted/30 text-muted-foreground">
                {reorderEnabled && <td className="border-r border-border" />}
                {visibleProperties.map((property: any) => (
                  <td
                    key={property.id}
                    className="border-r border-border px-[var(--st-cell-padding-x)] py-1 typography-ui-sm-500 first:border-l"
                  >
                    <SummaryCell
                      type={property.type}
                      current={aggregationFromConfig(property.config)}
                      values={processedItems.map((item: any) => getCellValue(item, property.id))}
                      rowCount={collection.items.length}
                      onPick={(next) => void handleSummaryPick(property, next)}
                    />
                  </td>
                ))}
                <td className="border-border px-1 py-0" />
              </tr>
            </tfoot>
            )}
          </table>
        )}
      </div>

      <div className="border-t border-border p-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleAddItem}>
          <Plus className="mr-2 size-4" />
          新建
        </Button>
        {/* G286：计算行可整行收起。 */}
        <Button
          variant="ghost"
          size="sm"
          data-testid="calculation-row-toggle"
          aria-pressed={!showSummary}
          onClick={() => {
            const next = !showSummary;
            setShowSummary(next);
            void persistConfig({ filters, sorts, groupBy }, next);
          }}
        >
          {calculationRowToggle(showSummary).label}
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
