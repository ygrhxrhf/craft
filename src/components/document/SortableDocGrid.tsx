'use client';

import { useRef, useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Folder, Star, Trash2, X } from 'lucide-react';

import { BrowseGrid } from '@/components/app/BrowseGrid';
import { MarqueeLayer } from '@/components/document/MarqueeLayer';
import { DocumentCard } from '@/components/document/DocumentCard';
import { DocumentListView } from '@/components/document/DocumentListView';
import { ViewModeSwitcher } from '@/components/document/ViewModeSwitcher';
import { Button } from '@/components/ui/button';
import { confirmDialog } from '@/lib/dialog/show';
import { toast } from '@/components/ui/toast';
import { getSyncManager } from '@/lib/sync-core';
import { isDocumentFavorite } from '@/actions/document/favorite';
import { deleteDocument } from '@/actions/document/delete';
import { toggleFavoriteLocal } from '@/lib/favorite/toggle-local';
import {
  enterSelection,
  selectionLabel,
  toggleSelection,
} from '@/lib/browse/selection';
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
export function SortableDocGrid({
  documents,
  folders = [],
}: {
  documents: SortableDoc[];
  folders?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [spec, setSpec] = useState<SortSpec>(DEFAULT_SORT);
  // G623: batch selection mode. Entering auto-selects the first card.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionBusy, setSelectionBusy] = useState(false);
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

  const startSelecting = () => {
    setSelecting(true);
    setSelected(enterSelection(sorted.map((doc) => doc.id)));
  };
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const ids = [...selected];

  const favoriteSelected = async () => {
    setSelectionBusy(true);
    try {
      for (const id of ids) {
        const favored = await isDocumentFavorite(id).catch(() => false);
        if (!favored) await toggleFavoriteLocal({ documentId: id, favored: false, userId: session?.user?.id });
      }
      toast.add({ id: 'browse-favorite', type: 'success', title: '已收藏' });
      stopSelecting();
      router.refresh();
    } finally {
      setSelectionBusy(false);
    }
  };

  const trashSelected = async () => {
    const ok = await confirmDialog({
      title: '移至最近删除',
      message: `你确定要将这 ${ids.length} 个项目移到最近删除吗？`,
      confirmLabel: '删除',
    });
    if (!ok) return;
    setSelectionBusy(true);
    try {
      for (const id of ids) await deleteDocument(id);
      stopSelecting();
      router.refresh();
    } finally {
      setSelectionBusy(false);
    }
  };

  const moveSelected = async (folderId: string | null) => {
    setSelectionBusy(true);
    try {
      const manager = getSyncManager();
      for (const id of ids) {
        await manager.applyLocal({ table: 'document', id, patch: { folderId } });
      }
      await manager.flushNow();
      stopSelecting();
      router.refresh();
    } finally {
      setSelectionBusy(false);
    }
  };

  return (
    <>
      {selecting ? (
        <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="browse-selection-bar">
          <span className="text-sm text-foreground/70">{selectionLabel(selected.size)}</span>
          <Button variant="ghost" size="sm" disabled={selectionBusy || ids.length === 0} onClick={() => void favoriteSelected()}>
            <Star className="mr-1 size-4" />
            星标
          </Button>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <Folder className="size-4" />
            <select
              aria-label="移到文件夹"
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
              disabled={selectionBusy || ids.length === 0}
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                void moveSelected(value === '__unsorted__' ? null : value);
              }}
            >
              <option value="">移动到…</option>
              <option value="__unsorted__">未分类</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="ghost" size="sm" disabled={selectionBusy || ids.length === 0} onClick={() => void trashSelected()}>
            <Trash2 className="mr-1 size-4" />
            删除
          </Button>
          <Button variant="ghost" size="sm" onClick={stopSelecting} aria-label="取消选择">
            <X className="size-4" />
          </Button>
        </div>
      ) : (
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

        <Button variant="ghost" size="sm" onClick={startSelecting} data-testid="browse-enter-selection">
          选择
        </Button>
        <div className="ml-auto">
          <ViewModeSwitcher value={viewMode} onChange={pickMode} />
        </div>
      </div>
      )}

      {!selecting && viewMode === 'list' ? (
        <DocumentListView
          documents={sorted}
          sort={browseSort}
          onSortChange={setBrowseSort}
        />
      ) : !selecting && viewMode === 'waterfall' ? (
        <div data-testid="browse-waterfall" className="columns-2 gap-5 md:columns-3 xl:columns-4">
          {sorted.map((doc) => (
            <div key={doc.id} className="mb-5 break-inside-avoid">
              <DocumentCard
                document={doc}
                selectable={selecting}
                selected={selected.has(doc.id)}
                onToggleSelect={(id) => setSelected((current) => toggleSelection(current, id))}
              />
            </div>
          ))}
        </div>
      ) : (
        <BrowseGrid>
          {sorted.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              selectable={selecting}
              selected={selected.has(doc.id)}
              onToggleSelect={(id) => setSelected((current) => toggleSelection(current, id))}
            />
          ))}
        </BrowseGrid>
      )}
      {/* G1555：浏览屏框选层（覆盖在内容区之上，pointer-events: none）。 */}
      <MarqueeLayer containerRef={containerRef} />
    </>
  );
}
