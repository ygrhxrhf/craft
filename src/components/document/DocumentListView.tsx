'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { File, Check } from 'lucide-react';
import { cn } from 'cn';

import { scheduleScrollUpdate, visibleRowWindow } from '@/lib/collection/virtual-rows';

import {
  COLUMN_WIDTH_VARS,
  LIST_CELL_TYPOGRAPHY,
  LIST_COLUMN_CLASSES,
  LIST_COLUMN_LABELS,
  LIST_HEADER_TYPOGRAPHY,
  LIST_TITLE_TYPOGRAPHY,
  SHARED_COLUMN_WIDTH_VARS,
  SHARED_LIST_COLUMN_CLASSES,
  SHARED_LIST_COLUMN_LABELS,
  columnWidthValue,
} from '@/lib/browse/list-columns';
import { relativeTime } from '@/lib/document/relative-time';
import { rowSubtitle } from '@/lib/browse/row-subtitle';
import { OfflineBadge } from '@/components/sync/OfflineBadge';
import {
  ariaSortValue,
  nextSortSpec,
  sortArrow,
  sortBrowseRows,
  type BrowseSortSpec,
} from '@/lib/browse/list-sort';
import type { BrowseSortOption } from '@/lib/browse/toolbar-menu';
import {
  nextSortForDimension,
  sortDocs,
  type SortDimension,
  type SortSpec,
} from '@/lib/browse/sort';

interface ListDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  createdAt?: string | null;
  lastViewedAt?: string | null;
  /** G248: the row's subtitle comes from the body, not from a date. */
  plainText?: string | null;
  /** Variant C: whether the document is shared at all, and with whom. */
  shared?: boolean;
  sharedBy?: string | null;
}

export type ListVariant = 'all' | 'shared';

interface ColumnDef {
  id: string;
  label: string;
  slotClass: string;
  widthVar: string;
  widthClass: string;
}

/**
 * The three width classes, verbatim. They are literal strings so Tailwind can see them; the
 * `112px` fallback is what the official container writes inline.
 */
const WIDTH_CLASSES: Record<string, string> = {
  '--col-last-viewed-width': 'w-[var(--col-last-viewed-width,112px)]',
  '--col-updated-width': 'w-[var(--col-updated-width,112px)]',
  '--col-created-width': 'w-[var(--col-created-width,112px)]',
};

/** G1123：官方行高固定 65，列表档超过这个行数才切窗口渲染。 */
const LIST_VIRTUAL_THRESHOLD = 60;
const LIST_ROW_STEP = 65;
const LIST_VIEWPORT_HEIGHT = 480;

/** The all-documents header: 名称／上次浏览／已更新／已创建. */
const ALL_COLUMNS: ColumnDef[] = [
  {
    id: 'lastViewed',
    label: LIST_COLUMN_LABELS.lastViewed,
    slotClass: LIST_COLUMN_CLASSES.lastViewed,
    widthVar: COLUMN_WIDTH_VARS.lastViewed,
    widthClass: WIDTH_CLASSES['--col-last-viewed-width'],
  },
  {
    id: 'updated',
    label: LIST_COLUMN_LABELS.updated,
    slotClass: LIST_COLUMN_CLASSES.updated,
    widthVar: COLUMN_WIDTH_VARS.updated,
    widthClass: WIDTH_CLASSES['--col-updated-width'],
  },
  {
    id: 'created',
    label: LIST_COLUMN_LABELS.created,
    slotClass: LIST_COLUMN_CLASSES.created,
    widthVar: COLUMN_WIDTH_VARS.created,
    widthClass: WIDTH_CLASSES['--col-created-width'],
  },
];

/**
 * Variant C — 与我共享: 名称／共享／共享者／上次浏览. The slot classes stay positional, so
 * `colLastViewed` lands on the 共享 column (see list-columns.ts).
 */
