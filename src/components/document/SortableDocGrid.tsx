'use client';

import { useState } from 'react';

import { BrowseGrid } from '@/components/app/BrowseGrid';
import { DocumentCard } from '@/components/document/DocumentCard';
import { DEFAULT_SORT, sortDocs, type SortSpec } from '@/lib/browse/sort';
import {
  SORT_BY_LABEL,
  SORT_DIMENSION_LABELS,
  SORT_DIRECTION_LABELS,
} from '@/lib/browse/sort-copy';
import { SORT_DIMENSIONS, SORT_DIRECTIONS } from '@/lib/browse/sort';

interface SortableDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
}

/**
 * The browse sort menu (G1091). The enum and the comparator are pure; this is the piece that lets
 * a viewer pick a spec and re-renders the grid through it. The card data comes in already read, so
 * sorting is client-side and does not re-query.
 */
export function SortableDocGrid({ documents }: { documents: SortableDoc[] }) {
  const [spec, setSpec] = useState<SortSpec>(DEFAULT_SORT);
  const sorted = sortDocs(documents, spec);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="browse-sort">
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
      </div>

      <BrowseGrid>
        {sorted.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </BrowseGrid>
    </>
  );
}
