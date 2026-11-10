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
import { BrowseToolbarMenu } from '@/components/document/BrowseToolbarMenu';
import { Button } from '@/components/ui/button';
import { confirmDialog } from '@/lib/dialog/show';
import { toast } from '@/components/ui/toast';
import { showFavoriteFeedback } from '@/components/ui/favorite-feedback';
import { getSyncManager } from '@/lib/sync-core';
import { isDocumentFavorite } from '@/actions/document/favorite';
import { deleteDocument } from '@/actions/document/delete';
import { toggleFavoriteLocal } from '@/lib/favorite/toggle-local';
import { applyMoveRow } from '@/lib/document/move';
import {
  enterSelection,
  selectionLabel,
  toggleSelection,
} from '@/lib/browse/selection';
import { sortDocs } from '@/lib/browse/sort';
import { sameIdSet } from '@/lib/browse/marquee';
import {
  DEFAULT_BROWSE_SORT_SPEC,
  type BrowseSortSpec,
} from '@/lib/browse/list-sort';
import {
  DEFAULT_BROWSE_SORT,
  sortSpecForChoice,
  type BrowseSortOption,
} from '@/lib/browse/toolbar-menu';
import {
  readShowDailyNotes,
  serverShowDailyNotes,
  storeShowDailyNotes,
  subscribeShowDailyNotes,
} from '@/lib/browse/daily-notes-visibility';
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
  /** G216: 服务端生成的签名预览 URL。 */
  previewSrc?: string | null;
  createdAt?: string | null;
  lastViewedAt?: string | null;
  /** G223: 每日笔记可以整类隐藏（⋯ → 显示每日笔记）。 */
  isDailyNote?: boolean;
  /** G679: 移动要先知道现在的归属，才能算落点与回退快照。 */
  folderId?: string | null;
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
  // G223: this screen's four orders, default 更新日期. The list view keeps its own four columns.
  const [sortChoice, setSortChoice] = useState<BrowseSortOption>(DEFAULT_BROWSE_SORT);
  // G623: batch selection mode. Entering auto-selects the first card.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionBusy, setSelectionBusy] = useState(false);
  // G1555/G1129：框选层要一个容器句柄——它必须是**渲染条目的那个容器**，否则 `[data-item-id]`
  //   收集不到任何卡片；早先这个 ref 挂在了工具栏上，框选因此永远零命中。
  const containerRef = useRef<HTMLDivElement | null>(null);
  // G247：列表档的列头排序是**另一套四档**（名称/上次浏览/已更新/已创建），与 ⋯ 菜单那套
  //   （name/lastViewed/created/updated）不同源，故单独持一份，互不覆盖。
  const [browseSort, setBrowseSort] = useState<BrowseSortSpec>(DEFAULT_BROWSE_SORT_SPEC);
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, serverViewMode);
  const showDailyNotes = useSyncExternalStore(
    subscribeShowDailyNotes,
    readShowDailyNotes,
    serverShowDailyNotes,
  );
  const visibleDocs = showDailyNotes ? documents : documents.filter((doc) => !doc.isDailyNote);
  const sorted = sortDocs(visibleDocs, sortSpecForChoice(sortChoice));

  function pickMode(mode: BrowseViewMode) {
    storeViewMode(mode);
  }

  const startSelecting = () => {
    setSelecting(true);
    setSelected(enterSelection(sorted.map((doc) => doc.id)));
  };
  // G1135 ⑤：框选起手即进选择模式并**清空**旧选择（官方不是"选中首张"那条入口）。
  const startMarquee = () => {
    setSelecting(true);
    setSelected(new Set());
  };
  // G1135 ④：每次移动**整体替换**命中集，不并进旧集合；命中集不变时不写状态（官方 `TVt`）。
  const replaceMarqueeHits = (hits: string[]) => {
    setSelected((current) => (sameIdSet(current, hits) ? current : new Set(hits)));
  };
  // G1135 ⑤：起手中途撤框且尚未命中任何卡片时，恢复起手前的选择集；原集为空则退出选择模式。
  const restoreMarqueeSelection = (restored: readonly string[]) => {
    setSelected(new Set(restored));
    if (restored.length === 0) setSelecting(false);
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
      // G1446: the batch star answers with the same info toast as the single-document menu.
      showFavoriteFeedback(true);
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
      let skipped = 0;
      for (const id of ids) {
        const row = documents.find((doc) => doc.id === id);
        const moved = await applyMoveRow(manager, {
          id,
          current: {
            folderId: row?.folderId ?? null,
            parentId: null,
            isDailyNote: row?.isDailyNote === true,
          },
          folderId,
        });
        if (moved === 'daily-note') skipped += 1;
      }
      if (skipped > 0) {
        toast.add({
          id: 'browse-move-daily-note',
          type: 'warning',
          title: `每日笔记不能被移动（跳过 ${skipped} 项）`,
        });
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
          className="mb-3 flex flex-wrap items-center gap-2"
          data-testid="browse-sort"
          aria-label={LAYOUT_ENTRY_LABEL}
        >
          <div className="ml-auto flex items-center gap-1">
            <ViewModeSwitcher value={viewMode} onChange={pickMode} />
            <BrowseToolbarMenu
              sortChoice={sortChoice}
              onSortChange={setSortChoice}
              showDailyNotes={showDailyNotes}
              onToggleDailyNotes={() => storeShowDailyNotes(!showDailyNotes)}
              onSelect={startSelecting}
            />
          </div>
        </div>
      )}

      <div ref={containerRef} data-testid="browse-content">
        {/* G1129：进入选择模式不换布局——官方是同一份列表上长复选框，不是跳去网格档。 */}
        {viewMode === 'list' ? (
          <DocumentListView
            documents={sorted}
            sort={browseSort}
            onSortChange={setBrowseSort}
            selectable={selecting}
            selectedIds={selected}
            onToggleSelect={(id) => setSelected((current) => toggleSelection(current, id))}
          />
        ) : viewMode === 'waterfall' ? (
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
      </div>
      {/* G1555/G1129：框选层覆盖在**条目容器**上（pointer-events: none），命中集直接进选择模式。 */}
      <MarqueeLayer
        containerRef={containerRef}
        layout={viewMode === 'grid' ? 'cards' : viewMode}
        selectedIds={ids}
        onStart={startMarquee}
        onChange={replaceMarqueeHits}
        onCancel={restoreMarqueeSelection}
      />
    </>
  );
}
