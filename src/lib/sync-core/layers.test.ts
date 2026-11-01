import { describe, expect, it } from 'vitest';

import { PATCH_TRACKS, SYNC_LAYERS, isPatchTrack } from './layers';

// G342: ten object layers, with two separate patch tracks.
describe('the sync layers', () => {
  it('lists the ten collected sections', () => {
    expect([...SYNC_LAYERS]).toEqual([
      'Indices', 'Sync Patch', 'Local Patch', 'Objects', 'Sub Tier',
      'Comments', 'Requests', 'Blocks', 'Object Links', 'Meta Objects',
    ]);
  });

  it('marks the two patch tracks', () => {
    expect([...PATCH_TRACKS]).toEqual(['Sync Patch', 'Local Patch']);
    expect(isPatchTrack('Sync Patch')).toBe(true);
    expect(isPatchTrack('Objects')).toBe(false);
  });
});
