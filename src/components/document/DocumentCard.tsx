'use client';

import Link from 'next/link';
import { File } from 'lucide-react';
import { cn } from 'cn';
import { cardHead } from '@/lib/document/card-head';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
    /** G250: the card head carries the location breadcrumb, resolved by the caller. */
    breadcrumb?: { icon?: string | null; title: string }[];
  };
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const head = cardHead({ title: doc.title, updatedAt: doc.updatedAt, breadcrumb: doc.breadcrumb });

  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group relative block rounded-lg px-1.5 pt-1.5 pb-0 transition-colors duration-300 hover:bg-foreground/[0.03]"
    >
      {/* The card's focus ring is a real child element, not an outline (G1127): it can carry its
          own z-index and is hidden until the card is focused. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] z-[1] hidden rounded-lg border-[3px] border-(--craft-accent) group-focus-visible:block"
      />
      <div className="relative rounded-lg bg-card px-2.5 pt-[7px] pb-2 shadow-sm">
        {/* Hover/focus swap (G1077): the resting layer fades out and the action layer fades in —
            a swap, not an overlay, so the card's height never moves. The `group-hover` variant is
            already gated on the intent attribute, so a touch device never latches it. */}
        <div className="flex items-start gap-2 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {doc.icon ? (
            <span className="text-2xl leading-none">{doc.icon}</span>
          ) : (
            <File className="size-5 shrink-0 text-foreground/40" />
          )}
          {/* G250：未命名文档的标题是**斜体灰**——它在说"这篇还没有名字"。 */}
          <h3
            className={cn(
              'flex-1 truncate text-card-title font-semibold',
              head.placeholder && 'italic font-normal text-foreground/45',
            )}
          >
            {head.title}
          </h3>
        </div>
        {/* G250：卡片头第二行是**位置面包屑**（📁 日记 •），不是日期。 */}
        {head.breadcrumb && (
          <p className="mt-0.5 truncate text-meta text-foreground/45 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
            {head.breadcrumb}
          </p>
        )}
        {/* G250：「已更新 14 小时前」是**相对时间带动词**，不是裸日期。 */}
        <p className="mt-1 text-meta text-foreground/55 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {head.updated}
        </p>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="text-ui font-medium text-foreground/70">打开</span>
        </div>
      </div>
    </Link>
  );
}
