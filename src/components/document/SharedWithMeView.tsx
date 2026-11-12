'use client';

import { useState } from 'react';
import { ArrowUpDown, Grid2x2, List } from 'lucide-react';
import { cn } from 'cn';

import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from '@/components/document/DocumentCard';
import { DocumentListView } from '@/components/document/DocumentListView';
import {
  DEFAULT_SORT,
  SORT_DIMENSIONS,
  nextSortForDimension,
  sortDocs,
  type SortDimension,
  type SortSpec,
} from '@/lib/browse/sort';
import { SORT_BY_LABEL, SORT_DIMENSION_LABELS } from '@/lib/browse/sort-copy';

export interface SharedDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  createdAt: string;
  plainText: string;
  lastViewedAt: string | null;
  shared: true;
  sharedBy: string | null;
  role: string;
}

/** G955: the top-right cluster is two icon buttons — sort (34×28) and the grid/list toggle (28×28). */
export function SharedWithMeView({ documents, now }: { documents: SharedDoc[]; now: number }) {
  const [listMode, setListMode] = useState(false);
  const [sharedSort, setSharedSort] = useState<SortSpec>(DEFAULT_SORT);
  const [sortOpen, setSortOpen] = useState(false);

  if (documents.length === 0) {
    // The official empty state carries no copy — the grid area is simply empty.
    return <div className="min-h-[40vh]" data-testid="shared-with-me-empty" />;
  }

  const sorted = sortDocs(documents, sharedSort);

  return (
    <div data-testid="shared-with-me">
      <div className="relative mb-3 flex h-9 w-[156px] items-center justify-end gap-1">
        <button
          type="button"
          data-testid="shared-sort"
          aria-label={SORT_BY_LABEL}
          aria-expanded={sortOpen}
          onClick={() => setSortOpen((open) => !open)}
          className={cn(
            'flex h-7 w-[34px] items-center justify-center rounded-md border border-border',
            sortOpen ? 'bg-foreground/6' : 'hover:bg-foreground/4',
          )}
        >
          <ArrowUpDown className="size-4" />
        </button>
        <button
          type="button"
          data-testid="shared-layout"
          aria-label={listMode ? '切换到网格' : '切换到列表'}
          aria-pressed={listMode}
          onClick={() => setListMode((mode) => !mode)}
          className={cn(
            'flex size-7 items-center justify-center rounded-md border border-border',
            listMode ? 'bg-foreground/6' : 'hover:bg-foreground/4',
          )}
        >
          {listMode ? <List className="size-4" /> : <Grid2x2 className="size-4" />}
        </button>
        {sortOpen && (
          <div
            role="menu"
            aria-label={SORT_BY_LABEL}
            data-testid="shared-sort-menu"
            className="absolute right-0 top-10 z-10 flex w-48 flex-col rounded-md border border-border bg-background p-1 shadow-lg"
          >
            <div className="px-2 py-1 text-[11px] font-medium text-foreground/45">{SORT_BY_LABEL}</div>
            {SORT_DIMENSIONS.map((dimension) => (
              <button
                key={dimension}
                type="button"
                data-testid={`shared-sort-${dimension}`}
                onClick={() => setSharedSort(nextSortForDimension(sharedSort, dimension))}
                className="flex min-h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-foreground/4"
              >
                <span className="min-w-0 flex-1 truncate">
                  {SORT_DIMENSION_LABELS[dimension as SortDimension]}
                </span>
                {sharedSort.dimension === dimension ? (
                  <span className="text-(--craft-accent)" aria-hidden>
                    {sharedSort.direction === 'ascending' ? '↑' : '↓'}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {listMode ? (
        <DocumentListView
          variant="shared"
          documents={sorted}
          now={now}
          sharedSort={sharedSort}
          onSharedSortChange={setSharedSort}
        />
      ) : (
        <BrowseGrid>
          {sorted.map((doc) => (
            <DocumentCard
              key={doc.id}
              now={now}
              document={{ ...doc, previewSrc: undefined }}
            />
          ))}
        </BrowseGrid>
      )}
    </div>
  );
}
