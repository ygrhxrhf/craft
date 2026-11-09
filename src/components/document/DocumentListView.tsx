'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { File, Check } from 'lucide-react';
import { cn } from 'cn';

import {
  COLUMN_WIDTH_VARS,
  LIST_CELL_TYPOGRAPHY,
  LIST_COLUMN_CLASSES,
  LIST_COLUMN_LABELS,
  LIST_HEADER_TYPOGRAPHY,
  LIST_TITLE_TYPOGRAPHY,
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

interface ListDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  createdAt?: string | null;
  lastViewedAt?: string | null;
  /** G248: the row's subtitle comes from the body, not from a date. */
  plainText?: string | null;
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
  selectable = false,
  selectedIds,
  onToggleSelect,
}: {
  documents: ListDoc[];
  /** G247：列头即排序器——当前档与方向由外部持有，点列头回调上去。 */
  sort?: BrowseSortSpec;
  onSortChange?: (next: BrowseSortSpec) => void;
  /** G1129: marquee/batch selection keeps the list layout — the row grows a checkbox. */
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const sync = () => {
      for (const [column, variable] of Object.entries(COLUMN_WIDTH_VARS)) {
        const cell = headerRefs.current[column];
        if (!cell) continue;
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
  }, [documents]);

  return (
    <div ref={ref} data-testid="browse-list" className="flex flex-col">
      <div
        className="flex items-center gap-3 border-b border-border px-3 pb-1"
      >
        <button
          type="button"
          onClick={() => sort && onSortChange?.(nextSortSpec(sort, 'name'))}
          aria-sort={sort ? ariaSortValue(sort, 'name') : undefined}
          className={cn('min-w-0 flex-1 text-left', LIST_HEADER_TYPOGRAPHY, 'text-muted-foreground')}
        >
          名称
          {sort && sortArrow(sort, 'name') ? <span className="ml-1">{sortArrow(sort, 'name')}</span> : null}
        </button>
        <div
          ref={(node) => {
            headerRefs.current.lastViewed = node;
          }}
          className={cn(
            'hidden w-[var(--col-last-viewed-width,112px)] shrink-0',
            LIST_HEADER_TYPOGRAPHY,
            'text-muted-foreground',
            LIST_COLUMN_CLASSES.lastViewed,
          )}
        >
          <button
            type="button"
            onClick={() => sort && onSortChange?.(nextSortSpec(sort, 'lastViewed'))}
            aria-sort={sort ? ariaSortValue(sort, 'lastViewed') : undefined}
            className="w-full text-left"
          >
            {LIST_COLUMN_LABELS.lastViewed}
            {sort && sortArrow(sort, 'lastViewed') ? <span className="ml-1">{sortArrow(sort, 'lastViewed')}</span> : null}
          </button>
        </div>
        <div
          ref={(node) => {
            headerRefs.current.updated = node;
          }}
          className={cn(
            'hidden w-[var(--col-updated-width,112px)] shrink-0',
            LIST_HEADER_TYPOGRAPHY,
            'text-muted-foreground',
            LIST_COLUMN_CLASSES.updated,
          )}
        >
          <button
            type="button"
            onClick={() => sort && onSortChange?.(nextSortSpec(sort, 'updated'))}
            aria-sort={sort ? ariaSortValue(sort, 'updated') : undefined}
            className="w-full text-left"
          >
            {LIST_COLUMN_LABELS.updated}
            {sort && sortArrow(sort, 'updated') ? <span className="ml-1">{sortArrow(sort, 'updated')}</span> : null}
          </button>
        </div>
        <div
          ref={(node) => {
            headerRefs.current.created = node;
          }}
          className={cn(
            'hidden w-[var(--col-created-width,112px)] shrink-0',
            LIST_HEADER_TYPOGRAPHY,
            'text-muted-foreground',
            LIST_COLUMN_CLASSES.created,
          )}
        >
          <button
            type="button"
            onClick={() => sort && onSortChange?.(nextSortSpec(sort, 'created'))}
            aria-sort={sort ? ariaSortValue(sort, 'created') : undefined}
            className="w-full text-left"
          >
            {LIST_COLUMN_LABELS.created}
            {sort && sortArrow(sort, 'created') ? <span className="ml-1">{sortArrow(sort, 'created')}</span> : null}
          </button>
        </div>
      </div>

      {(sort ? sortBrowseRows(documents, sort) : documents).map((doc) => {
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
          <div
            className={cn(
              'hidden w-[var(--col-last-viewed-width,112px)] shrink-0 truncate',
              LIST_CELL_TYPOGRAPHY,
              'text-muted-foreground',
              LIST_COLUMN_CLASSES.lastViewed,
            )}
          >
            {doc.lastViewedAt ? relativeTime(doc.lastViewedAt) : ''}
          </div>
          <div
            className={cn(
              'hidden w-[var(--col-updated-width,112px)] shrink-0 truncate',
              LIST_CELL_TYPOGRAPHY,
              'text-muted-foreground',
              LIST_COLUMN_CLASSES.updated,
            )}
          >
            {relativeTime(doc.updatedAt)}
          </div>
          <div
            className={cn(
              'hidden w-[var(--col-created-width,112px)] shrink-0 truncate',
              LIST_CELL_TYPOGRAPHY,
              'text-muted-foreground',
              LIST_COLUMN_CLASSES.created,
            )}
          >
            {doc.createdAt ? relativeTime(doc.createdAt) : ''}
          </div>
        </Link>
        );
      })}
    </div>
  );
}
