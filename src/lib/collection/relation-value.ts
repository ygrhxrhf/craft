/**
 * G470: the official relation cell is `{type:"relation", objectListId, items}`, and the target
 * collection lives in `property.config.objectListId`.
 *
 * Local documents written before this change hold a bare `string[]` and name the target
 * `collectionId`, so both spellings are read and the official one is written. Nothing here
 * guesses a target: an unconfigured relation stays inert.
 */

export interface RelationValue {
  type: 'relation';
  objectListId: string | null;
  items: string[];
}

interface RelationConfig {
  objectListId?: unknown;
  collectionId?: unknown;
}

function configOf(config: unknown): RelationConfig {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      const parsed: unknown = JSON.parse(config);
      return parsed && typeof parsed === 'object' ? (parsed as RelationConfig) : {};
    } catch {
      return {};
    }
  }
  return typeof config === 'object' ? (config as RelationConfig) : {};
}

/** The collection a relation column points at; the official key wins over the legacy one. */
export function relationTargetId(config: unknown): string | null {
  const parsed = configOf(config);
  const id = parsed.objectListId ?? parsed.collectionId;
  return typeof id === 'string' && id ? id : null;
}

/** The item ids a stored value carries, whichever shape it is in. */
export function relationItems(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  if (value && typeof value === 'object') {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

/** Normalize a stored value into the official shape, or `null` when there is nothing to store. */
export function parseRelationValue(value: unknown, objectListId: string | null): RelationValue | null {
  const items = relationItems(value);
  if (items.length === 0) return null;
  return { type: 'relation', objectListId, items };
}

/** The value to persist for a picked item set: empty means the cell is cleared, not `[]`. */
export function buildRelationValue(objectListId: string | null, items: readonly string[]): RelationValue | null {
  const kept = items.filter((entry) => typeof entry === 'string' && entry);
  if (kept.length === 0) return null;
  return { type: 'relation', objectListId, items: kept };
}
