import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/**
 * Source wiring for the repeat/reminder controls the ledger pins down (G266 / G372 / G637 / G639).
 * The behaviour itself is covered by the pure cores; these assertions keep the components from
 * drifting back to the shapes the ledger recorded as gaps (a boolean weekend switch, a free number
 * field, a free datetime-local reminder, no anchor banner, no × that only closes).
 */
describe('the task repeat and reminder controls', () => {
  const popover = read('components/task/TaskDatePopover.tsx');
  const tasks = read('app/(app)/tasks/TasksView.tsx');

  it('offers the weekend layer as two ticked rows that collapse on pick (G266)', () => {
    expect(popover).toContain('data-testid="daily-weekend-items"');
    expect(popover).toContain('WEEKEND_OPTIONS.map');
    expect(popover).toContain('role="menuitemcheckbox"');
    expect(popover).toContain('aria-checked={picked === option.id}');
    expect(popover).toMatch(/withWeekendOption\(recurrence\.value, option\.id\)[\s\S]{0,120}setCustomOpen\(false\)/);
  });

  it('picks the interval from the ceiling menu in both surfaces (G266)', () => {
    expect(popover).toContain('<RepeatIntervalSelect');
    expect(tasks).toContain('<RepeatIntervalSelect');
  });

  it('closes from a × that does not clear, beside the 「清除 日期」 row (G372)', () => {
    expect(popover).toMatch(/data-testid="date-popover-close"[\s\S]{0,160}onClick=\{\(\) => setOpen\(false\)\}/);
    expect(popover).toContain('清除 日期');
  });

  it('shows the anchor banner on both surfaces (G637)', () => {
    expect(popover).toContain('<RepeatAnchorNote');
    expect(tasks).toContain('<RepeatAnchorNote');
  });

  it('offers the reminder as the 96-slot grid with a conditional clear row (G639)', () => {
    expect(tasks).not.toContain('type="datetime-local"');
    expect(tasks).toContain('data-testid="task-remind-slot"');
    expect(tasks).toContain('timeSlots()');
    expect(tasks).toContain('{task.remindAt && <option value="none">无提醒</option>}');
    // The menu opens on the wall clock's own slot — never the captured 17:00.
    expect(popover).toContain('slotIndexForTime(existing ?? new Date())');
    expect(popover).not.toContain(': 17');
  });
});
/**
 * G364 / G376 —— the date popover is non-modal (no backdrop, row and body stay live) and the
 * shared calendar keeps the two highlight semantics apart: dark solid for the current/pending
 * value, accent tint for today and only while today is inside the rendered month.
 */
describe('the date popover and calendar semantics', () => {
  const popover = read('components/task/TaskDatePopover.tsx');
  const calendar = read('components/ui/calendar.tsx');

  it('opens without a modal backdrop and closes on Escape or a blank click (G364)', () => {
    expect(popover).not.toContain('fixed inset-0');
    expect(popover).toContain('document.addEventListener(\'mousedown\', onPointerDown)');
    expect(popover).toMatch(/event\.key !== 'Escape'[\s\S]{0,120}setOpen\(false\)/);
  });

  it('paints the current value dark and today in the accent, gated on the viewport month (G376)', () => {
    expect(calendar).toContain('data-[selected-single=true]:bg-foreground');
    expect(calendar).toContain('data-[selected-single=true]:text-background');
    expect(calendar).toMatch(/modifiers\.today\s*&&\s*!day\.outside/);
    expect(calendar).toContain('bg-craft-accent/10');
  });
});
