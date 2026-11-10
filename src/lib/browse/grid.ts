/**
 * The browse grid geometry (G1096/G1126). The official layout computes its column count from the
 * container's own width rather than from viewport breakpoints, so collapsing the sidebar changes
 * the count — a breakpoint layout cannot do that.
 *
 * The constants, verbatim from the collected `_6sjpd_` module:
 *
 *   200 card base width · 20 desktop gap · 8 narrow gap · 16 side padding
 *   268 card width ceiling (three-plus columns) · 308.5 card width ceiling (two columns)
 *   5 column ceiling · 1/1.25 card aspect (height = width × 1.25)
 *   240×300 empty placeholder · 65 list row height
 *
 * Column count: `width < 452` gives 2; otherwise `floor((width − 32 + 20) / 220)` clamped to 2–5.
 *
 * G1126: the official build runs two formulas, not one. Its two-column layout measured a 308.5
 * card — past the 268 ceiling the denser layouts use — so the ceiling itself depends on the
 * column count. The 1.25 aspect holds in both (the second measured 1.242, a rounding tail).
 */
export const CARD_BASE_WIDTH = 200;
export const CARD_GAP = 20;
export const CARD_GAP_NARROW = 8;
export const SIDE_PADDING = 16;
export const CARD_MAX_WIDTH = 268;
/** G1126: the two-column layout's ceiling — the measured 308.5 card. */
export const CARD_MAX_WIDTH_WIDE = 308.5;
export const COLUMN_CEILING = 5;
export const CARD_ASPECT = 1 / 1.25;
export const EMPTY_PLACEHOLDER_WIDTH = 240;
export const EMPTY_PLACEHOLDER_HEIGHT = 300;
export const LIST_ROW_HEIGHT = 65;

/** The threshold below which the grid drops to two columns, verbatim `16*2 + 200*2 + 20`. */
export const NARROW_THRESHOLD = SIDE_PADDING * 2 + CARD_BASE_WIDTH * 2 + CARD_GAP;

export function columnsForWidth(width: number): number {
  if (!Number.isFinite(width) || width < NARROW_THRESHOLD) return 2;
  const raw = Math.floor((width - SIDE_PADDING * 2 + CARD_GAP) / (CARD_BASE_WIDTH + CARD_GAP));
  return Math.max(2, Math.min(raw, COLUMN_CEILING));
}

/** The card ceiling for the column count — the two-column tier is wider (G1126). */
export function cardMaxWidthForColumns(columns: number): number {
  return columns <= 2 ? CARD_MAX_WIDTH_WIDE : CARD_MAX_WIDTH;
}

/** Card width for a given container width: the even share of the row, capped by the tier ceiling. */
export function cardWidthForWidth(width: number): number {
  const columns = columnsForWidth(width);
  const available = width - SIDE_PADDING * 2 - (columns - 1) * CARD_GAP;
  return Math.min(available / columns, cardMaxWidthForColumns(columns));
}

/** The height a card takes at that width — the aspect is height = width × 1.25. */
export function cardHeightForWidth(width: number): number {
  return cardWidthForWidth(width) / CARD_ASPECT;
}
