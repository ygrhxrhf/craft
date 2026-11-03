import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BOARD_LONG_PRESS_MS, BOARD_MOVE_TOLERANCE, boardHoldCancelled, dropColumnAt } from './kanban-drag';

describe('board drag activation (G268)', () => {
  it('holds 150ms on every device and cancels past the 8px tolerance', () => {
    expect(BOARD_LONG_PRESS_MS).toBe(150);
    expect(BOARD_MOVE_TOLERANCE).toBe(8);
    expect(boardHoldCancelled(3, 4)).toBe(false);
    expect(boardHoldCancelled(6, 6)).toBe(true);
  });

  it('reads the column id off the element', () => {
    const node = { closest: () => ({ getAttribute: () => 'opt-1' }) } as unknown as Element;
    expect(dropColumnAt(node)).toBe('opt-1');
    expect(dropColumnAt(null)).toBeNull();
  });

  it('is wired into the kanban view', () => {
    const view = readFileSync(join(process.cwd(), 'src/app/(app)/collections/[id]/KanbanView.tsx'), 'utf8');
    expect(view).toContain('BOARD_LONG_PRESS_MS');
    expect(view).toContain('data-kanban-column');
    expect(view).toContain('draggable={armed}');
  });
});
