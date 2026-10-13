/**
 * Share publishing options (G143). Three axes that are independent of each other except for one
 * rule: search-engine indexing does nothing while a passcode is set, so the two are mutually
 * exclusive in effect. Indexing is off by default.
 *
 * Expiry is its own axis rather than a mode of the passcode: a link can carry a date, or never
 * expire, and the result sentence prints that date in the `[0]` slot.
 */

/** Indexing is off unless turned on. */
export const DEFAULT_ENABLE_SEO = false;

export const SEO_DESC = '启用后，此页面将显示在搜索引擎结果中，例如 Google。只有在没有提供密码的情况下才有效。';
export const SEO_DESC_KEY = 'enable.search.engine.desc';

export const EXPIRE_NEVER = '永不过期';
export const EXPIRE_NEVER_KEY = 'expire.never';

/** `expire.on` carries the date in a `[0]` slot. */
export const EXPIRE_ON_TEMPLATE = '于 [0] 过期';
export const EXPIRE_ON_KEY = 'expire.on';

export interface SharePublishing {
  passcode: string | null;
  /** ISO date, or null for "never". */
  expirationDate: string | null;
  enableSeo: boolean;
}

/** The default state a fresh share link starts in. */
export const DEFAULT_PUBLISHING: SharePublishing = {
  passcode: null,
  expirationDate: null,
  enableSeo: DEFAULT_ENABLE_SEO,
};

/**
 * Whether indexing actually takes effect. The switch may be on, but a passcode defeats it — which
 * is what the description sentence spells out.
 */
export function seoEffective(publishing: Pick<SharePublishing, 'passcode' | 'enableSeo'>): boolean {
  return publishing.enableSeo && !publishing.passcode;
}

/** The sentence describing the expiry: the date, or 「永不过期」. */
export function expiryLabel(expirationDate: string | null): string {
  if (!expirationDate) return EXPIRE_NEVER;
  return EXPIRE_ON_TEMPLATE.replace('[0]', expirationDate);
}

/** Whether the link has passed its expiry, given a moment. A null date never expires. */
export function isExpired(expirationDate: string | null, now: number = Date.now()): boolean {
  if (!expirationDate) return false;
  const at = Date.parse(expirationDate);
  return !Number.isNaN(at) && at <= now;
}
