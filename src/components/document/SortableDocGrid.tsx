'use client';

import { useEffect, useState } from 'react';

import { BrowseGrid } from '@/components/app/BrowseGrid';
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
  DEFAULT_VIEW_MODE,
  LAYOUT_ENTRY_LABEL,
  readViewMode,
  storeViewMode,
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
}

/**
 * The browse toolbar (G1091 / G1119). The enum, the comparator and the mode list are pure; this is
 * the piece that lets a viewer pick a spec and a layout and re-renders through them. The card data
 * comes in already read, so sorting is client-side and does not re-query.
 *
 * The layout choice is read after mount rather than during render: the server render cannot see
 * `localStorage`, and reading it in `useState`'s initialiser would make the first client paint
 * disagree with the server's HTML.
 */
export function SortableDocGrid({ documents }: { documents: SortableDoc[] }) {
  const [spec, setSpec] = useState<SortSpec>(DEFAULT_SORT);
  // G247：列表档的列头排序是**另一套四档**（名称/上次浏览/已更新/已创建），与 ⋯ 菜单那套
  //   （name/shared/sharedBy/lastViewed）不同源，故单独持一份，互不覆盖。
  const [browseSort, setBrowseSort] = useState<BrowseSortSpec>(DEFAULT_BROWSE_SORT_SPEC);
  const [viewMode, setViewMode] = useState<BrowseViewMode>(DEFAULT_VIEW_MODE);
  const sorted = sortDocs(documents, spec);

  // The stored mode is applied after the first paint, so the server's grid HTML and the first
  // client render agree; a reader who chose the list sees it one frame later.
  useEffect(() => {
    const stored = readViewMode();
    if (stored !== DEFAULT_VIEW_MODE) setViewMode(stored);
  }, []);

  function pickMode(mode: BrowseViewMode) {
    setViewMode(mode);
    storeViewMode(mode);
  }

  return (
    <>
      <div
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
    </>
  );
}
