import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLASH_MENU_ENTRANCE_MS, SLASH_MENU_EXIT_CLASSES, SLASH_MENU_EXIT_MS } from './slash-menu-motion';

/** G1568: container has only the opacity transition; the inner div carries the 100ms entrance. */
describe('slash menu entrance (G1568)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'slash-menu', 'SlashCommandMenu.tsx'),
    'utf8',
  );

  it('keeps the container animation-free', () => {
    const container = source.slice(source.indexOf('className="max-h-80'), source.indexOf('className="max-h-80') + 200);
    expect(container).toContain('transition-opacity duration-150');
    expect(container).not.toContain('animate-in');
  });

  it('puts the 100ms entrance on the inner div', () => {
    expect(source).toContain('data-testid="slash-menu-inner"');
    expect(source).toMatch(/className="animate-in fade-in-0 duration-100"[^>]*data-testid="slash-menu-inner"/);
  });
});

/** G1569：官方在 Escape 那一步采到一条 100ms 的退场动画（与入场同长）。 */
describe('slash menu exit (G1569)', () => {
  const extension = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'slash-menu', 'SlashCommandExtension.ts'),
    'utf8',
  );

  it('exits for as long as it enters', () => {
    expect(SLASH_MENU_EXIT_MS).toBe(SLASH_MENU_ENTRANCE_MS);
    expect(SLASH_MENU_EXIT_MS).toBe(100);
    expect(SLASH_MENU_EXIT_CLASSES).toContain('duration-100');
  });

  it('fades the inner menu instead of unmounting on Escape', () => {
    expect(extension).toContain('beginExit()');
    expect(extension).toContain('SLASH_MENU_EXIT_CLASSES');
    expect(extension).toContain('window.setTimeout(destroy, SLASH_MENU_EXIT_MS)');
    // The Escape branch must not clean up synchronously any more.
    const escape = extension.slice(extension.indexOf("event.key === 'Escape'"));
    expect(escape.slice(0, 200)).not.toContain('cleanup();');
  });

  it('ignores repaints while the exit is running', () => {
    expect(extension).toContain('if (!latest || exiting) return;');
  });
});
