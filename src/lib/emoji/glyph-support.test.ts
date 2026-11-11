import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createUnavailableProbe, dropUnavailableGlyphs } from './glyph-support';

/**
 * G1084 —— the probe's consumer. The local stack has no `AdobeBlank`, so "no glyph anywhere"
 * cannot read as zero width the way the official probe does: a missing glyph lands on the system
 * last-resort box, which still has a width. Width-equality with a sentinel that can only ever be
 * a box is the equivalent judgement.
 */
describe('the unavailable-glyph judgement', () => {
  const box = 7; // the last-resort box width
  const widths: Record<string, number> = {
    '\uFFFF': box,
    a: 6,
    '☃': box,
    '😀': 9,
    '': 0,
  };
  const probe = createUnavailableProbe((character) => widths[character] ?? box);

  it('keeps characters the stack can draw', () => {
    expect(probe('a')).toBe(false);
    expect(probe('😀')).toBe(false);
  });

  it('drops characters that only render as the last-resort box', () => {
    expect(probe('☃')).toBe(true);
  });

  it('keeps the official zero-width reading', () => {
    expect(probe('')).toBe(true);
  });

  it('decides each character once', () => {
    const seen: string[] = [];
    const counted = createUnavailableProbe((character) => {
      seen.push(character);
      return character === '☃' ? box : 6;
    });
    counted('☃');
    counted('☃');
    counted('a');
    counted('a');
    // One sentinel measurement up front, then one per distinct character.
    expect(seen).toEqual(['\uFFFF', '☃', 'a']);
  });
});

describe('filtering a candidate list', () => {
  const entries = [
    { char: 'a', name: 'a' },
    { char: '☃', name: 'snowman' },
    { char: '😀', name: 'grin' },
  ];

  it('removes the undrawable candidates and keeps the rest in order', () => {
    const probe = createUnavailableProbe((character) =>
      character === '\uFFFF' || character === '☃' ? 7 : 6,
    );
    expect(dropUnavailableGlyphs(entries, probe)).toEqual([
      { char: 'a', name: 'a' },
      { char: '😀', name: 'grin' },
    ]);
  });

  it('passes everything through when there is no canvas to measure with', () => {
    expect(dropUnavailableGlyphs(entries, null)).toBe(entries);
  });
});

describe('the pickers ask the probe before offering a candidate', () => {
  const read = (relative: string) =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

  it('filters the editor’s `:name:` menu on both the items and fallback paths', () => {
    const source = read('../../components/editor/extensions/emoji-suggestion.tsx');
    expect(source).toContain("from '@/lib/emoji/glyph-support'");
    expect(source.match(/dropUnavailableGlyphs\(/g)).toHaveLength(2);
  });

  it('filters the comment field’s completion', () => {
    const source = read('../../components/editor/comments/EmojiSuggest.tsx');
    expect(source).toContain("from '@/lib/emoji/glyph-support'");
    expect(source).toContain('dropUnavailableGlyphs(searchEmojis(index, term))');
  });
});
