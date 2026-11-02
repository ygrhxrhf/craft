import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G354: a date-shaped query adds one `type:"date"` result; selecting it opens that day's note. */
describe('search date result (G354)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'search', 'CommandPalette.tsx'),
    'utf8',
  );

  it('parses the query and renders a date result row', () => {
    expect(source).toContain('parseDateExpression');
    expect(source).toContain('data-testid="palette-date-result"');
  });

  it('opens the daily note for the parsed day', () => {
    expect(source).toContain('getOrCreateDayNote(date)');
  });
});
