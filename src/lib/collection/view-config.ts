/**
 * G81 — official view config is a closed 20-key schema (`STORED_VIEW_KNOWN_KEYS`,
 * `protocol.md` §二). Local keeps two legacy aliases (`sorts`, `showSummaryRow`) that predate
 * the schema; both are preserved so an existing view does not lose its sort rules.
 *
 * The schema is what gets persisted. Features that expose an individual key (column width,
 * gallery card size, kanban group order …) read it from here; keys whose UI has not been built
 * yet still round-trip at their defaults instead of disappearing on the next save.
 */
export const VIEW_CONFIG_KEYS = [
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
] as const;

/** Local-only aliases kept for existing rows (`sorts` predates `sortBy`). */
export const LEGACY_VIEW_CONFIG_KEYS = ['sorts', 'showSummaryRow'] as const;

export type ViewConfigKey = (typeof VIEW_CONFIG_KEYS)[number];
export type ViewConfig = Partial<Record<ViewConfigKey, unknown>> &
  Partial<Record<(typeof LEGACY_VIEW_CONFIG_KEYS)[number], unknown>>;

const KNOWN = new Set<string>([...VIEW_CONFIG_KEYS, ...LEGACY_VIEW_CONFIG_KEYS]);

/** Parse a stored config (object or JSON string); a broken string reads as an empty config. */
export function parseViewConfig(value: unknown): ViewConfig {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ViewConfig;
}

/**
 * Keep only the schema's keys (plus the two legacy aliases). Unknown keys are dropped so a typo
 * cannot silently become part of the stored contract, which is exactly how the official
 * `STORED_VIEW_KNOWN_KEYS` list behaves.
 */
export function normalizeViewConfig(value: unknown): ViewConfig {
  const source = parseViewConfig(value);
  const out: ViewConfig = {};
  for (const [key, entry] of Object.entries(source)) {
    if (KNOWN.has(key)) (out as Record<string, unknown>)[key] = entry;
  }
  return out;
}

/** The 20-key shape a new view starts from, per view type. */
export function defaultViewConfig(type: string): ViewConfig {
  const config: ViewConfig = {
    filters: [],
    sortBy: [],
    groupBy: null,
    hiddenProperties: [],
    customPropertyOrder: [],
    columnWidth: {},
    calculations: {},
    isCalculationsRowVisible: false,
  };
  if (type === 'gallery') {
    config.galleryCardSize = 'small';
    config.galleryPreviewType = 'cover';
    config.galleryShowsAllFields = false;
    config.visibleGalleryFields = [];
    config.galleryConfig = {};
  }
  if (type === 'kanban') {
    config.kanbanConfig = {};
    config.kanbanHiddenGroupValues = [];
    config.kanbanColumnOrder = [];
  }
  if (type === 'table') config.tableConfig = {};
  return config;
}