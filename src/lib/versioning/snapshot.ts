const VERSION_META_FIELDS = ['icon', 'coverImage', 'coverType', 'width', 'pageStyle'] as const;

export const METADATA_VERSION_FIELDS = ['title', ...VERSION_META_FIELDS] as const;

export const CONTENT_VERSION_FIELDS = ['content', 'plainText', 'wordCount'] as const;

export const VERSION_FIELDS: readonly string[] = [
  ...METADATA_VERSION_FIELDS,
  ...CONTENT_VERSION_FIELDS,
];

// 只改正文时每十分钟最多存一版。这个窗口原先硬编码在 update.ts 里，搬到这儿好测。
export const VERSION_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Postgres gives `jsonb` back in its own key order, so two writes of the same object
 * must still compare equal — stringify with sorted keys instead of trusting insertion order.
 */
function stable(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, inner]) => `${JSON.stringify(key)}:${stable(inner)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * `DocumentVersion.content` cannot be null, so a document with no body is stored as an
 * empty doc node while its row keeps `null`. Those are one state, and reading them as two
 * would make every later snapshot report a body change that never happened.
 */
function comparable(value: unknown): unknown {
  if (value && typeof value === 'object' && (value as Record<string, unknown>).type === 'doc') {
    const blocks = (value as Record<string, unknown>).content;
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
  }
  return value;
}

export function changedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  keys: readonly string[] = VERSION_FIELDS,
): string[] {
  return keys.filter((key) => stable(comparable(before?.[key])) !== stable(comparable(after?.[key])));
}

/**
 * A title or style edit is worth a version the moment it happens; a content edit is only
 * worth one once the previous snapshot is old, because content changes on every keystroke.
 */
export function shouldSnapshot(
  changed: readonly string[],
  lastCreatedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (changed.length === 0) return false;
  if (changed.some((key) => (METADATA_VERSION_FIELDS as readonly string[]).includes(key))) return true;
  if (!lastCreatedAt) return true;

  const then = new Date(lastCreatedAt).getTime();
  if (Number.isNaN(then)) return true;
  return now - then >= VERSION_INTERVAL_MS;
}

export function versionMeta(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(VERSION_META_FIELDS.map((key) => [key, row[key] ?? null]));
}

