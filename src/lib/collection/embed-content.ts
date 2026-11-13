/**
 * G1614 —— 正文里的集合块要**直接渲染集合内容**（表格／画廊／看板三档），不是只给一枚入口卡。
 * 这里把「读哪个视图、渲染哪些列、每格印什么、看板怎么分组、画廊卡片长什么样」收成纯核：
 * NodeView 只负责取数与排版，规则本身在 vitest 里逐条钉住。
 *
 * 读侧口径与路由屏逐条对齐：列序走 `fieldsForView` + 标题列第一（`withTitleFirst`），
 * 单元格先 `parseCellValue` 再按列型分派，选项读官方 `{id,value,themeString}`，公式走同一个
 * `evaluateFormula`，看板缺分组属性时给 `KANBAN_NO_GROUP_PROPERTY` 的原句。
 */

import { parseCellValue } from './cell-value';
import type { CollectionEmbedView } from './embed-block';
import { evaluateFormula } from './formula';
import { KANBAN_NO_GROUP_PROPERTY } from './kanban-copy';
import { parseLinkToBlock } from './link-to-block';
import { parsePersonSnapshot, personLabel } from './person-value';
import { DEFAULT_NUMBER_FORMAT, formatNumber, isNumberFormat, type NumberFormat } from './property-types';
import { relationItems } from './relation-value';
import { optionColor, readSelectOptions } from './select-options';
import { fieldsForView, readViewFields } from './view-fields';
import { withTitleFirst } from './view-chips';

export interface EmbedProperty {
  id: string;
  name: string;
  type: string;
  config: string | null;
  order: number;
  isVisible: boolean;
}

export interface EmbedItem {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  values?: { propertyId: string; value: unknown }[];
}

export interface EmbedView {
  id: string;
  type: string;
  isActive?: boolean;
  config?: unknown;
}

export const EMBED_EMPTY_ITEMS = '暂无条目';
export const EMBED_MISSING_COLLECTION = '集合不存在或已被删除';
export const EMBED_UNAUTHORIZED = '登录后才能查看集合内容';
export const EMBED_LOAD_FAILED = '无法读取集合';
export const EMBED_LOADING = '载入中…';
export const UNTITLED_COLLECTION = '未命名集合';
export const UNTITLED_ITEM = '未命名';
export const UNGROUPED_COLUMN = { id: '__ungrouped__', label: '未分组', color: '#6b7280' };

/** 视图 config 是对象或 JSON 串；读不懂就当空表。 */
export function readConfig(config: unknown): Record<string, unknown> {
  let value = config;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

/** G396：数字子格式从字段 config 读，读不到给默认档（数字）。 */
export function readNumberFormat(config: unknown): NumberFormat {
  const raw = readConfig(config).numberFormat;
  return isNumberFormat(raw) ? raw : DEFAULT_NUMBER_FORMAT;
}

/** 块上写的是想看的视图档；集合里找不到同型视图就退回当前激活视图，再退回第一个。 */
export function pickEmbedView<T extends EmbedView>(
  views: readonly T[],
  requested: CollectionEmbedView,
): T | null {
  if (views.length === 0) return null;
  return (
    views.find((view) => view.type === requested) ??
    views.find((view) => view.isActive) ??
    views[0]
  );
}

/** 要渲染的列：本视图的隐藏/顺序 + 标题列第一位（展示顺序保持视图那套）。 */
export function embedColumns<T extends EmbedProperty>(properties: readonly T[], view: EmbedView | null): T[] {
  return withTitleFirst(fieldsForView(properties, readViewFields(view?.config)));
}

export interface EmbedChip {
  label: string;
  color: string;
}

export interface EmbedCell {
  text: string;
  /** 选项芯片（select / multiSelect 有条目时）。 */
  chips?: EmbedChip[];
  /** 空格子（渲染成淡色 `-`）。 */
  blank?: boolean;
  /** 次要文案（公式报错）。 */
  muted?: boolean;
}

const BLANK: EmbedCell = { text: '-', blank: true };

function timestampText(value?: string): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('zh-CN') : '-';
}

