'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Columns3, Image, RefreshCw, Table2 } from 'lucide-react';

import { getCollection } from '@/actions/collection/collection';
import { applyFilters } from '@/components/collection/FilterBar';
import { applySorts } from '@/components/collection/SortMenu';
import {
  COLLECTION_EMBED_LABELS,
  normalizeCollectionEmbedView,
  type CollectionEmbedView,
} from '@/lib/collection/embed-block';
import {
  EMBED_EMPTY_ITEMS,
  EMBED_LOAD_FAILED,
  EMBED_LOADING,
  EMBED_MISSING_COLLECTION,
  EMBED_UNAUTHORIZED,
  cellOf,
  embedColumns,
  embedTitle,
  galleryCards,
  itemTitle,
  kanbanColumns,
  pickEmbedView,
  readEmbedQuery,
  type EmbedCell,
  type EmbedItem,
  type EmbedProperty,
  type EmbedView,
} from '@/lib/collection/embed-content';

const ICONS: Record<CollectionEmbedView, typeof Table2> = {
  table: Table2,
  gallery: Image,
  kanban: Columns3,
};

type LoadedCollection = NonNullable<Awaited<ReturnType<typeof getCollection>>>;

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; collection: LoadedCollection }
  | { kind: 'unavailable'; message: string };

/**
 * G1614：集合块在正文里**直接渲染集合内容**（表格／画廊／看板三档，只读），块头那行指回
 * `/collections/:id` 供编辑。取数走 `getCollection`，读侧规则（视图挑档、列序、单元格文案、
 * 看板分组、画廊卡片）全在 `embed-content.ts` 的纯核里，这里只负责排版。
 */
export function CollectionBlockView({ node, selected }: NodeViewProps) {
  const collectionId = node.attrs.collectionId as string | null;
  const requested = normalizeCollectionEmbedView(node.attrs.view);
  const Icon = ICONS[requested];
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!collectionId) {
      setState({ kind: 'unavailable', message: EMBED_MISSING_COLLECTION });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const collection = await getCollection(collectionId);
      setState(
        collection
          ? { kind: 'ready', collection }
          : { kind: 'unavailable', message: EMBED_MISSING_COLLECTION }
      );
    } catch (error) {
      const unauthorized = error instanceof Error && error.message === '未授权';
      setState({ kind: 'unavailable', message: unauthorized ? EMBED_UNAUTHORIZED : EMBED_LOAD_FAILED });
    }
  }, [collectionId]);

  // 初值是 loading，真正的读取在 effect 里发起；load 不在 effect 体中同步调用
  //（那会同步 setState 被 react-hooks/set-state-in-effect 拦下），交给异步 IIFE。
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const loadedName = state.kind === 'ready' ? state.collection.name : null;
  const title = embedTitle(node.attrs.title, loadedName);

  return (
    <NodeViewWrapper className="my-2" data-collection-block={collectionId ?? ''} data-view={requested}>
      <div
        contentEditable={false}
        data-selected={selected ? 'true' : undefined}
        className={[
          'rounded-lg border bg-card transition-colors',
          selected ? 'border-primary/60' : 'border-border',
        ].join(' ')}
      >
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 text-[11px] text-muted-foreground">
          <Icon className="size-3 shrink-0" />
          <Link
            href={collectionId ? `/collections/${collectionId}` : '/collections'}
            className="min-w-0 truncate hover:text-foreground hover:underline"
          >
            {title}
          </Link>
          <span className="shrink-0 text-foreground/45">{COLLECTION_EMBED_LABELS[requested]}</span>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="刷新集合"
            className="ml-auto shrink-0 rounded p-0.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>

        {state.kind === 'loading' && (
          <p className="px-3 pb-2.5 text-[13px] text-muted-foreground">{EMBED_LOADING}</p>
        )}
        {state.kind === 'unavailable' && (
          <p className="px-3 pb-2.5 text-[13px] text-muted-foreground">{state.message}</p>
        )}
        {state.kind === 'ready' && <EmbedBody collection={state.collection} requested={requested} />}
      </div>
    </NodeViewWrapper>
  );
}

