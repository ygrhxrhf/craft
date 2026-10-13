import { describe, expect, it } from 'vitest';

import { OFFLINE_ADD_REACTION, OFFLINE_REMOVE_REACTION, offlineReactionMessage } from './offline-reaction';

describe('the offline refusal', () => {
  it('says adding when the person has not reacted', () => {
    expect(offlineReactionMessage(false)).toBe(OFFLINE_ADD_REACTION);
  });

  it('says removing when they already have', () => {
    expect(offlineReactionMessage(true)).toBe(OFFLINE_REMOVE_REACTION);
  });
});
