/**
 * G393/G41: the official field-type enum `le` has thirteen values. The local vocabulary is a
 * superset (it adds three derived types) and renames two pairs, so this table is the single place
 * the two are reconciled — the add menu, the type-change menu, the server-side setter and the
 * filter tiers all read it.
 */

/** The thirteen official values, in the order the enum lists them. */
export const OFFICIAL_COLUMN_TYPES = [
  'text',
  'number',
  'checkbox',
  'date',
  'url',
  'person',
  'select',
  'multiSelect',
  'media',
  'relation',
  'linkToBlock',
  'email',
  'phone',
] as const;

export type OfficialColumnType = (typeof OFFICIAL_COLUMN_TYPES)[number];

/** Local spelling ↔ official spelling. Only these two pairs differ. */
const LOCAL_TO_OFFICIAL: Record<string, OfficialColumnType> = {
  multi_select: 'multiSelect',
  file: 'media',
};

const OFFICIAL_TO_LOCAL: Partial<Record<OfficialColumnType, string>> = {
  multiSelect: 'multi_select',
  media: 'file',
};

/** Local types that have no official counterpart; they are derived or internal. */
export const LOCAL_ONLY_COLUMN_TYPES = ['formula', 'created_at', 'updated_at'] as const;

export function officialColumnType(local: unknown): OfficialColumnType | null {
  if (typeof local !== 'string') return null;
  if ((OFFICIAL_COLUMN_TYPES as readonly string[]).includes(local)) return local as OfficialColumnType;
  return LOCAL_TO_OFFICIAL[local] ?? null;
}

export function localColumnType(official: unknown): string | null {
  if (typeof official !== 'string') return null;
  const renamed = OFFICIAL_TO_LOCAL[official as OfficialColumnType];
  if (renamed) return renamed;
  return (OFFICIAL_COLUMN_TYPES as readonly string[]).includes(official) ? official : null;
}

/** The labels the add menu shows, keyed by the **local** value. */
export const OFFICIAL_TYPE_LABELS: Record<OfficialColumnType, string> = {
  text: '文本',
  number: '数字',
  checkbox: '勾选框',
  date: '日期',
  url: '链接',
  person: '人员',
  select: '单选',
  multiSelect: '多选',
  media: '媒体',
  relation: '关联',
  linkToBlock: '区块链接',
  email: '邮箱',
  phone: '电话',
};

/**
 * The field types the collection UI offers. One list, because the add menu, the type-change
 * menu and the server-side setter must agree on the vocabulary (G393/G299).
 *
 * The thirteen official types come first, in enum order, then the three local-only ones.
 */
export const PROPERTY_TYPES: readonly { value: string; label: string }[] = [
  // G393: new columns are stored under the **official** spelling; the legacy local names
  // (`file`, `multi_select`) stay readable on the read side.
  ...OFFICIAL_COLUMN_TYPES.map((official) => ({
    value: official,
    label: OFFICIAL_TYPE_LABELS[official],
  })),
  { value: 'formula', label: '公式' },
];

export const PROPERTY_TYPE_VALUES = new Set(PROPERTY_TYPES.map((type) => type.value));

/**
 * G396 —— 数字字段有**三档显示子格式**：数字 / `percent` / `currency`，各带一枚图标
 * （`hashtag` / `percentage` / `money`）。
 */
export type NumberFormat = 'number' | 'percent' | 'currency';

export const NUMBER_FORMATS: readonly { value: NumberFormat; label: string; icon: string }[] = [
  { value: 'number', label: '数字', icon: 'hashtag' },
  { value: 'percent', label: '百分比', icon: 'percentage' },
  { value: 'currency', label: '货币', icon: 'money' },
] as const;

/** 数字字段的默认子格式。 */
export const DEFAULT_NUMBER_FORMAT: NumberFormat = 'number';

export function isNumberFormat(value: unknown): value is NumberFormat {
  return value === 'number' || value === 'percent' || value === 'currency';
}

/**
 * G396 —— **每个字段类型都有自己的图标**（官方那几张）：
 * `email→envelope`、`phone→phone`、`person→at-sign`、未知→`objects-placeholder`。
 * 其余类型在官方名册里没有单独点名，这里只保证"有图标可画"：给了 fallback，不发明新名字。
 */
export const FIELD_TYPE_ICONS: Record<string, string> = {
  email: 'envelope',
  phone: 'phone',
  person: 'at-sign',
  text: 'text',
  number: 'hashtag',
  checkbox: 'checkbox',
  date: 'calendar',
  url: 'link',
  select: 'chevron-down',
  multiSelect: 'list',
  media: 'image',
  relation: 'arrow-right-left',
  linkToBlock: 'link-2',
  formula: 'sigma',
  created_at: 'calendar-clock',
  updated_at: 'clock',
};

export const UNKNOWN_FIELD_ICON = 'objects-placeholder';

/** 字段类型 → 图标名；未知类型给 `objects-placeholder`（不返回空串，调用点总有一枚可画）。 */
export function fieldIconFor(type: unknown): string {
  if (typeof type !== 'string') return UNKNOWN_FIELD_ICON;
  return FIELD_TYPE_ICONS[type] ?? UNKNOWN_FIELD_ICON;
}

/**
 * G396 —— 按子格式渲染数字：`percent` 加百分号（值 0.5 ⇒ 50%），`currency` 加货币符号
 * （本地用 `¥`，与产品语言一致），`number` 原样（带千分位）。
 * 非数字给空串（不印 `NaN`）。
 */
export function formatNumber(value: unknown, format: NumberFormat = DEFAULT_NUMBER_FORMAT): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  if (format === 'percent') {
    const pct = n * 100;
    return `${pct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }
  if (format === 'currency') {
    return `¥${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 10 });
}