/** 一格只读文案：与 `PropertyCell` 的展示分支同一套口径。 */
export function cellOf(
  property: EmbedProperty,
  item: EmbedItem,
  properties: readonly EmbedProperty[],
): EmbedCell {
  const raw = item.values?.find((entry) => entry.propertyId === property.id)?.value;

  switch (property.type) {
    case 'created_at':
      return { text: timestampText(item.createdAt) };
    case 'updated_at':
      return { text: timestampText(item.updatedAt) };
    case 'number': {
      const text = formatNumber(parseCellValue(raw), readNumberFormat(property.config));
      return text ? { text } : BLANK;
    }
    case 'checkbox':
      return parseCellValue(raw) === true ? { text: '✓' } : BLANK;
    // G454：单选 / 多选存的是选项 id，印 `option.value`；芯片底色取 `themeString`。
    case 'select':
    case 'multi_select':
    case 'multiSelect': {
      const options = readSelectOptions(readConfig(property.config).options);
      const value = parseCellValue(raw);
      const ids = Array.isArray(value) ? value : value == null ? [] : [value];
      const chips = ids.flatMap((id) => {
        const option = options.find((candidate) => candidate.id === id);
        return option ? [{ label: option.value, color: optionColor(option.themeString) }] : [];
      });
      return chips.length ? { text: chips.map((chip) => chip.label).join(', '), chips } : BLANK;
    }
    case 'formula': {
      const expression = String(readConfig(property.config).expression ?? '');
      if (!expression) return { text: '未设置公式', muted: true };
      const row: Record<string, unknown> = {};
      for (const value of item.values ?? []) {
        const named = properties.find((candidate) => candidate.id === value.propertyId);
        if (named) row[named.name] = parseCellValue(value.value);
      }
      const result = evaluateFormula(expression, row);
      if (!result.ok) return { text: result.error, muted: true };
      return {
        text: Number.isInteger(result.value)
          ? String(result.value)
          : String(Math.round(result.value * 10000) / 10000),
      };
    }
    case 'file':
    case 'media': {
      const file = parseCellValue(raw) as { name?: unknown } | null;
      return typeof file?.name === 'string' && file.name ? { text: file.name } : BLANK;
    }
    // G453：`linkToBlock` 落库是 `{name,url}` 快照，只读面印快照名。
    case 'linkToBlock': {
      const snapshot = parseLinkToBlock(parseCellValue(raw));
      return snapshot ? { text: snapshot.name } : BLANK;
    }
    // G454：`person` 四字段快照印「名 姓」。
    case 'person': {
      const snapshot = parsePersonSnapshot(parseCellValue(raw));
      return snapshot ? { text: personLabel(snapshot) } : BLANK;
    }
    // G470：关系格存的是目标条目 id 列表，没有目标集合的活引用可读，按 id 原文印。
    case 'relation': {
      const items = relationItems(parseCellValue(raw));
      return items.length ? { text: items.join(', ') } : BLANK;
    }
    case 'date': {
      const value = parseCellValue(raw);
      return value ? { text: String(value) } : BLANK;
    }
    default: {
      const value = parseCellValue(raw);
      if (value == null || value === '') return BLANK;
      if (typeof value === 'boolean') return value ? { text: '✓' } : BLANK;
      if (Array.isArray(value)) return value.length ? { text: value.map(String).join(', ') } : BLANK;
      return { text: String(value) };
    }
  }
}

export interface EmbedKanbanColumn {
  id: string;
  label: string;
  color: string;
  items: EmbedItem[];
}

export type EmbedKanban =
  | { ok: true; property: EmbedProperty; columns: EmbedKanbanColumn[] }
  | { ok: false; message: string };

