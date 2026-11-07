'use client';

import {
  COLLAPSE_ROW_TEXT_LEFT_OFFSET,
  SHOW_LESS_LABEL,
  showMoreRowsLabel,
} from '@/lib/browse/section-collapse';

interface CollapseRowProps {
  isExpanded: boolean;
  remainingCount: number;
  onToggle: () => void;
  /** Official `textLeftOffset: 22`; the starred section passes none. */
  textLeftOffset?: number;
}

/**
 * G391 — one collapse row shared by every sidebar section (official `m8e`). Collapsed it reads
 * 「再显示 [0] 项」 (`browse.show.x.more`), expanded it reads 「显示较少」 (`tasks.show.less`).
 * `aria-expanded` states which of the two a screen reader is hearing (G385's rule).
 */
export function CollapseRow({
  isExpanded,
  remainingCount,
  onToggle,
  textLeftOffset = COLLAPSE_ROW_TEXT_LEFT_OFFSET,
}: CollapseRowProps) {
  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      onClick={onToggle}
      style={{ paddingLeft: `${textLeftOffset}px` }}
      className="w-full rounded-md py-1 pr-2 text-left text-meta text-foreground/40 transition-colors hover:bg-sidebar-hover hover:text-foreground"
    >
      {isExpanded ? SHOW_LESS_LABEL : showMoreRowsLabel(remainingCount)}
    </button>
  );
}