import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';
import {
  collectionNameFromFile,
  csvImportDoneEvent,
  csvImportStartEvent,
  csvProxyUrlFor,
  isCsvFileBlock,
} from './csv-file';

describe('parseCsv (G112)', () => {
  it('splits a simple table into header + rows', () => {
    expect(parseCsv('名称,备注\r\n甲,a\r\n乙,b\r\n')).toEqual([
      ['名称', '备注'],
      ['甲', 'a'],
      ['乙', 'b'],
    ]);
  });

  it('honours quoted fields containing commas and quotes', () => {
    expect(parseCsv('a,b\r\n"x,y","he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x,y', 'he said "hi"'],
    ]);
  });

  it('honours quoted fields containing newlines', () => {
    expect(parseCsv('a,b\r\n"line1\nline2",c\r\n')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'c'],
    ]);
  });

  it('accepts LF-only line endings', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('\uFEFFa,b\r\n1,2\r\n')[0]).toEqual(['a', 'b']);
  });

  it('keeps empty cells as empty strings', () => {
    expect(parseCsv('a,b,c\r\n1,,3\r\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});

describe('isCsvFileBlock (G112: the guard)', () => {
  it('accepts .csv in any case', () => {
    expect(isCsvFileBlock('报表.csv')).toBe(true);
    expect(isCsvFileBlock('REPORT.CSV')).toBe(true);
  });

  it('refuses other extensions and empty names', () => {
    expect(isCsvFileBlock('报表.xlsx')).toBe(false);
    expect(isCsvFileBlock('csv')).toBe(false);
    expect(isCsvFileBlock(null)).toBe(false);
    expect(isCsvFileBlock(undefined)).toBe(false);
  });
});

describe('collectionNameFromFile (G112: filename minus extension)', () => {
  it('drops the extension', () => {
    expect(collectionNameFromFile('季度报表.csv')).toBe('季度报表');
  });

  it('falls back to the default collection name when empty', () => {
    expect(collectionNameFromFile('')).toBe('未命名集合');
    expect(collectionNameFromFile(null)).toBe('未命名集合');
    expect(collectionNameFromFile('.csv')).toBe('未命名集合');
  });
});

describe('csvProxyUrlFor (G112: body read via the proxy)', () => {
  it('returns the url for a csv block', () => {
    expect(csvProxyUrlFor('a.csv', 'https://files/x.csv')).toBe('https://files/x.csv');
  });

  it('returns null for a non-csv block or a missing url', () => {
    expect(csvProxyUrlFor('a.pdf', 'https://files/x.pdf')).toBeNull();
    expect(csvProxyUrlFor('a.csv', null)).toBeNull();
  });
});

describe('csv import analytics (G112: the state:"start" phase)', () => {
  it('the start event carries state: start', () => {
    expect(csvImportStartEvent()).toMatchObject({ state: 'start', event: 'collection.import.csv' });
  });

  it('the done event carries the row count', () => {
    expect(csvImportDoneEvent(3)).toMatchObject({ state: 'success', rowCount: 3 });
  });
});
