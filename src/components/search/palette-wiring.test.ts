import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const palette = readFileSync(
  fileURLToPath(new URL('./CommandPalette.tsx', import.meta.url)),
  'utf8',
);

/**
 * G178/G355 are behavior in a client panel, so the wiring is pinned by source: the two-stage
 * sentinel line, the no-query empty state, and the recent-documents group that excludes the open
 * document and truncates at 20.
 */
describe('G178 — search reports "still looking" while results are already up', () => {
  it('renders the sentinel while searching, with or without results', () => {
    expect(palette).toContain('{hasQuery && searching && (');
    expect(palette).toContain('{SEARCHING_OTHER_MATCHES}');
  });

  it('shows the bare no-results line when there is no query and nothing recent', () => {
    expect(palette).toContain("data-testid=\"palette-empty\"");
    expect(palette).toContain('{NO_RESULTS_FOUND}');
    expect(palette).toContain('!hasQuery && recentsForDisplay.length === 0');
  });

  it('keeps the create-from-query row and the with-query no-results sentence', () => {
    expect(palette).toContain('createDocLabel(query.trim())');
    expect(palette).toContain('noResultsFor(query.trim())');
  });
});

describe('G355 — the recent-documents group excludes the open page and caps at 20', () => {
  it('derives the group through the shared helper', () => {
    expect(palette).toContain('recentForDisplay(recents, currentDocumentId)');
    expect(palette).toContain("pathname?.startsWith('/documents/')");
    expect(palette).toContain('recentsForDisplay.map');
  });
});