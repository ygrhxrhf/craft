'use client';

import Link from 'next/link';
import { Check, File, Folder } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';
import { cardHead } from '@/lib/document/card-head';
import { hitCountLabel } from '@/lib/search/hit-count';
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
    /** G20: the trash card previews the stored text snapshot — a deleted page has no route. */
    previewText?: string | null;
    /** G1419: hit count printed beside the title on the search results page. */
    hitCount?: number;
  };
  /**
   * 副行「已更新 N」的时钟基准。必须是**服务端算好的同一个数**：`cardHead` 的默认
   * `Date.now()` 会在服务端渲染和 hydration 那一帧各取一次，跨过秒/分钟边界就撞
   * 「Hydration failed」。必填是故意的——漏传就编译不过，这类不一致不该靠肉眼找。
   */
  now: number;
  /** G20/G991: `null` → a static tile that neither navigates nor opens the card menu. */
  href?: string | null;
  /** G623: batch selection mode — the card shows a checkbox instead of navigating on click. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  /** G20: the trash card's hover layer offers 恢复 instead of 打开. */
  onRestore?: (id: string) => void;
}

export function DocumentCard({
  document: doc,
  now,
  href,
  selectable = false,
  selected = false,
  onToggleSelect,
  onRestore,
}: DocumentCardProps) {
  const head = cardHead({ title: doc.title, updatedAt: doc.updatedAt, breadcrumb: doc.breadcrumb }, now);
  // G384/G1439：卡片没有常驻 `⋯`，入口只有右键（7 项）。
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const target = href === undefined ? `/documents/${doc.id}` : href;

  const body = (
    <>
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
          {/* G1419：搜索结果卡在标题右侧印命中数（逐字样本 `Craft Handbook 50+`）。 */}
          {doc.hitCount !== undefined && (
            <span className="shrink-0 text-meta tabular-nums text-foreground/50">
              {hitCountLabel(doc.hitCount)}
            </span>
          )}
        </div>
        {/* G250/G19：官方卡片只有**一行**副标题——位置与「已更新 N」用圆点连起来，不是本地
            此前那样上下两行。收件箱卡片没有位置，这一行就只剩更新时间。 */}
        {head.subtitle && (
          <div className="mt-1 flex min-w-0 items-center gap-1 text-meta text-foreground/55 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
            {head.breadcrumb && <Folder className="size-3.5 shrink-0 text-foreground/45" />}
            <p className="truncate">{head.subtitle}</p>
          </div>
        )}
        <div aria-hidden className="mt-2 h-px bg-foreground/[0.06]" />
        {/* G216：后端渲染的文档预览（签名 URL，内容变更会换 ts 自动推翻缓存）。
            盒子从分隔线下开始、撑满剩余高度，溢出由卡片裁掉（同 craft）。 */}
        {doc.previewSrc ? (
          <img
            src={doc.previewSrc}
            alt=""
            loading="lazy"
            draggable={false}
            data-testid={`card-preview-${doc.id}`}
            // G1712：官方卡片里的预览**没有边框也没有底色**，直接融进卡面（截图对照）；
            // 本地此前画成一张带 border 的白色内嵌块，卡片因此看着像“两张卡叠在一起”。
            className="mt-2 min-h-0 w-full flex-1 rounded-lg object-cover object-top"
          />
        ) : doc.previewText ? (
          // G20/G997：回收站条目打不开（G991），预览层用删除时落库的纯文本快照——正是官方卡片
          // 显示的"最后一次保存的样子"。
          <div
            data-testid={`card-preview-${doc.id}`}
            className="mt-2 min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-foreground/8 bg-background px-2 py-1.5"
          >
            <p className="line-clamp-8 whitespace-pre-wrap break-words text-[11px] leading-[15px] text-foreground/55">
              {doc.previewText}
            </p>
          </div>
        ) : null}

        {/* G20：选择模式下的回收站磁贴既不导航也没有单行恢复动作，这一层就不该出现——
            否则每张卡悬停都印一个假的「打开」。 */}
        {(onRestore || target) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100">
            {onRestore ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRestore(doc.id);
                }}
                className="pointer-events-auto rounded-md border border-foreground/15 bg-background px-3 py-1 text-ui font-medium text-foreground/85 shadow-sm hover:bg-foreground/[0.04]"
              >
                恢复
              </button>
            ) : (
              <span className="text-ui font-medium text-foreground/70">打开</span>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {target ? (
        <Link
          href={target}
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
          {body}
        </Link>
      ) : (
        <div
          data-item-id={doc.id}
          aria-selected={selectable ? selected : undefined}
          onClick={selectable ? () => onToggleSelect?.(doc.id) : undefined}
          className="group relative block rounded-xl transition-colors duration-300 hover:bg-foreground/[0.03]"
        >
          {body}
        </div>
      )}
      {target && (
        <DocumentCardMenu
          documentId={doc.id}
          title={doc.title}
          at={menuAt}
          onClose={() => setMenuAt(null)}
        />
      )}
    </>
  );
}
