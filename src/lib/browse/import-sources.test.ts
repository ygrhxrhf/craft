import { describe, expect, it } from 'vitest';

import { IMPORT_SOURCES, IMPORT_SOURCE_KEYS, IMPORT_WHERE } from './import-sources';

describe('G177 — import opens with "where from?" instead of a format list', () => {
  it('asks the question first', () => {
    expect(IMPORT_WHERE).toBe('你想从哪里导入？');
  });

  it('names every source with its official label', () => {
    expect(IMPORT_SOURCES.map((source) => source.label)).toEqual([
      '来自 Markdown 文件',
      '来自 Evernote',
      '来自 Notion',
      '来自 Readwise',
      '来自 Google Docs',
    ]);
  });

  it('keeps each row parked next to the i18n key it must match', () => {
    expect(Object.values(IMPORT_SOURCE_KEYS)).toEqual([
      'import.standalone.md',
      'import.from.evernote',
      'import.from.notion',
      'import.from.readwise',
      'import.from.google.docs',
    ]);
  });

  it('gives every source a distinct pick hint, so the rows are not five copies of one', () => {
    const hints = IMPORT_SOURCES.map((source) => source.hint);
    expect(new Set(hints).size).toBe(hints.length);
  });
});