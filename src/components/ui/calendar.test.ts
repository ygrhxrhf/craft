import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G366: two highlight meanings — today is a light tint, the selected/parsed day is solid dark. */
describe('calendar highlight semantics (G366)', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'components', 'ui', 'calendar.tsx'), 'utf8');

  it('keeps a light tint for today', () => {
    expect(source).toMatch(/modifiers\.today[\s\S]{0,200}bg-craft-accent\/10/);
  });

  it('paints the selected single day with the near-black foreground', () => {
    expect(source).toContain('data-[selected-single=true]:bg-foreground');
    expect(source).toContain('data-[selected-single=true]:text-background');
  });
});

/** G363: no caller passes `locale`, so the default is what makes the grid Chinese. */
describe('calendar locale (G363)', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'components', 'ui', 'calendar.tsx'), 'utf8');

  it('defaults to the Chinese locale instead of react-day-picker enUS', () => {
    expect(source).toMatch(/import \{[^}]*zhCN[^}]*\} from ["']react-day-picker\/locale["']/);
    expect(source).toMatch(/locale = zhCN/);
  });
});