const SHARED_COLUMNS: ColumnDef[] = [
  {
    id: 'shared',
    label: SHARED_LIST_COLUMN_LABELS.shared,
    slotClass: SHARED_LIST_COLUMN_CLASSES.shared,
    widthVar: SHARED_COLUMN_WIDTH_VARS.shared,
    widthClass: WIDTH_CLASSES['--col-last-viewed-width'],
  },
  {
    id: 'sharedBy',
    label: SHARED_LIST_COLUMN_LABELS.sharedBy,
    slotClass: SHARED_LIST_COLUMN_CLASSES.sharedBy,
    widthVar: SHARED_COLUMN_WIDTH_VARS.sharedBy,
    widthClass: WIDTH_CLASSES['--col-updated-width'],
  },
  {
    id: 'lastViewed',
    label: SHARED_LIST_COLUMN_LABELS.lastViewed,
    slotClass: SHARED_LIST_COLUMN_CLASSES.lastViewed,
    widthVar: SHARED_COLUMN_WIDTH_VARS.lastViewed,
    widthClass: WIDTH_CLASSES['--col-created-width'],
  },
];

function cellContent(doc: ListDoc, column: ColumnDef) {
  switch (column.id) {
    case 'shared':
      return doc.shared ? (
        <Check className="size-4 text-craft-accent" role="img" aria-label="已共享" />
      ) : (
        ''
      );
    case 'sharedBy':
      return doc.sharedBy ?? '';
    case 'lastViewed':
      return doc.lastViewedAt ? relativeTime(doc.lastViewedAt) : '';
    case 'updated':
      return relativeTime(doc.updatedAt);
    case 'created':
      return doc.createdAt ? relativeTime(doc.createdAt) : '';
    default:
      return '';
  }
}

/**
 * The browse list layout (G1113 / G1115 / G1117). Every row renders all four cells and lets CSS
 * hide the three data ones, which is what the official build does — the slot classes say
 * "second/third/fourth column", not what the column holds.
 *
 * The column widths are pushed from the header cells onto the container as custom properties, so
 * a data cell lines up with its header even when the two are separate grid items. A hidden header
 * measures zero, and zero is written as `0px` — which is exactly why the `112px` fallback never
 * fires in the official build.
 */
