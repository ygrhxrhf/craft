import { describe, expect, it } from 'vitest';

import { cellHref, neighborCells, readCellHash, type CellAddress } from './cell-address';
import { ACCESS_LEVELS, ACCESS_LEVEL_COPY, capabilitiesForAccessLevel } from '@/lib/share/access-levels';

const addr: CellAddress = { tableId: 't1', rowId: 'r1', columnId: 'c1', cellId: 'x1' };

describe('cell addressing (G439)', () => {
  it('round-trips a cell deep link', () => {
    const href = cellHref('doc-1', addr);
    expect(href).toBe('/documents/doc-1#c-t1__r1__c1__x1');
    expect(readCellHash(href.slice(href.indexOf('#')))).toEqual(addr);
  });

  it('refuses a link that only points at the table block', () => {
    expect(readCellHash('#c-t1')).toBeNull();
    expect(readCellHash('#c-t1__r1')).toBeNull();
  });

  it('refuses a non-cell hash', () => {
    expect(readCellHash('#b-abc')).toBeNull();
    expect(readCellHash(null)).toBeNull();
  });

  it('returns the four directional neighbors, empty at the edges', () => {
    const matrix = { rows: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']] };
    expect(neighborCells(matrix, { row: 1, column: 1 })).toEqual({
      above: ['b'],
      below: ['h'],
      left: ['d'],
      right: ['f'],
    });
    // Top-left corner has nothing above or to the left; below/right are the full column/row runs.
    expect(neighborCells(matrix, { row: 0, column: 0 })).toEqual({
      above: [],
      below: ['d', 'g'],
      left: [],
      right: ['b', 'c'],
    });
  });
});

describe('the five access levels (G131)', () => {
  it('lists five levels in official order', () => {
    expect(ACCESS_LEVELS).toEqual(['collaborators', 'viewAndComment', 'editAndComment', 'linkView', 'linkEdit']);
  });

  it('carries the harvested labels verbatim', () => {
    expect(ACCESS_LEVEL_COPY.collaborators.label).toBe('仅限有访问权限的协作者');
    expect(ACCESS_LEVEL_COPY.viewAndComment.label).toBe('可以查看和评论');
    expect(ACCESS_LEVEL_COPY.editAndComment.label).toBe('可以编辑和评论');
    expect(ACCESS_LEVEL_COPY.linkView.label).toBe('知道链接的人都可以查看');
    expect(ACCESS_LEVEL_COPY.linkEdit.label).toBe('知道链接的任何人都可以编辑');
  });

  it('treats "can comment" as its own cell, not a comment switch', () => {
    expect(capabilitiesForAccessLevel('viewAndComment')).toEqual({
      canView: true,
      canComment: true,
      canEdit: false,
      viaLink: false,
    });
    // A link-view grants viewing but no commenting — the split the local three tiers collapsed.
    expect(capabilitiesForAccessLevel('linkView')).toEqual({
      canView: true,
      canComment: false,
      canEdit: false,
      viaLink: true,
    });
  });

  it('the closed tier grants nothing by itself', () => {
    expect(capabilitiesForAccessLevel('collaborators')).toEqual({
      canView: false,
      canComment: false,
      canEdit: false,
      viaLink: false,
    });
  });
});
