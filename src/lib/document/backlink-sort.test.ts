import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BACKLINK_SORTS, BACKLINKS_LOADING, sortBacklinks, type SortableBacklink } from './backlink-sort';

/**
 * Backlinks panel sorting (G147): alphabetical, by creation date, and by link count.
 */
const link = (title: string, createdAt = '2026-01-01', linkCount?: number): SortableBacklink => ({
  sourceDocumentId: title,
  sourceTitle: title,
  sourceIcon: null,
  createdAt,
  linkCount,
});

describe('the three sorts', () => {
  it('lists exactly three', () => {
    expect([...BACKLINK_SORTS]).toEqual(['alphabetical', 'created', 'linkCount']);
  });

  it('sorts alphabetically by title', () => {
    const items = [link('banana', '2026-01-01'), link('apple', '2026-02-01'), link('Cherry', '2026-03-01')];
    expect(sortBacklinks(items, 'alphabetical').map((i) => i.sourceTitle)).toEqual(['apple', 'banana', 'Cherry']);
  });

  it('sorts by creation date, newest first', () => {
    const items = [link('old', '2026-01-01'), link('new', '2026-03-01'), link('mid', '2026-02-01')];
    expect(sortBacklinks(items, 'created').map((i) => i.sourceTitle)).toEqual(['new', 'mid', 'old']);
  });

  it('sorts by link count, highest first', () => {
    const items = [link('few', '2026-01-01', 1), link('many', '2026-01-01', 9), link('some', '2026-01-01', 4)];
    expect(sortBacklinks(items, 'linkCount').map((i) => i.sourceTitle)).toEqual(['many', 'some', 'few']);
  });

  it('keeps uncounted entries in title order after the counted ones', () => {
    const items = [link('zebra'), link('counted', '2026-01-01', 5), link('apple')];
    expect(sortBacklinks(items, 'linkCount').map((i) => i.sourceTitle)).toEqual(['counted', 'apple', 'zebra']);
  });

  it('does not mutate the caller array', () => {
    const items = [link('b', '2026-01-01'), link('a', '2026-01-02')];
    const copy = [...items];
    sortBacklinks(items, 'alphabetical');
    expect(items).toEqual(copy);
  });
});

/**
 * G63 —— 反链面板的独立加载态（官方 `blockdetails.mentions.loading.links`，
 * `i18n-zh.tsv:634`）。此前 `getBacklinks` 回来前面板一片空白，与"没有链接"不可分辨。
 */
describe('反链加载态（G63）', () => {
  it('加载句逐字', () => {
    expect(BACKLINKS_LOADING).toBe('正在加载此页面的链接…');
  });

  it('面板确实在未加载完时渲染它（源码接线，不是只定义了常量）', () => {
    const src = readFileSync(
      path.resolve('src/components/editor/tabs/InfoTab.tsx'),
      'utf8',
    );
    expect(src, 'InfoTab 没有渲染加载句').toContain('{BACKLINKS_LOADING}');
    expect(src, 'InfoTab 没有加载完的旗标').toContain('backlinksLoaded');
  });
});
