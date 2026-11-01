'use client';

import { useRef, useSyncExternalStore, useState } from 'react';

import { BrowseGrid } from '@/components/app/BrowseGrid';
import { MarqueeLayer } from '@/components/document/MarqueeLayer';
import { DocumentCard } from '@/components/document/DocumentCard';
import { DocumentListView } from '@/components/document/DocumentListView';
import { ViewModeSwitcher } from '@/components/document/ViewModeSwitcher';
import { DEFAULT_SORT, sortDocs, type SortSpec } from '@/lib/browse/sort';
import {
  DEFAULT_BROWSE_SORT_SPEC,
  type BrowseSortSpec,
} from '@/lib/browse/list-sort';
import {
  SORT_BY_LABEL,
  SORT_DIMENSION_LABELS,
  SORT_DIRECTION_LABELS,
} from '@/lib/browse/sort-copy';
import { SORT_DIMENSIONS, SORT_DIRECTIONS } from '@/lib/browse/sort';
import {
  LAYOUT_ENTRY_LABEL,
  readViewMode,
  serverViewMode,
  storeViewMode,
  subscribeViewMode,
  type BrowseViewMode,
} from '@/lib/browse/view-modes';

interface SortableDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  createdAt?: string | null;
  lastViewedAt?: string | null;
  /** G248: carried through to the list row's content-summary subtitle. */
  plainText?: string | null;
  /** G250: the card head's location breadcrumb, already joined by the page. */
  breadcrumb?: string | null;
}

/**
 * The browse toolbar (G1091 / G1119). The enum, the comparator and the mode list are pure; this is
 * the piece that lets a viewer pick a spec and a layout and re-renders through them. The card data
 * comes in already read, so sorting is client-side and does not re-query.
 *
 * The layout choice lives in `localStorage`, which the server render cannot see. It is read through
 * `useSyncExternalStore`: the server snapshot is the default, the client snapshot is the stored mode,
 * and React reconciles that one frame — reading it in `useState`'s initialiser would make the first
 * client paint disagree with the server's HTML.
 */
export function SortableDocGrid({ documents }: { documents: SortableDoc[] }) {
  const [spec, setSpec] = useState<SortSpec>(DEFAULT_SORT);
  // G1555：框选层要一个容器句柄来收集卡片矩形。
  const containerRef = useRef<HTMLDivElement | null>(null);
  // G247：列表档的列头排序是**另一套四档**（名称/上次浏览/已更新/已创建），与 ⋯ 菜单那套
  //   （name/shared/sharedBy/lastViewed）不同源，故单独持一份，互不覆盖。
  const [browseSort, setBrowseSort] = useState<BrowseSortSpec>(DEFAULT_BROWSE_SORT_SPEC);
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, serverViewMode);
  const sorted = sortDocs(documents, spec);

  function pickMode(mode: BrowseViewMode) {
    storeViewMode(mode);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="mb-3 flex flex-wrap items-center gap-2"
        data-testid="browse-sort"
        aria-label={LAYOUT_ENTRY_LABEL}
      >
        <label className="text-sm text-muted-foreground" htmlFor="browse-sort-dimension">
          {SORT_BY_LABEL}
        </label>
        <select
          id="browse-sort-dimension"
          value={spec.dimension}
          onChange={(event) =>
            setSpec((current) => ({ ...current, dimension: event.target.value as SortSpec['dimension'] }))
          }
          className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          {SORT_DIMENSIONS.map((dimension) => (
            <option key={dimension} value={dimension}>
              {SORT_DIMENSION_LABELS[dimension]}
            </option>
          ))}
        </select>
        <select
          aria-label="排序方向"
          value={spec.direction}
          onChange={(event) =>
            setSpec((current) => ({ ...current, direction: event.target.value as SortSpec['direction'] }))
          }
          className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          {SORT_DIRECTIONS.map((direction) => (
            <option key={direction} value={direction}>
              {SORT_DIRECTION_LABELS[direction]}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <ViewModeSwitcher value={viewMode} onChange={pickMode} />
        </div>
      </div>

      {viewMode === 'list' ? (
        <DocumentListView
          documents={sorted}
          sort={browseSort}
          onSortChange={setBrowseSort}
        />
      ) : viewMode === 'waterfall' ? (
        <div data-testid="browse-waterfall" className="columns-2 gap-5 md:columns-3 xl:columns-4">
          {sorted.map((doc) => (
            <div key={doc.id} className="mb-5 break-inside-avoid">
              <DocumentCard document={doc} />
            </div>
          ))}
        </div>
      ) : (
        <BrowseGrid>
          {sorted.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </BrowseGrid>
      )}
      {/* G1555：浏览屏框选层（覆盖在内容区之上，pointer-events: none）。 */}
      <MarqueeLayer containerRef={containerRef} />
    </>
  );
}
