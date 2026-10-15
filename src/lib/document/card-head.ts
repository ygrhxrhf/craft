/**
 * The grid card's head (G250). Three parts, in the order the collected screen shows them:
 *
 *   title / location breadcrumb (📁 日记 •) / 「已更新 14 小时前」
 *
 * Two details are easy to get wrong. The update line is a **relative** time with a verb
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
  /** Ancestor names root-first, already resolved by the caller. */
  breadcrumb?: readonly { icon?: string | null; title: string }[];
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

/** The breadcrumb line, or `null` when there is no ancestry to show. */
export function cardBreadcrumb(
  breadcrumb: CardHeadInput['breadcrumb'],
): string | null {
  if (!breadcrumb?.length) return null;
  return breadcrumb
    .map((node) => `${node.icon ? `${node.icon} ` : ''}${node.title}`)
    .join(` ${CARD_CRUMB_SEPARATOR} `);
}

/** The update line: 「已更新 14 小时前」, relative to `now`. */
export function cardUpdatedLabel(updatedAt: string, now: number = Date.now()): string {
  const relative = relativeTime(updatedAt, now);
  if (!relative) return '';
  return `${UPDATED_PREFIX} ${relative}`;
}

/** The whole head, so a caller can render it without re-deriving the pieces. */
export function cardHead(input: CardHeadInput, now: number = Date.now()): {
  title: string;
  placeholder: boolean;
  breadcrumb: string | null;
  updated: string;
} {
  const { text, placeholder } = cardTitle(input.title);
  return {
    title: text,
    placeholder,
    breadcrumb: cardBreadcrumb(input.breadcrumb),
    updated: cardUpdatedLabel(input.updatedAt, now),
  };
}