export function DocumentListView({
  documents,
  sort,
  onSortChange,
  variant = 'all',
  sharedSort,
  onSharedSortChange,
  selectable = false,
  selectedIds,
  onToggleSelect,
}: {
  documents: ListDoc[];
  /** G247：列头即排序器——当前档与方向由外部持有，点列头回调上去。 */
  sort?: BrowseSortSpec;
  onSortChange?: (next: BrowseSortSpec) => void;
  /** G1115 变体 C：与我共享列表的列序与排序词表都不同（名称／共享／共享者／上次浏览）。 */
  variant?: ListVariant;
  sharedSort?: SortSpec;
  onSharedSortChange?: (next: SortSpec) => void;
  /** G1129: marquee/batch selection keeps the list layout — the row grows a checkbox. */
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const isShared = variant === 'shared';
  const columns = isShared ? SHARED_COLUMNS : ALL_COLUMNS;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const sync = () => {
      for (const column of columns) {
        const cell = headerRefs.current[column.id];
        if (!cell) continue;
        const variable = column.widthVar;
        root.style.setProperty(variable, columnWidthValue(cell.offsetWidth));
      }
    };

    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    for (const cell of Object.values(headerRefs.current)) {
      if (cell) observer.observe(cell);
    }
    return () => observer.disconnect();
  }, [columns, documents]);

  const ariaFor = (id: string) => {
    if (isShared) {
      if (!sharedSort || sharedSort.dimension !== id) return 'none' as const;
      return sharedSort.direction;
    }
    return sort ? ariaSortValue(sort, id as BrowseSortOption) : undefined;
  };

  const markFor = (id: string): '↑' | '↓' | null => {
    if (isShared) {
      if (!sharedSort || sharedSort.dimension !== id) return null;
      return sharedSort.direction === 'ascending' ? '↑' : '↓';
    }
    return sort ? sortArrow(sort, id as BrowseSortOption) : null;
  };

  const pickSort = (id: string) => {
    if (isShared) {
      if (!sharedSort || !onSharedSortChange) return;
      onSharedSortChange(nextSortForDimension(sharedSort, id as SortDimension));
      return;
    }
    if (!sort || !onSortChange) return;
    onSortChange(nextSortSpec(sort, id as BrowseSortOption));
  };

  const rows = isShared
    ? sharedSort
      ? sortDocs(documents, sharedSort)
      : documents
    : sort
      ? sortBrowseRows(documents, sort)
      : documents;

  // G1123：长列表也走窗口渲染（行高固定 65、overscan 2、滚动 rAF + 150ms），
  //   与回收站、集合表格共用同一套虚拟化核。
  const virtualized = rows.length > LIST_VIRTUAL_THRESHOLD;
  const listWindow = virtualized
    ? visibleRowWindow({
        scrollTop,
        viewportHeight: LIST_VIEWPORT_HEIGHT,
        rowCount: rows.length,
        rowHeight: LIST_ROW_STEP,
        overscan: 2,
      })
    : null;
  const renderRows = listWindow ? rows.slice(listWindow.start, listWindow.end) : rows;

  return (
    <div ref={ref} data-testid="browse-list" className="flex flex-col">
      <div
        className="flex items-center gap-3 border-b border-border px-3 pb-1"
      >
        <button
          type="button"
          onClick={() => pickSort('name')}
          aria-sort={ariaFor('name')}
          className={cn('min-w-0 flex-1 text-left', LIST_HEADER_TYPOGRAPHY, 'text-muted-foreground')}
        >
          名称
          {markFor('name') ? <span className="ml-1">{markFor('name')}</span> : null}
        </button>
        {columns.map((column) => (
          <div
            key={column.id}
            ref={(node) => {
              headerRefs.current[column.id] = node;
            }}
            className={cn(
              'hidden shrink-0',
              column.widthClass,
              LIST_HEADER_TYPOGRAPHY,
              'text-muted-foreground',
              column.slotClass,
            )}
          >
            <button
              type="button"
              onClick={() => pickSort(column.id)}
              aria-sort={ariaFor(column.id)}
              className="w-full text-left"
            >
              {column.label}
              {markFor(column.id) ? <span className="ml-1">{markFor(column.id)}</span> : null}
            </button>
          </div>
        ))}
      </div>

      {/* G1123：官方列表把行放进 `_virtualBody` 滚动壳里，列头留在壳外，行高 65 即步长。 */}
      <div
        data-testid="browse-list-body"
        className={virtualized ? 'flex max-h-[480px] flex-col overflow-y-auto' : 'flex flex-col'}
        onScroll={(event) => {
          if (!virtualized) return;
          const top = event.currentTarget.scrollTop;
          scheduleScrollUpdate(() => setScrollTop(top));
        }}
      >
      {listWindow && <div aria-hidden style={{ height: listWindow.topPad }} />}
      {renderRows.map((doc) => {
        const checked = selectedIds?.has(doc.id) ?? false;
        return (
        <Link
          key={doc.id}
          href={`/documents/${doc.id}`}
          data-item-id={doc.id}
          aria-selected={selectable ? checked : undefined}
          style={{ height: 65 }}
          onClick={(event) => {
            if (!selectable) return;
            event.preventDefault();
            onToggleSelect?.(doc.id);
          }}
          className="flex items-center gap-3 rounded-md px-3 transition-colors duration-150 hover:bg-foreground/[0.03]"
        >
          {selectable && (
            // G1138/G1555 ②: selection is read off `role=checkbox` + `aria-checked`.
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={`选择 ${doc.title}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleSelect?.(doc.id);
              }}
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded border',
                checked ? 'border-craft-accent bg-craft-accent text-white' : 'border-foreground/30 bg-background',
              )}
            >
              {checked && <Check className="size-3" />}
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {doc.icon ? (
              <span className="text-lg leading-none">{doc.icon}</span>
            ) : (
              <File className="size-4 shrink-0 text-foreground/40" />
            )}
            <div className="flex min-w-0 flex-col">
              <span className={cn('truncate', LIST_TITLE_TYPOGRAPHY)}>{doc.title}</span>
              {/* G248：行副标题是内容摘要回退链（正文预览→「空文档」→「/」），不是日期。 */}
              <span className="truncate text-meta text-foreground/45">
                {rowSubtitle({ plainText: doc.plainText })}
              </span>
              {/* G237：本地比列表那份新时挂离线徽标（三态）。 */}
              <OfflineBadge documentId={doc.id} listedUpdatedAt={doc.updatedAt} className="self-start" />
            </div>
          </div>
          {columns.map((column) => (
            <div
              key={column.id}
              className={cn(
                'hidden shrink-0 truncate',
                column.widthClass,
                LIST_CELL_TYPOGRAPHY,
                'text-muted-foreground',
                column.slotClass,
              )}
            >
              {cellContent(doc, column)}
            </div>
          ))}
        </Link>
        );
      })}
      {listWindow && <div aria-hidden style={{ height: listWindow.bottomPad }} />}
      </div>
    </div>
  );
}
