import { beforeEach, describe, expect, it } from 'vitest';

import {
  consumeLinkRequest,
  requestLink,
  resetLinkRequestForTest,
  subscribeLinkRequests,
} from './use-link-request-store';

// G777: the editor raises a link request; the bubble menu consumes it.
describe('the link request store', () => {
  beforeEach(() => resetLinkRequestForTest());

  it('notifies subscribers and leaves one request to consume', () => {
    let seen = 0;
    const unsubscribe = subscribeLinkRequests(() => (seen += 1));
    requestLink();
    expect(seen).toBe(1);
    expect(consumeLinkRequest()).not.toBeNull();
    // Consuming clears it, so a second consumer gets nothing.
    expect(consumeLinkRequest()).toBeNull();
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    let seen = 0;
    const unsubscribe = subscribeLinkRequests(() => (seen += 1));
    unsubscribe();
    requestLink();
    expect(seen).toBe(0);
  });
});
