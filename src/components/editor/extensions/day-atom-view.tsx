'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { dayAtomHref, dayAtomLabel } from '@/lib/editor/inline-atoms';

/** G580：`day` 原子——点它打开那一天的每日笔记（`day://` 深链）。 */
export function DayAtomView({ node }: NodeViewProps) {
  const router = useRouter();
  const date = node.attrs.date as string | null;
  const href = dayAtomHref(date);

  const open = () => {
    if (!href) return;
    const target = href.replace('day://', '/daily-notes?date=')
      .replace(/\./g, '-');
    router.push(target);
  };

  return (
    <NodeViewWrapper as="span" className="inline" data-type="day" data-day={date ?? undefined}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          open();
        }}
        className="inline-flex items-center gap-1 rounded-md bg-foreground/4 px-1.5 py-0.5 text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/8"
      >
        <CalendarDays className="size-3.5 text-foreground/40" />
        <span>{dayAtomLabel(date)}</span>
      </button>
    </NodeViewWrapper>
  );
}
