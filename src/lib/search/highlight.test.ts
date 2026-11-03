import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { highlightSegments, snippetAround } from './highlight';

describe('search match highlighting (G1286)', () => {
  it('marks every case-insensitive occurrence', () => {
    expect(highlightSegments('Craft and craft', 'craft')).toEqual([
      { text: 'Craft', hit: true },
      { text: ' and ', hit: false },
      { text: 'craft', hit: true },
    ]);
  });

  it('returns the whole text when the query is empty or absent', () => {
    expect(highlightSegments('abc', '')).toEqual([{ text: 'abc', hit: false }]);
    expect(highlightSegments('abc', 'z')).toEqual([{ text: 'abc', hit: false }]);
  });

  it('keeps the match in view and marks truncation', () => {
    const text = `${'甲'.repeat(200)}目标词${'乙'.repeat(200)}`;
    const snippet = snippetAround(text, '目标词');
    const joined = snippet.segments.map((segment) => segment.text).join('');
    expect(joined).toContain('目标词');
    expect(snippet.segments.some((segment) => segment.hit && segment.text === '目标词')).toBe(true);
    expect(snippet.prefix).toBe(true);
    expect(snippet.suffix).toBe(true);
    expect(joined.length).toBeLessThanOrEqual(120);
  });

  it('does not truncate short text', () => {
    const snippet = snippetAround('短文本', '文本');
    expect(snippet.prefix).toBe(false);
    expect(snippet.suffix).toBe(false);
    expect(snippet.segments).toEqual([
      { text: '短', hit: false },
      { text: '文本', hit: true },
    ]);
  });

  it('is wired into the search result and the palette', () => {
    const action = readFileSync(
      new URL('../../actions/document/search.ts', import.meta.url),
      'utf8',
    );
    const palette = readFileSync(
      new URL('../../components/search/CommandPalette.tsx', import.meta.url),
      'utf8',
    );
    expect(action).toContain('snippet: snippetAround(hit.text, q)');
    expect(action).toContain('createdAt: d.createdAt');
    expect(palette).toContain('block.snippet.segments.map');
    expect(palette).toContain('{block.snippet.prefix');
  });
});
