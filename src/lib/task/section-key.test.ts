import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { applySectionAction, sectionKeyAction } from './section-key';

// G1600: the group header collapses with ← / → / Space; same-direction keys are idempotent.
describe('task section collapse (G1600)', () => {
  it('maps the three keys regardless of modifiers', () => {
    expect(sectionKeyAction({ key: 'ArrowLeft' })).toBe('collapse');
    expect(sectionKeyAction({ key: 'ArrowRight' })).toBe('expand');
    expect(sectionKeyAction({ key: ' ' })).toBe('toggle');
    expect(sectionKeyAction({ key: 'Enter' })).toBeNull();
  });

  it('applies idempotent directions', () => {
    expect(applySectionAction(false, 'collapse')).toBe(true);
    expect(applySectionAction(true, 'collapse')).toBe(true);
    expect(applySectionAction(true, 'expand')).toBe(false);
    expect(applySectionAction(false, 'expand')).toBe(false);
    expect(applySectionAction(false, 'toggle')).toBe(true);
  });

  it('wires a full-width header button with aria-expanded', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'app', '(app)', 'tasks', 'TasksView.tsx'),
      'utf8',
    );
    expect(source).toContain('aria-expanded={!collapsed}');
    expect(source).toContain('sectionKeyAction(event)');
    expect(source).toContain('task-section-${group}');
  });
});