/** 看板按第一枚单选列分组；没有单选列就是 `KANBAN_NO_GROUP_PROPERTY` 的原句。 */
export function kanbanColumns(
  properties: readonly EmbedProperty[],
  items: readonly EmbedItem[],
): EmbedKanban {
  const property = properties.find((candidate) => candidate.type === 'select');
  if (!property) return { ok: false, message: KANBAN_NO_GROUP_PROPERTY };

  const options = readSelectOptions(readConfig(property.config).options);
  const columns: EmbedKanbanColumn[] = options.map((option) => ({
    id: option.id,
    label: option.value,
    color: optionColor(option.themeString),
    items: [],
  }));
  const ungrouped: EmbedItem[] = [];

  for (const item of items) {
    const raw = parseCellValue(item.values?.find((entry) => entry.propertyId === property.id)?.value);
    const column = typeof raw === 'string' ? columns.find((candidate) => candidate.id === raw) : undefined;
    if (column) column.items.push(item);
    else ungrouped.push(item);
  }

  if (ungrouped.length > 0) columns.push({ ...UNGROUPED_COLUMN, items: ungrouped });
  return { ok: true, property, columns };
}

const IMAGE_URL = /^(https?:\/\/\S+\.(png|jpe?g|gif|webp|avif)|data:image\/)/i;

export interface EmbedGalleryCard {
  id: string;
  title: string;
  cover: string | null;
  lines: { name: string; text: string }[];
}

/** 封面与路由屏同一规则：第一个 `file` 的 `url`，否则第一个像图片地址的字符串。 */
function coverOf(columns: readonly EmbedProperty[], item: EmbedItem): string | null {
  for (const property of columns) {
    const value = parseCellValue(item.values?.find((entry) => entry.propertyId === property.id)?.value);
    if (property.type === 'file' || property.type === 'media') {
      const url = (value as { url?: unknown } | null)?.url;
      if (typeof url === 'string') return url;
      continue;
    }
    if (typeof value === 'string' && IMAGE_URL.test(value)) return value;
  }
  return null;
}

/** 看板卡片与画廊标题：主列有文本就印它，空白退回 `未命名` / id 短前缀。 */
export function itemTitle(columns: readonly EmbedProperty[], item: EmbedItem): string {
  const primary = columns.find((candidate) => candidate.type === 'text') ?? columns[0];
  const cell = primary ? cellOf(primary, item, columns) : null;
  return cell && !cell.blank ? cell.text : item.id.slice(0, 8);
}

export function galleryCards(
  columns: readonly EmbedProperty[],
  items: readonly EmbedItem[],
): EmbedGalleryCard[] {
  const [primary, ...rest] = columns;
  return items.map((item) => {
    const titleCell = primary ? cellOf(primary, item, columns) : null;
    return {
      id: item.id,
      title: titleCell && !titleCell.blank ? titleCell.text : UNTITLED_ITEM,
      cover: coverOf(columns, item),
      lines: rest.slice(0, 3).map((property) => {
        const cell = cellOf(property, item, columns);
        return { name: property.name, text: cell.text };
      }),
    };
  });
}

/** 视图 config 里的筛选/排序（引擎在 `FilterBar` / `SortMenu`，这里只管读出数组）。 */
export function readEmbedQuery(config: unknown): { filters: any[]; sorts: any[] } {
  const parsed = readConfig(config);
  return {
    filters: Array.isArray(parsed.filters) ? parsed.filters : [],
    sorts: Array.isArray(parsed.sorts) ? parsed.sorts : [],
  };
}

/** 块头标题：块上的 title 优先，其次集合本名，最后占位。 */
export function embedTitle(attributeTitle: unknown, collectionName: unknown): string {
  const own = typeof attributeTitle === 'string' ? attributeTitle.trim() : '';
  if (own) return own;
  const loaded = typeof collectionName === 'string' ? collectionName.trim() : '';
  return loaded || UNTITLED_COLLECTION;
}
