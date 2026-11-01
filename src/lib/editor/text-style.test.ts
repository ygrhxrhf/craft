import { describe, expect, it } from 'vitest';

import {
  EXPORT_TAG_BY_STYLE,
  UI_TEXT_STYLES,
  classifyBlockKind,
  headingLevelFor,
  isTextStyleValue,
  textStyleForHeadingLevel,
  textStyleOrdinal,
} from './text-style';

// G274: nine values; the page-ish three share Body's ordinal and Note is internal-only.
describe('the textStyle vocabulary', () => {
  it('orders the six named levels', () => {
    expect(['Title', 'Subtitle', 'Heading', 'Strong', 'Body', 'Caption'].map(textStyleOrdinal)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('falls the page-ish values through to Body and keeps Note out of the UI list', () => {
    expect(textStyleOrdinal('PageRegular')).toBe(5);
    expect(textStyleOrdinal('PageCard')).toBe(5);
    expect(textStyleOrdinal('Note')).toBe(5);
    expect(isTextStyleValue('Note')).toBe(true);
    expect(UI_TEXT_STYLES).not.toContain('Note');
  });

  it('reads unknown input as Body', () => {
    expect(textStyleOrdinal('Nonsense')).toBe(5);
    expect(textStyleOrdinal(undefined)).toBe(5);
  });

  it('maps levels both ways', () => {
    expect([1, 2, 3, 4].map(textStyleForHeadingLevel)).toEqual(['Title', 'Subtitle', 'Heading', 'Strong']);
    expect(headingLevelFor('Heading')).toBe(3);
    expect(headingLevelFor('Caption')).toBeNull();
  });
});

// G275: the export table is a literal, copied from the official one.
describe('the export table', () => {
  it('maps the four heading styles onto h1–h4', () => {
    expect([EXPORT_TAG_BY_STYLE.Title, EXPORT_TAG_BY_STYLE.Subtitle, EXPORT_TAG_BY_STYLE.Heading, EXPORT_TAG_BY_STYLE.Strong]).toEqual([
      'h1', 'h2', 'h3', 'h4',
    ]);
  });
});

// G276: listStyle outranks textStyle.
describe('block kind precedence', () => {
  it('classifies a bulleted heading as a list item', () => {
    expect(classifyBlockKind({ type: 'paragraph', attrs: { textStyle: 'Heading', listStyle: 'bullet' } })).toBe(
      'listItem',
    );
  });

  it('classifies a plain heading as a heading', () => {
    expect(classifyBlockKind({ type: 'paragraph', attrs: { textStyle: 'Heading' } })).toBe('heading');
  });

  it('recognizes task and list nodes first', () => {
    expect(classifyBlockKind({ type: 'taskItem', attrs: {} })).toBe('taskItem');
    expect(classifyBlockKind({ type: 'listItem', attrs: { textStyle: 'Title' } })).toBe('listItem');
  });

  it('falls back to a paragraph', () => {
    expect(classifyBlockKind({ type: 'paragraph', attrs: {} })).toBe('paragraph');
  });
});
