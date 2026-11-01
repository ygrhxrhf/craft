/**
 * G558/G565: the official URL scheme vocabulary is four entries —
 * `tex://` (formulas), `day://` (daily notes), `craftdocs://users` (user-level document paths)
 * and `craft://` (internal links such as `craft://credit`).
 *
 * `day://` carries a dot-separated, zero-padded date: `day://2026.09.27`.
 */

export const CRAFT_SCHEMES = ['tex', 'day', 'craftdocs', 'craft'] as const;
export type CraftScheme = (typeof CRAFT_SCHEMES)[number];

const SCHEME_SET = new Set<string>(CRAFT_SCHEMES);

export function isCraftScheme(value: unknown): value is CraftScheme {
  return typeof value === 'string' && SCHEME_SET.has(value);
}

/** The scheme of an href, or `null` when it is not one of ours. */
export function craftSchemeOf(href: unknown): CraftScheme | null {
  if (typeof href !== 'string') return null;
  const match = /^([a-z][a-z0-9+.-]*):\/\//i.exec(href);
  if (!match) return null;
  const scheme = match[1].toLowerCase();
  return isCraftScheme(scheme) ? scheme : null;
}

/** `day://2026.09.27` — the daily-note deep link for a local calendar day. */
export function dayNoteHref(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `day://${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** The local calendar day a `day://` link points at, or `null` when it is not one. */
export function parseDayNoteHref(href: unknown): Date | null {
  if (typeof href !== 'string') return null;
  const match = /^day:\/\/(\d{4})\.(\d{2})\.(\d{2})$/i.exec(href.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Where a craft link should navigate, in local routes. */
export function craftHrefTarget(href: unknown): string | null {
  const scheme = craftSchemeOf(href);
  if (scheme !== 'day') return null;
  const day = parseDayNoteHref(href);
  if (!day) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `/daily-notes?date=${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}
