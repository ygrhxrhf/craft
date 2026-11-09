'use client';

import Link from 'next/link';
import { Check, File } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';
import { cardHead } from '@/lib/document/card-head';
import { DocumentCardMenu } from './DocumentCardMenu';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
    /** G250: the card head's location breadcrumb, already joined by the caller. */
    breadcrumb?: string | null;
    /** G216: signed preview URL built on the server (`buildPreviewSrc`); absent → no preview layer. */
    previewSrc?: string | null;
  };
  /** G623: batch selection mode — the card shows a checkbox instead of navigating on click. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function DocumentCard({ document: doc, selectable = false, selected = false, onToggleSelect }: DocumentCardProps) {
  const head = cardHead({ title: doc.title, updatedAt: doc.updatedAt, breadcrumb: doc.breadcrumb });
  // G384/G1439：卡片没有常驻 `⋯`，入口只有右键（7 项）。
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <Link
        href={`/documents/${doc.id}`}
        data-item-id={doc.id}
        aria-selected={selectable ? selected : undefined}
        onClick={(event) => {
          if (!selectable) return;
          event.preventDefault();
          onToggleSelect?.(doc.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuAt({ x: event.clientX, y: event.clientY });
        }}
        className="group relative block rounded-xl transition-colors duration-300 hover:bg-foreground/[0.03]"
      >
      {selectable && (
        // G1138/G1555 ②: the selection state is read off `role=checkbox` + `aria-checked`, never
        // off a class name — the official build's `_isActive_` class is on every resting card.
        // A span, not a button: the whole card is already an anchor, and a nested control there is
        // invalid HTML; the anchor's own click handler is what toggles.
        <span
          role="checkbox"
          aria-checked={selected}
          aria-label={`选择 ${head.title}`}
          className={cn(
            'absolute left-2 top-2 z-[2] flex size-4 items-center justify-center rounded border',
            selected ? 'border-craft-accent bg-craft-accent text-white' : 'border-foreground/30 bg-background',
          )}
        >
          {selected && <Check className="size-3" />}
        </span>
      )}
      {/* The card's focus ring is a real child element, not an outline (G1127): it can carry its
          own z-index and is hidden until the card is focused. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] z-[1] hidden rounded-xl border-[3px] border-(--craft-accent) group-focus-visible:block"
      />
      {/* G15/G16：craft 卡片 208×260（aspect 1/1.25），内部顺序是 **标题 → 副行 → 分隔线 → 预览**，
          预览盒从卡内 +68 起、溢出被裁掉（`_previewBox_` 176×268）。此前本地是预览在最上、
          卡高随内容（64/169）。 */}
      <div className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl bg-card px-[6px] pt-[7px] pb-2 shadow-sm">
        {/* Hover/focus swap (G1077): the resting layer fades out and the action layer fades in —
            a swap, not an overlay, so the card's height never moves. The `group-hover` variant is
            already gated on the intent attribute, so a touch device never latches it. */}
        <div className="flex items-start gap-2 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {doc.icon ? (
            <span className="text-2xl leading-none">{doc.icon}</span>
          ) : (
            <File className="size-5 shrink-0 text-foreground/40" />
          )}
          {/* G250：未命名文档的标题是**斜体灰**——它在说"这篇还没有名字"。
              G28：只改斜体与颜色，字号/字重仍是 `text-card-title font-semibold`（15/600/18）。 */}
          <h3
            className={cn(
              'flex-1 truncate text-card-title font-semibold',
              head.placeholder && 'italic text-foreground/25',
            )}
          >
            {head.title}
          </h3>
        </div>
        {/* G250：「已更新 14 小时前」是**相对时间带动词**，不是裸日期；它占 craft 的副行位。 */}
        <p className="mt-1 truncate text-meta text-foreground/55 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {head.updated}
        </p>
        {/* G250：位置面包屑（📁 日记 •）是本地多出来的一行，放在副行下面，不抢标题位。 */}
        {head.breadcrumb && (
          <p className="mt-0.5 truncate text-meta text-foreground/45 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
            {head.breadcrumb}
          </p>
        )}
        <div aria-hidden className="mt-2 h-px bg-foreground/[0.06]" />
        {/* G216：后端渲染的文档预览（签名 URL，内容变更会换 ts 自动推翻缓存）。
            盒子从分隔线下开始、撑满剩余高度，溢出由卡片裁掉（同 craft）。 */}
        {doc.previewSrc && (
          <img
            src={doc.previewSrc}
            alt=""
            loading="lazy"
            draggable={false}
            data-testid={`card-preview-${doc.id}`}
            className="mt-2 min-h-0 w-full flex-1 rounded-lg border border-foreground/8 bg-background object-cover object-top"
          />
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="text-ui font-medium text-foreground/70">打开</span>
        </div>
      </div>
      </Link>
      <DocumentCardMenu
        documentId={doc.id}
        title={doc.title}
        at={menuAt}
        onClose={() => setMenuAt(null)}
      />
    </>
  );
}
