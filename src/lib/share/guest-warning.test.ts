import { describe, expect, it } from 'vitest';

import { GUEST_WARNING_DESC, GUEST_WARNING_KEY, needsGuestWarning } from './guest-warning';
import { hasHarvest, readHarvest } from '@/lib/craft-ref/harvest';

/**
 * G228: inviting a non-team-member is a guest invite, and the official build confirms it with a
 * consequence sentence. The warning text is harvested verbatim.
 */
describe.skipIf(!hasHarvest())('the guest invite warning (G228)', () => {
  it('carries the harvested sentence verbatim', () => {
    const harvest = readHarvest();
    const line = harvest.split(/\r?\n/).find((l) => l.startsWith(`${GUEST_WARNING_KEY}\t`));
    expect(line, `harvest has no ${GUEST_WARNING_KEY}`).toBeTruthy();
    expect(line!.split('\t')[1]).toBe(GUEST_WARNING_DESC);
  });

  it('warns only for a non-member (guest), not for a team member', () => {
    expect(needsGuestWarning('guest')).toBe(true);
    expect(needsGuestWarning('teamMember')).toBe(false);
  });

  it('states the consequence — access to the whole space, not just this document', () => {
    expect(GUEST_WARNING_DESC).toContain('访客可以访问整个空间并更新任何文档');
  });
});
