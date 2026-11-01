import { describe, expect, it } from 'vitest';

import { CONFLICT_LOG_LEVEL, decideConflict, isEmptyPatch } from './conflict-criterion';

describe('decideConflict (G440)', () => {
  it('merges when there are local changes and the server patch index lags', () => {
    expect(decideConflict({ localBlocks: 3, localSyncIndex: 10, lastSyncPatchIndex: 7 })).toBe('merge');
  });

  it('adopts when there are no local changes', () => {
    expect(decideConflict({ localBlocks: 0, localSyncIndex: 10, lastSyncPatchIndex: 7 })).toBe('adopt');
  });

  it('adopts when the server is not behind', () => {
    expect(decideConflict({ localBlocks: 3, localSyncIndex: 7, lastSyncPatchIndex: 7 })).toBe('adopt');
    expect(decideConflict({ localBlocks: 3, localSyncIndex: 5, lastSyncPatchIndex: 7 })).toBe('adopt');
  });

  it('the two conditions are conjunctive', () => {
    expect(decideConflict({ localBlocks: 0, localSyncIndex: 0, lastSyncPatchIndex: 0 })).toBe('adopt');
  });
});

describe('isEmptyPatch (G440)', () => {
  it('treats a missing or blockless patch as empty', () => {
    expect(isEmptyPatch(null)).toBe(true);
    expect(isEmptyPatch(undefined)).toBe(true);
    expect(isEmptyPatch({})).toBe(true);
    expect(isEmptyPatch({ blocks: [] })).toBe(true);
  });

  it('a patch with blocks is not empty', () => {
    expect(isEmptyPatch({ blocks: [{}] })).toBe(false);
  });
});

describe('the conflict log level (G440)', () => {
  it('is warn, not error', () => {
    expect(CONFLICT_LOG_LEVEL).toBe('warn');
  });
});
