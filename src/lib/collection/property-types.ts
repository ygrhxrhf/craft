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
