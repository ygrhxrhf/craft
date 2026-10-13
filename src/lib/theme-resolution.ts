/**
 * The colour-scheme resolution chain (G1205 / G1206). Four levels, highest first:
 *
 *   1. a feature flag forcing dark or light
 *   2. the URL override — the official build ships `?dark` / `?light` / `?system`
 *   3. the stored value, where "follow the system" is stored as `null`
 *   4. the system preference
 *
 * The stored value's default is `"system"`, which is deliberately *not* a member of the
 * `light | dark` enum: the setter stores `null` for it, so the enum only ever holds a forced
 * choice.
 */
export type ResolvedScheme = 'light' | 'dark';
export type StoredScheme = 'light' | 'dark' | null;

export const FORCED_DARK_FLAG = 'forceDark';
export const FORCED_LIGHT_FLAG = 'forceLight';

/** The three URL switches, verbatim. Any other value is not an override. */
export const URL_OVERRIDES = ['dark', 'light', 'system'] as const;
export type UrlOverride = (typeof URL_OVERRIDES)[number] | null;

/** Read the URL override from a query string: `?dark` / `?light` / `?system`, else null. */
export function readUrlOverride(search: string): UrlOverride {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  if (params.has('dark')) return 'dark';
  if (params.has('light')) return 'light';
  if (params.has('system')) return 'system';
  return null;
}

/**
 * What the setter stores for a picked value: `system` becomes `null`, everything else passes
 * through. The enum only ever holds a forced choice.
 */
export function storeScheme(picked: 'light' | 'dark' | 'system'): StoredScheme {
  return picked === 'system' ? null : picked;
}

export interface ResolveInput {
  /** A feature flag that forces a scheme, if any. */
  forced?: ResolvedScheme | null;
  /** The URL override, or null when the URL says nothing. */
  url?: UrlOverride;
  /** The stored value, where null means "follow the system". */
  stored?: StoredScheme;
  /** The system preference. */
  system: ResolvedScheme;
}

/** Resolve the scheme through the four levels. */
export function resolveScheme({ forced, url, stored, system }: ResolveInput): ResolvedScheme {
  if (forced) return forced;
  if (url === 'dark' || url === 'light') return url;
  if (stored) return stored;
  return system;
}
