'use client';

import { LayoutGrid, List, Rows3 } from 'lucide-react';
import { cn } from 'cn';

import { VIEW_MODES, type BrowseViewMode } from '@/lib/browse/view-modes';

const ICONS = {
  grid: LayoutGrid,
  list: List,
  waterfall: Rows3,
} as const;

/**
 * The three-way layout switcher (G1119). The official control is three DS buttons inside a plain
 * `DIV`, and its selection is carried by a `Filled`/`Plain` class pair — the buttons expose no
 * `aria-pressed`, no `aria-checked` and no `aria-selected`. The `aria-pressed` here is a local
 * accessibility addition, not an attempt to copy the official markup.
 */
export function ViewModeSwitcher({
  value,
  onChange,
}: {
  value: BrowseViewMode;
  onChange: (mode: BrowseViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="布局"
      data-testid="browse-layout-toggle"
      className="flex items-center gap-1 rounded-md p-0.5"
    >
      {VIEW_MODES.map((mode) => {
        const Icon = ICONS[mode.id];
        const active = mode.id === value;
        return (
          <button
            key={mode.id}
            type="button"
            aria-label={mode.label}
            aria-pressed={active}
            title={mode.label}
            onClick={() => onChange(mode.id)}
            className={cn(
              'flex size-7 items-center justify-center rounded transition-colors duration-150',
              active
                ? 'bg-foreground/[0.08] text-foreground'
                : 'text-muted-foreground hover:bg-foreground/[0.04]',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
