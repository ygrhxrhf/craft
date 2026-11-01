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
