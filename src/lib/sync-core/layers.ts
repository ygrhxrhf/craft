/**
 * G342: the official sync debug panel is organised by **object layer** — ten sections, each its
 * own path, with `Sync Patch` and `Local Patch` as two separate tracks.
 *
 * Locally a whole document is one sync unit, so the layers are not implemented; what is recorded
 * here is the official section list, so a future layering change has one place to key on and the
 * ledger's ten names cannot drift.
 */
export const SYNC_LAYERS = [
  'Indices',
  'Sync Patch',
  'Local Patch',
  'Objects',
  'Sub Tier',
  'Comments',
  'Requests',
  'Blocks',
  'Object Links',
  'Meta Objects',
] as const;

export type SyncLayer = (typeof SYNC_LAYERS)[number];

/** The two patch tracks are separate: one for what the server sent, one for what this device did. */
export const PATCH_TRACKS = ['Sync Patch', 'Local Patch'] as const;

export function isPatchTrack(layer: SyncLayer): boolean {
  return (PATCH_TRACKS as readonly string[]).includes(layer);
}

/**
 * G342: each layer is its own **path**, not a slice of one document blob. The official debug panel
 * lists them because a change travels per layer; locally a whole document is one unit. This table
 * gives every layer a named path so a future layering change has one place to key on, and a reader
 * can see which layers have a local counterpart today.
 */
export interface SyncLayerPath {
  layer: SyncLayer;
  /** The wire path this layer travels on (official section name, lower-cased for a path). */
  path: string;
  /** Whether the local build has a per-layer path today (`false` = the whole doc is one unit). */
  implemented: boolean;
  /** What the layer carries. */
  carries: string;
}

export const SYNC_LAYER_PATHS: readonly SyncLayerPath[] = [
  { layer: 'Indices', path: 'indices', implemented: false, carries: '索引' },
  { layer: 'Sync Patch', path: 'sync-patch', implemented: false, carries: '服务端补丁' },
  { layer: 'Local Patch', path: 'local-patch', implemented: false, carries: '本地补丁' },
  { layer: 'Objects', path: 'objects', implemented: false, carries: '对象' },
  { layer: 'Sub Tier', path: 'sub-tier', implemented: false, carries: '子层' },
  { layer: 'Comments', path: 'comments', implemented: true, carries: '评论' },
  { layer: 'Requests', path: 'requests', implemented: true, carries: '访问请求' },
  { layer: 'Blocks', path: 'blocks', implemented: true, carries: '块' },
  { layer: 'Object Links', path: 'object-links', implemented: false, carries: '对象链接' },
  { layer: 'Meta Objects', path: 'meta-objects', implemented: false, carries: '元对象' },
] as const;

/** The layers with a real local path today (comments / requests / blocks travel as their own tables). */
export function implementedLayers(): SyncLayerPath[] {
  return SYNC_LAYER_PATHS.filter((entry) => entry.implemented);
}

/** The layers still folded into the whole-document unit. */
export function foldedLayers(): SyncLayerPath[] {
  return SYNC_LAYER_PATHS.filter((entry) => !entry.implemented);
}

export function layerPath(layer: SyncLayer): string | null {
  return SYNC_LAYER_PATHS.find((entry) => entry.layer === layer)?.path ?? null;
}
