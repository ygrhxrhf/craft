import { describe, expect, it } from 'vitest';

import {
  LEGACY_VIEW_CONFIG_KEYS,
  VIEW_CONFIG_KEYS,
  defaultViewConfig,
  normalizeViewConfig,
  parseViewConfig,
} from './view-config';

describe('the official view-config schema (G81)', () => {
  it('has the twenty keys from protocol.md §二', () => {
    expect(VIEW_CONFIG_KEYS).toHaveLength(20);
    expect([...VIEW_CONFIG_KEYS]).toEqual([
      'id',
      'name',
      'type',
      'filters',
      'sortBy',
      'groupBy',
      'hiddenProperties',
      'customPropertyOrder',
      'columnWidth',
      'calculations',
      'isCalculationsRowVisible',
      'galleryCardSize',
      'galleryPreviewType',
      'galleryShowsAllFields',
      'visibleGalleryFields',
      'tableConfig',
      'galleryConfig',
      'kanbanConfig',
      'kanbanHiddenGroupValues',
      'kanbanColumnOrder',
    ]);
    expect(LEGACY_VIEW_CONFIG_KEYS).toEqual(['sorts', 'showSummaryRow']);
  });

  it('keeps known keys and drops anything outside the schema', () => {
    const normalized = normalizeViewConfig({
      filters: [{ propertyId: 'p1' }],
      columnWidth: { p1: 40 },
      typoKey: 'nope',
    });
    expect(normalized).toEqual({
      filters: [{ propertyId: 'p1' }],
      columnWidth: { p1: 40 },
    });
  });

  it('keeps the legacy sorts/showSummaryRow aliases so old rows do not lose data', () => {
    expect(normalizeViewConfig({ sorts: [{ id: 's1' }], showSummaryRow: true })).toEqual({
      sorts: [{ id: 's1' }],
      showSummaryRow: true,
    });
  });

  it('reads a JSON string and treats a broken one as empty', () => {
    expect(parseViewConfig('{"groupBy":"status"}')).toEqual({ groupBy: 'status' });
    expect(parseViewConfig('{broken')).toEqual({});
    expect(parseViewConfig(null)).toEqual({});
  });

  it('gives a new gallery/kanban view the keys their own surface reads', () => {
    expect(defaultViewConfig('gallery')).toMatchObject({
      galleryCardSize: 'small',
      galleryPreviewType: 'cover',
      galleryShowsAllFields: false,
      visibleGalleryFields: [],
    });
    expect(defaultViewConfig('kanban')).toMatchObject({
      kanbanHiddenGroupValues: [],
      kanbanColumnOrder: [],
    });
    expect(defaultViewConfig('table').tableConfig).toEqual({});
  });
});