function EmbedBody({
  collection,
  requested,
}: {
  collection: LoadedCollection;
  requested: CollectionEmbedView;
}) {
  const properties = collection.properties as unknown as EmbedProperty[];
  const items = collection.items as unknown as EmbedItem[];
  const views = collection.views as unknown as EmbedView[];
  const view = pickEmbedView(views, requested);
  const columns = embedColumns(properties, view);
  const query = readEmbedQuery(view?.config);
  const rows = applySorts(applyFilters(items, query.filters, properties), query.sorts, properties);
  const render = normalizeCollectionEmbedView(view?.type ?? requested);

  // 看板的守卫句先于「暂无条目」：分组有没有可用的属性与有没有行无关，
  // 集合屏的 KanbanView 在 0 行时也这么答（G1614 的看板档）。
  if (render === 'kanban') {
    const board = kanbanColumns(properties, rows);
    if (!board.ok) {
      return <p className="px-3 pb-2.5 text-[13px] text-muted-foreground">{board.message}</p>;
    }
    if (board.columns.length === 0) {
      return <p className="px-3 pb-2.5 text-[13px] text-muted-foreground">{EMBED_EMPTY_ITEMS}</p>;
    }
    return (
      <div className="flex max-h-[320px] items-start gap-2 overflow-auto px-3 pb-2.5">
        {board.columns.map((column) => (
          <section
            key={column.id}
            className="flex w-44 shrink-0 flex-col gap-1.5 rounded-lg bg-muted/30 p-2"
          >
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
              <span className="min-w-0 truncate">{column.label}</span>
              <span className="shrink-0 text-foreground/40">{column.items.length}</span>
            </p>
            {column.items.map((item) => (
              <div
                key={item.id}
                data-row-id={item.id}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-[12px]"
              >
                {itemTitle(columns, item)}
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="px-3 pb-2.5 text-[13px] text-muted-foreground">{EMBED_EMPTY_ITEMS}</p>;
  }

  if (render === 'gallery') {
    return (
      <div className="max-h-[320px] overflow-auto px-3 pb-2.5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {galleryCards(columns, rows).map((card) => (
            <article
              key={card.id}
              className="overflow-hidden rounded-lg border border-border bg-background"
            >
              <div className="flex h-24 items-center justify-center bg-muted/40">
                {card.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.cover} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-2xl text-muted-foreground/40">·</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 p-2">
                <p className="truncate text-[13px] font-medium">{card.title}</p>
                {card.lines.map((line) => (
                  <p
                    key={line.name}
                    className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground"
                  >
                    <span className="shrink-0 opacity-70">{line.name}</span>
                    <span className="truncate">{line.text}</span>
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[320px] overflow-auto px-3 pb-2.5">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            {columns.map((property) => (
              <th
                key={property.id}
                className="border-b border-border px-2 py-1 text-left text-[11px] font-medium text-muted-foreground"
              >
                {property.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} data-row-id={item.id} className="hover:bg-muted/30">
              {columns.map((property) => (
                <td key={property.id} className="border-b border-border px-2 py-1 align-top">
                  <EmbedCellText cell={cellOf(property, item, properties)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmbedCellText({ cell }: { cell: EmbedCell }) {
  if (cell.blank) return <span className="text-muted-foreground/50">-</span>;
  if (cell.chips?.length) {
    return (
      <span className="flex flex-wrap gap-1">
        {cell.chips.map((chip) => (
          <span
            key={`${chip.label}-${chip.color}`}
            className="rounded-full px-1.5 py-0.5 text-[11px]"
            style={{ backgroundColor: `${chip.color}20`, color: chip.color }}
          >
            {chip.label}
          </span>
        ))}
      </span>
    );
  }
  return <span className={cell.muted ? 'text-muted-foreground' : undefined}>{cell.text}</span>;
}
