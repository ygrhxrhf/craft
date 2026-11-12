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

/**
 * G1419 — the official full-results page is reached from the palette's last row: 「查看更多结果」
 * with the 「按 Enter 键」 hint. The row routes to `/search?q=…&scope=ALL`, and per-document hit
 * counts are printed on the doc rows rather than only on the results page.
 */
describe('G1419 — the Enter row opens the full results page', () => {
  it('routes to the results URL with the query and scope=ALL', () => {
    expect(palette).toContain('`/search?q=${encodeURIComponent(q)}&scope=ALL`');
    expect(palette).toContain('handleSeeAllResults');
  });

  it('prints the bottom row with the Enter hint from the ledger copy', () => {
    expect(palette).toContain('value="see-more-results"');
    expect(palette).toContain('{SEE_MORE_RESULTS}');
    expect(palette).toContain('{PRESS_ENTER}');
  });

  it('moved pagination off the palette — no load-more state left', () => {
    expect(palette).not.toContain('loadMore');
    expect(palette).not.toContain('nextOffset');
  });

  it('renders the per-document hit count on the doc rows', () => {
    expect(palette).toContain('hitCountLabel(doc.hitCount)');
  });
});