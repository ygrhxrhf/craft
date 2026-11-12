import { extractBlocks } from './extract';

/**
 * G1419：官方完整结果页的每条文档都带命中数（第 419 批逐字 `Craft Handbook 50+`／
 * `Welcome to Craft 1`／`无标题 3`／`Watch: how to videos 22`／`Quick Start: get going 9`）。
 *
 * `50+` 是**采样到的显示约定**，不是证过的常量：只知道超过某值就显示 `50+`，边界值没采到。
 * 这里把 50 落成显示上限——计数超过它时补 `+`，否则原样显示。
 */
export const HIT_COUNT_DISPLAY_CAP = 50;

/** 显示用的命中数：超过上限写成 `50+`。0 或非数写成 `0`。 */
export function hitCountLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0';
  const whole = Math.floor(count);
  return whole > HIT_COUNT_DISPLAY_CAP ? `${HIT_COUNT_DISPLAY_CAP}+` : String(whole);
}

/** Case-insensitive, non-overlapping occurrences — no regex, so a query like `a.b` is literal. */
export function countOccurrences(text: string, needle: string): number {
  if (!text || !needle) return 0;
  const haystack = text.toLowerCase();
  const target = needle.toLowerCase();
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(target, from);
    if (at === -1) return count;
    count += 1;
    from = at + target.length;
  }
}

/**
 * A document's hit count: occurrences in the title plus in each indexed top-level block.
 * The block set is the same one the block search reads (`extractBlocks`), so a card's count
 * and the panel's block hits describe the same text.
 */
export function documentHitCount(content: unknown, title: string, query: string): number {
  const needle = query.trim();
  if (!needle) return 0;
  let total = countOccurrences(title, needle);
  for (const block of extractBlocks(content)) {
    total += countOccurrences(block.text, needle);
  }
  return total;
}
