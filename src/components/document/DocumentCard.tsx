'use client';

import Link from 'next/link';
import { File } from 'lucide-react';
import { untitledFor } from '@/lib/document/untitled-copy';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
  };
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const formattedDate = new Date(doc.updatedAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

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
          <h3 className="flex-1 truncate text-card-title font-semibold">{doc.title || untitledFor('list')}</h3>
        </div>
        <p className="mt-1 text-meta text-foreground/55 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {formattedDate}
        </p>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="text-ui font-medium text-foreground/70">打开</span>
        </div>
      </div>
    </Link>
  );
}
