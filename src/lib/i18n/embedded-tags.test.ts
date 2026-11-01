import { describe, expect, it } from 'vitest';

import { parseEmbeddedTags, stripEmbeddedTags } from './embedded-tags';

// G320: a tagged value renders into styled segments instead of leaking its markup.
describe('embedded tag segments', () => {
  it('marks the text a tag wraps', () => {
    expect(parseEmbeddedTags('a <strong>b</strong> c')).toEqual([
      { kind: 'text', text: 'a ', styles: [] },
      { kind: 'text', text: 'b', styles: ['bold'] },
      { kind: 'text', text: ' c', styles: [] },
    ]);
  });

  it('reads a link tag as a link segment carrying its tag name', () => {
    const segments = parseEmbeddedTags('see <toclink>contents</toclink> now');
    expect(segments).toContainEqual({ kind: 'link', text: 'contents', tag: 'toclink' });
  });

  it('turns a self-closing break into a break segment', () => {
    expect(parseEmbeddedTags('a<br/>b')).toEqual([
      { kind: 'text', text: 'a', styles: [] },
      { kind: 'break' },
      { kind: 'text', text: 'b', styles: [] },
    ]);
  });

  it('keeps the text of an unknown tag but drops the markup', () => {
    expect(parseEmbeddedTags('<UncoloredLink>x</UncoloredLink>')).toEqual([
      { kind: 'text', text: 'x', styles: [] },
    ]);
  });

  it('nests styles', () => {
    const segment = parseEmbeddedTags('<strong><italic>z</italic></strong>')[0];
    expect(segment.kind === 'text' && segment.styles).toEqual(['bold', 'italic']);
  });

  it('strip leaves plain text', () => {
    expect(stripEmbeddedTags('a <strong>b</strong><br/>c')).toBe('a b\nc');
  });
});
