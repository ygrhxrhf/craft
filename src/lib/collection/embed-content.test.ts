import { describe, expect, it } from 'vitest';

import {
  EMBED_EMPTY_ITEMS,
  EMBED_MISSING_COLLECTION,
  UNTITLED_COLLECTION,
  UNTITLED_ITEM,
  UNGROUPED_COLUMN,
  cellOf,
  embedColumns,
  embedTitle,
  galleryCards,
  itemTitle,
  kanbanColumns,
  pickEmbedView,
  readEmbedQuery,
  readNumberFormat,
  type EmbedItem,
  type EmbedProperty,
} from './embed-content';
import { KANBAN_NO_GROUP_PROPERTY } from './kanban-copy';

const property = (patch: Partial<EmbedProperty> & { id: string; type: string }): EmbedProperty => ({
  name: patch.id,
  config: null,
  order: 0,
  isVisible: true,
  ...patch,
});

const item = (id: string, values: EmbedItem['values'] = [], extra: Partial<EmbedItem> = {}): EmbedItem => ({
  id,
  values,
  ...extra,
});

describe('the collection embed body (G1614)', () => {
  it('picks the view the block asks for, then the active one, then the first', () => {
    const views = [
      { id: 'v1', type: 'table' },
      { id: 'v2', type: 'kanban', isActive: true },
    ];
    expect(pickEmbedView(views, 'kanban')?.id).toBe('v2');
    expect(pickEmbedView(views, 'gallery')?.id).toBe('v2');
    expect(pickEmbedView([{ id: 'v1', type: 'table' }], 'kanban')?.id).toBe('v1');
    expect(pickEmbedView([], 'table')).toBeNull();
  });

  it('drops globally hidden fields and this view’s hidden ones, keeping the view order', () => {
    const properties = [
      property({ id: 'title', type: 'text', order: 0 }),
      property({ id: 'status', type: 'select', order: 1 }),
      property({ id: 'gone', type: 'text', order: 2, isVisible: false }),
      property({ id: 'notes', type: 'text', order: 3 }),
    ];
    const columns = embedColumns(properties, {
      id: 'v1',
      type: 'table',
      config: JSON.stringify({ customPropertyOrder: ['notes', 'title', 'status'], hiddenProperties: ['status'] }),
    });
    // 视图顺序 notes → title，隐藏的 status 不出现；标题列（第一枚文本，order 0）被提到首位。
    expect(columns.map((column) => column.id)).toEqual(['title', 'notes']);
    expect(columns.some((column) => column.id === 'gone')).toBe(false);
  });

  it('prints each column type with the same wording the route screen uses', () => {
    const properties = [
      property({ id: 'title', type: 'text' }),
      property({ id: 'price', type: 'number', config: JSON.stringify({ numberFormat: 'currency' }) }),
      property({
        id: 'status',
        type: 'select',
        config: JSON.stringify({ options: [{ id: 'o1', value: '进行中', themeString: 'blue' }] }),
      }),
      property({ id: 'done', type: 'checkbox' }),
      property({ id: 'sum', type: 'formula', config: JSON.stringify({ expression: '{price} * 2' }) }),
      property({ id: 'emptyFormula', type: 'formula' }),
      property({ id: 'attachment', type: 'file' }),
      property({ id: 'anchor', type: 'linkToBlock' }),
      property({ id: 'owner', type: 'person' }),
      property({ id: 'rel', type: 'relation' }),
      property({ id: 'due', type: 'date' }),
      property({ id: 'blank', type: 'text' }),
    ];
    const row = item('i1', [
      { propertyId: 'title', value: '季度计划' },
      { propertyId: 'price', value: 12 },
      { propertyId: 'status', value: 'o1' },
      { propertyId: 'done', value: true },
      { propertyId: 'attachment', value: { name: '报告.pdf', url: 'https://x/report.pdf' } },
      { propertyId: 'anchor', value: JSON.stringify({ name: '引言', url: '/documents/d1#b2' }) },
      { propertyId: 'owner', value: { userId: 'u1', firstName: 'Ada', lastName: 'Lovelace' } },
      { propertyId: 'rel', value: { type: 'relation', objectListId: 'c2', items: ['r1', 'r2'] } },
      { propertyId: 'due', value: '2026-11-13' },
    ]);
    const cell = (id: string) => cellOf(properties.find((entry) => entry.id === id)!, row, properties);

    expect(cell('title').text).toBe('季度计划');
    expect(cell('price').text).toBe('¥12');
    expect(cell('status')).toMatchObject({ text: '进行中', chips: [{ label: '进行中', color: '#3b82f6' }] });
    expect(cell('done').text).toBe('✓');
    expect(cell('sum').text).toBe('24');
    expect(cell('emptyFormula')).toMatchObject({ text: '未设置公式', muted: true });
    expect(cell('attachment').text).toBe('报告.pdf');
    expect(cell('anchor').text).toBe('引言');
    expect(cell('owner').text).toBe('Ada Lovelace');
    expect(cell('rel').text).toBe('r1, r2');
    expect(cell('due').text).toBe('2026-11-13');
    expect(cell('blank')).toMatchObject({ text: '-', blank: true });
  });

  it('reads the number sub-format from the column config, defaulting to plain numbers', () => {
    expect(readNumberFormat(null)).toBe('number');
    expect(readNumberFormat('{"numberFormat":"percent"}')).toBe('percent');
    expect(readNumberFormat('not json')).toBe('number');
  });

  it('groups a board by the first single-select column and keeps leftovers in 未分组', () => {
    const properties = [
      property({ id: 'title', type: 'text' }),
      property({
        id: 'status',
        type: 'select',
        config: JSON.stringify({
          options: [
            { id: 'o1', value: '待办', themeString: 'yellow' },
            { id: 'o2', value: '完成', themeString: 'green' },
          ],
        }),
      }),
    ];
    const board = kanbanColumns(properties, [
      item('a', [{ propertyId: 'status', value: 'o1' }]),
      item('b', [{ propertyId: 'status', value: 'o2' }]),
      item('c'),
    ]);
    expect(board.ok).toBe(true);
    if (!board.ok) return;
    expect(board.property.id).toBe('status');
    expect(board.columns.map((column) => [column.label, column.items.length])).toEqual([
      ['待办', 1],
      ['完成', 1],
      [UNGROUPED_COLUMN.label, 1],
    ]);
    expect(board.columns[2]).toMatchObject({ id: '__ungrouped__', color: '#6b7280' });
  });

  it('answers the collected sentence when no column can group the board', () => {
    const board = kanbanColumns([property({ id: 'title', type: 'text' })], [item('a')]);
    expect(board).toEqual({ ok: false, message: KANBAN_NO_GROUP_PROPERTY });
  });

  it('builds gallery cards with a cover, a title and at most three detail lines', () => {
    const columns = [
      property({ id: 'title', type: 'text', name: '标题' }),
      property({ id: 'cover', type: 'file', name: '封面' }),
      property({ id: 'a', type: 'text', name: 'A' }),
      property({ id: 'b', type: 'text', name: 'B' }),
      property({ id: 'c', type: 'text', name: 'C' }),
      property({ id: 'd', type: 'text', name: 'D' }),
    ];
    const cards = galleryCards(columns, [
      item('i1', [
        { propertyId: 'title', value: '海边' },
        { propertyId: 'cover', value: { name: 'x.png', url: 'https://x/y.png' } },
        { propertyId: 'a', value: '1' },
        { propertyId: 'b', value: '2' },
        { propertyId: 'c', value: '3' },
        { propertyId: 'd', value: '4' },
      ]),
      item('i2'),
    ]);
    expect(cards[0]).toMatchObject({ title: '海边', cover: 'https://x/y.png' });
    expect(cards[0].lines.map((line) => line.name)).toEqual(['封面', 'A', 'B']);
    expect(cards[1]).toMatchObject({ title: UNTITLED_ITEM, cover: null });
  });

  it('falls back to the id prefix when a card has no title text', () => {
    const columns = [property({ id: 'title', type: 'text' })];
    expect(itemTitle(columns, item('abcdef1234'))).toBe('abcdef12');
    expect(itemTitle(columns, item('x', [{ propertyId: 'title', value: '有标题' }]))).toBe('有标题');
  });

  it('reads filters and sorts out of the view config, tolerating anything else', () => {
    expect(readEmbedQuery(null)).toEqual({ filters: [], sorts: [] });
    expect(readEmbedQuery({ filters: [{ id: 'f' }], sorts: [{ id: 's' }] })).toEqual({
      filters: [{ id: 'f' }],
      sorts: [{ id: 's' }],
    });
  });

  it('prefers the block title, then the collection name, then the placeholder', () => {
    expect(embedTitle('季度看板', '集合本名')).toBe('季度看板');
    expect(embedTitle('  ', '集合本名')).toBe('集合本名');
    expect(embedTitle(null, null)).toBe(UNTITLED_COLLECTION);
  });

  it('keeps the empty and missing copy in one place', () => {
    expect(EMBED_EMPTY_ITEMS).toBe('暂无条目');
    expect(EMBED_MISSING_COLLECTION).toBe('集合不存在或已被删除');
  });
});
