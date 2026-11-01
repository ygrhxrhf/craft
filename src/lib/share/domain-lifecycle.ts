/**
 * Custom-domain lifecycle (G168). Three tiers and four states.
 *
 * The tiers are what a share link can live on: the default `craft.me`, a custom Craft subdomain
 * (Plus), or an external domain (Business). The lifecycle is 未设置 → 已声明(等验证) → 已验证 →
 * 已断开, and disconnecting falls back to `craft.me`.
 *
 * The panel does not disable an unavailable combination — it attaches the reason as text. Two
 * reasons are collected: an external domain cannot be used with email access, and enabling email
 * access requires falling back to `craft.me` first.
 */

export type DomainTier = 'defaultCraft' | 'customCraft' | 'external';

export interface DomainTierInfo {
  /** The internal name the mapping uses. */
  id: string;
  /** What the link host looks like. */
  host: string;
  /** The plan the tier needs, when it needs one. */
  plan?: 'plus' | 'business';
}

export const DOMAIN_TIERS: Record<DomainTier, DomainTierInfo> = {
  defaultCraft: { id: 'default-craft', host: 'craft.me' },
  customCraft: { id: 'custom-craft', host: 'craft.me', plan: 'plus' },
  external: { id: 'external', host: '', plan: 'business' },
};

export type DomainState = 'unset' | 'declared' | 'verified' | 'disconnected';

/** The DNS state machine's two visible states. */
export const DNS_STATES = {
  verifying: '正在验证 DNS…',
  verified: '已验证 DNS',
} as const;

export const DNS_STATE_KEYS = {
  verifying: 'dns.verifying',
  verified: 'dns.verified',
} as const;

export const DNS_ERROR_TITLE = '找不到 DNS 配置';
export const DNS_ERROR_SUBTITLE = '请稍后重试或联系支持人员';

export const DISCONNECT_DESC =
  '断开后，共享页面将在 craft.me 域上可用，但你可以设置一个新的自定义域。';
export const DISCONNECT_DESC_KEY = 'disconnect.custom.domain.description';
export const DISCONNECT_CONFIRM = '你确定要继续吗？';

/** The two reasons a combination is unavailable, verbatim. */
export const EXTERNAL_DOMAIN_EMAIL_CONFLICT = '外部域名不能与邮箱访问限制同时使用。';
export const EXTERNAL_DOMAIN_EMAIL_CONFLICT_KEY = 'external.domain.access.restriction';

export const EMAIL_REVERT_TO_CRAFT =
  '要启用电子邮件访问，你必须恢复到此特定文档的默认 craft.me 链接。';
export const EMAIL_REVERT_TO_CRAFT_KEY = 'email.access.revert.to.craft';

/**
 * The reason a tier cannot be used with email access, or null when the combination is fine. An
 * external domain and email access exclude each other.
 */
export function tierEmailConflict(tier: DomainTier, emailAccess: boolean): string | null {
  return tier === 'external' && emailAccess ? EXTERNAL_DOMAIN_EMAIL_CONFLICT : null;
}

/** Where a link lands after disconnecting: back on the default craft.me host. */
export function hostAfterDisconnect(): string {
  return DOMAIN_TIERS.defaultCraft.host;
}

/**
 * G183: the DNS record table the external-domain page shows, with its two column headers and the
 * "I've added the DNS records" action — all verbatim from `_harvest/i18n-zh.tsv:3545-3551`.
 */
export const DNS_RECORD_TABLE = {
  title: 'DNS 记录',
  titleKey: 'teamsettings.external.domain.dns.record',
  nameColumn: '名称 / 主机',
  nameColumnKey: 'teamsettings.external.domain.name.host',
  valueColumn: '值 / 指向',
  valueColumnKey: 'teamsettings.external.domain.value.points.to',
  addedAction: '我已添加 DNS 记录',
  addedActionKey: 'teamsettings.external.domain.added.dns.records',
} as const;

/** The two page titles the external-domain page carries. */
export const DOMAIN_PAGE_TITLES = {
  active: { key: 'teamsettings.external.domain.title.active', label: '外部域名详情' },
  modify: { key: 'teamsettings.external.domain.title.modify', label: '修改你的域名 DNS 设置' },
} as const;

/** The "no DNS config found" copy (a distinct failure from the two-state error). */
export const NO_DNS_FOUND = '未找到此域名的 DNS 配置。请在此处联系我们。';
export const NO_DNS_FOUND_KEY = 'teamsettings.external.domain.no.dns.found';

/** One row of the DNS table: what the user must add at their registrar. */
export interface DnsRecord {
  name: string;
  value: string;
}

/**
 * G183: the four-state lifecycle transitions. `declared` (the user says the records are in) moves
 * to `verifying`; the probe then lands on `verified` or back to `declared` (not found). Disconnect
 * from any live state falls back to `unset` with the craft.me host.
 */
export type DomainTransition = 'declare' | 'verify-ok' | 'verify-fail' | 'disconnect';

export function nextDomainState(state: DomainState, transition: DomainTransition): DomainState {
  switch (transition) {
    case 'declare':
      return state === 'unset' || state === 'disconnected' ? 'declared' : state;
    case 'verify-ok':
      return state === 'declared' ? 'verified' : state;
    case 'verify-fail':
      // A failed probe returns to `declared` so the user can fix the records and retry.
      return state === 'declared' ? 'declared' : state;
    case 'disconnect':
      return state === 'unset' ? 'unset' : 'disconnected';
  }
}
