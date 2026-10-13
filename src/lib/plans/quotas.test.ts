import { describe, expect, it } from 'vitest';

import {
  BACKUP_RETENTION_DAYS,
  MAX_FAMILY_MEMBERS,
  MAX_SPACES_PER_TEAM,
  MAX_TEAM_MEMBERS,
  blockQuotaLabel,
  checkSpaceQuota,
  checkTeamSeatQuota,
} from './quotas';

/**
 * The hard quota numbers (G317 / G323), including the two different 25s.
 */
describe('the two 25s are separate caps', () => {
  it('caps spaces and members at 25 each, as distinct constants', () => {
    expect(MAX_SPACES_PER_TEAM).toBe(25);
    expect(MAX_TEAM_MEMBERS).toBe(25);
    // Same number, different axes — the ledger warns against collapsing them.
    expect(checkSpaceQuota(24).withinLimit).toBe(true);
    expect(checkSpaceQuota(25).withinLimit).toBe(false);
    expect(checkTeamSeatQuota(24).withinLimit).toBe(true);
    expect(checkTeamSeatQuota(25).withinLimit).toBe(false);
  });

  it('reports the remaining count without going negative', () => {
    expect(checkSpaceQuota(23).remaining).toBe(2);
    expect(checkSpaceQuota(30).remaining).toBe(0);
  });
});

describe('the family cap', () => {
  it('is five members', () => {
    expect(MAX_FAMILY_MEMBERS).toBe(5);
  });
});

describe('backup retention', () => {
  it('is 30 days standard and 180 extended', () => {
    expect(BACKUP_RETENTION_DAYS.standard).toBe(30);
    expect(BACKUP_RETENTION_DAYS.extended).toBe(180);
  });
});

describe('the block quota echo', () => {
  it('fills the used and total slots', () => {
    expect(blockQuotaLabel(120, 500)).toBe('可用的 500 个区块中的 120 个');
  });
});
