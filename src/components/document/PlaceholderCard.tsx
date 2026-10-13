import { EMPTY_PLACEHOLDER_HEIGHT, EMPTY_PLACEHOLDER_WIDTH } from '@/lib/browse/grid';
import { cn } from 'cn';

/**
 * The empty-state placeholder card (G1096). Official Craft reserves a card-shaped box while a
 * browse view is still loading, at 240×300 with an 8px radius. `hidden` turns it into a spacer
 * that keeps the grid's height without painting anything — the official `.isHidden` behaviour.
 */
export function PlaceholderCard({ hidden = false, className }: { hidden?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      data-placeholder-card
      style={{ width: EMPTY_PLACEHOLDER_WIDTH, height: EMPTY_PLACEHOLDER_HEIGHT }}
      className={cn(
        'rounded-lg bg-foreground/[0.03]',
        hidden && 'invisible',
        className,
      )}
    />
  );
}
