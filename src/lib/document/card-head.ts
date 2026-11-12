/**
 * The grid card's head (G250). The collected card renders the title, then **one** inline subtitle
 * line — the location and the update time share it, separated by a bullet:
 *
 *   title / 📁 日记 • 已更新 14 小时前
 *
 * Two details are easy to get wrong. The update time is a **relative** time with a verb
 * (`daily.updated.x` = 「已更新 [0]」), not a bare date. And an untitled document's placeholder is
 * rendered in **italic grey** — the card is telling the reader "this has no name yet", which a
 * normal-weight title would not.
 */

import { relativeTime } from '@/lib/document/relative-time';
import { untitledFor } from '@/lib/document/untitled-copy';

/** The verb in front of the relative time, verbatim (`daily.updated.x`). */
export const UPDATED_PREFIX = '已更新';
export const UPDATED_KEY = 'daily.updated.x';

/** The separator between breadcrumb nodes on a card. */
export const CARD_CRUMB_SEPARATOR = '•';

export interface CardHeadInput {
  /** The stored title; empty means the document has never been named. */
  title: string;
  /** The document's updated timestamp, ISO. */
  updatedAt: string;
  /**
   * The location breadcrumb, already resolved to one line. The join and the fallback chain live in
   * `location-path.ts` (`locationPathLabel`) so the card and the info panel cannot drift apart —
   * this module only decides *whether* to show the line.
   */
  breadcrumb?: string | null;
}

/** Whether the card is showing a placeholder rather than a real name. */
export function isUntitled(title: string): boolean {
  return title.trim().length === 0;
}

/**
 * The title line. An untitled document gets the collected placeholder; the caller styles it italic
 * grey off `isUntitled`, which is why the flag is returned alongside rather than inferred twice.
 */
export function cardTitle(title: string): { text: string; placeholder: boolean } {
  const placeholder = isUntitled(title);
  return { text: placeholder ? untitledFor('list') : title, placeholder };
}

/** The update line: 「已更新 14 小时前」, relative to `now`. */
export function cardUpdatedLabel(updatedAt: string, now: number = Date.now()): string {
  const relative = relativeTime(updatedAt, now);
  if (!relative) return '';
  return `${UPDATED_PREFIX} ${relative}`;
}

/**
 * The single subtitle line under the title: `breadcrumb • 已更新 1 小时前`, with the bullet only
 * when both parts exist. The collected card shows one line, not two stacked ones — an empty part
 * simply disappears rather than leaving a dangling separator.
 */
export function cardSubtitle(input: { breadcrumb: string | null; updated: string }): string {
  return [input.breadcrumb, input.updated].filter((part): part is string => !!part).join(` ${CARD_CRUMB_SEPARATOR} `);
}

/** The whole head, so a caller can render it without re-deriving the pieces. */
export function cardHead(input: CardHeadInput, now: number = Date.now()): {
  title: string;
  placeholder: boolean;
  breadcrumb: string | null;
  updated: string;
  subtitle: string;
} {
  const { text, placeholder } = cardTitle(input.title);
  const breadcrumb = input.breadcrumb?.trim() ? input.breadcrumb : null;
  const updated = cardUpdatedLabel(input.updatedAt, now);
  return {
    title: text,
    placeholder,
    breadcrumb,
    updated,
    subtitle: cardSubtitle({ breadcrumb, updated }),
  };
}
