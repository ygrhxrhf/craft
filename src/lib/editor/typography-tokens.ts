/**
 * The four typography token families (G1092). Values are verbatim from the collected
 * `tokens-css-assets.md` table; this module is the single source both the CSS generator and the
 * tests read, so a mistyped size cannot pass unnoticed.
 *
 * Each group is `[size, weight, line-height, letter-spacing]`. The ledger's two notable rules:
 *   - within one size, only `weight` changes — the other three are identical (ui family)
 *   - an `allcaps` variant is the only place a variant alters a non-transform value: the
 *     letter-spacing jumps from `.05px` to `.15px`
 */
export type TypeGroup = readonly [string, number, string, string];

export const UI_TOKENS: Record<string, TypeGroup> = {
  'xs-500': ['11px', 500, '13.2px', '.05px'],
  'sm-400': ['12px', 400, '14.4px', '.01px'],
  'sm-500': ['12px', 500, '14.4px', '.01px'],
  'md-400': ['13px', 400, '16px', '-.04px'],
  'md-500': ['13px', 500, '16px', '-.04px'],
  'md-600': ['13px', 600, '16px', '-.04px'],
  'lg-400': ['14px', 400, '16px', '-.09px'],
  'lg-500': ['14px', 500, '16px', '-.09px'],
  'lg-600': ['14px', 600, '16px', '-.09px'],
  'xl-400': ['15px', 400, '18px', '-.13px'],
  'xl-500': ['15px', 500, '18px', '-.13px'],
  'xl-600': ['15px', 600, '18px', '-.13px'],
  'xxl-400': ['16px', 400, '19.2px', '-.18px'],
  'xxl-500': ['16px', 500, '19.2px', '-.18px'],
  'xxl-600': ['16px', 600, '19.2px', '-.18px'],
};

export const HEADING_TOKENS: Record<string, TypeGroup> = {
  'xxs-600': ['11px', 600, '12px', '.05px'],
  'xs-500': ['12px', 500, '12px', '.01px'],
  'xs-600': ['12px', 600, '12px', '.05px'],
  'md-500': ['14px', 500, '16px', '-.09px'],
  'md-600': ['14px', 600, '16px', '-.09px'],
};

/** The two allcaps variants carry their own letter-spacing, which is the optical correction. */
export const HEADING_ALLCAPS: Record<string, string> = {
  'xxs-600': '.05px',
  'xs-600': '.15px',
};

export const CAPTION_TOKENS: Record<string, TypeGroup> = {
  'md-400': ['11px', 400, '16px', '.01px'],
  'md-500': ['11px', 500, '13.2px', '.05px'],
  'lg-400': ['12px', 400, '16px', '.05px'],
  'lg-500': ['12px', 500, '16px', '.01px'],
};

export const BODY_TOKENS: Record<string, TypeGroup> = {
  'md-400': ['13px', 400, '15.6px', '-.04px'],
  'md-500': ['13px', 500, '15.6px', '-.04px'],
  'md-600': ['13px', 600, '15.6px', '-.04px'],
};

export const BODY_ITALIC: Record<string, TypeGroup> = {
  'md-400-italic': ['13px', 400, '15.6px', '-.04px'],
  'md-500-italic': ['13px', 500, '15.6px', '-.04px'],
};

/** The 31 bridge-class names, in the official order. */
export const TYPOGRAPHY_CLASSES: readonly string[] = [
  ...Object.keys(UI_TOKENS).map((g) => `ui-${g}`),
  'heading-xxs-600',
  'heading-xxs-600-allcaps',
  'heading-xs-500',
  'heading-xs-600',
  'heading-xs-600-allcaps',
  'heading-md-500',
  'heading-md-600',
  ...Object.keys(CAPTION_TOKENS).map((g) => `caption-${g}`),
  ...Object.keys(BODY_TOKENS).map((g) => `body-${g}`),
  'body-md-400-italic',
  'body-md-500-italic',
];
