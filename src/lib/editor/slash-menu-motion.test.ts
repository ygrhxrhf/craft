import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
