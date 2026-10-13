/**
 * Hard quota numbers (G317 / G323). Two different 25s live side by side — a team may hold at most
 * 25 spaces, and a team may hold at most 25 members — so they are named separately here rather
 * than sharing a constant. File count and file size are independent limits, each parameterised.
 */

/** A team (and Business) may hold at most this many spaces. */
export const MAX_SPACES_PER_TEAM = 25;

/** A team may hold at most this many members. Distinct from the space cap, despite the same 25. */
export const MAX_TEAM_MEMBERS = 25;

/** A Family plan may hold at most this many members. */
export const MAX_FAMILY_MEMBERS = 5;

/** Backup retention, in days, by tier. */
export const BACKUP_RETENTION_DAYS = {
  standard: 30,
  extended: 180,
} as const;

/** The two independent file limits, each carrying its own slot values. */
export const FILE_LIMIT_FREE_TEMPLATE = 'big.file.free';
export const FILE_LIMIT_TIER_TEMPLATE = 'big.file.tier';
export const FILE_LIMIT_REQUEST_TEMPLATE = 'big.file.contact.us.message';

/** The block-quota echo: 「可用的 [1] 个区块中的 [0] 个」. */
export const BLOCK_LIMIT_USED_TEMPLATE = '可用的 [1] 个区块中的 [0] 个';
export const BLOCK_LIMIT_USED_KEY = 'block.limit.used';

export interface QuotaCheck {
  withinLimit: boolean;
  limit: number;
  remaining: number;
}

/** Whether another space fits, and how many remain. */
export function checkSpaceQuota(current: number): QuotaCheck {
  return {
    withinLimit: current < MAX_SPACES_PER_TEAM,
    limit: MAX_SPACES_PER_TEAM,
    remaining: Math.max(0, MAX_SPACES_PER_TEAM - current),
  };
}

/** Whether another team member fits, and how many remain. */
export function checkTeamSeatQuota(current: number): QuotaCheck {
  return {
    withinLimit: current < MAX_TEAM_MEMBERS,
    limit: MAX_TEAM_MEMBERS,
    remaining: Math.max(0, MAX_TEAM_MEMBERS - current),
  };
}

/** The block-quota echo for a used / total pair. */
export function blockQuotaLabel(used: number, total: number): string {
  return BLOCK_LIMIT_USED_TEMPLATE.replace('[0]', String(used)).replace('[1]', String(total));
}
