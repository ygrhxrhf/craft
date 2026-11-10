/**
 * G1558: the official markdown marks convert on the **space typed after** the closing marker, not at
 * the marker itself (`runs/wave1-24-*`, six mark strings each followed by a space). Mid-line markers
 * stay literal — `a **X** b` is untouched — so every pattern needs the line-start/space lookbehind
 * and the trailing-space anchor.
 */
export interface SpaceMarkRule {
  /** Schema mark name. `strike`, not `strikethrough` — the latter does not exist in this schema. */
  mark: 'bold' | 'italic' | 'code' | 'strike' | 'highlight' | 'link';
  find: RegExp;
  /** Capture group holding the marked text. */
  textGroup: number;
  /** Link is the only rule with a second capture. */
  hrefGroup?: number;
}

/** Order matters: the two-star form has to be tried before the one-star form. */
export const SPACE_MARK_RULES: readonly SpaceMarkRule[] = [
  { mark: 'bold', find: /(?<=^|\s)\*\*([^*]+)\*\*\s$/, textGroup: 1 },
  { mark: 'bold', find: /(?<=^|\s)__([^_]+)__\s$/, textGroup: 1 },
  { mark: 'italic', find: /(?<=^|\s)\*([^*]+)\*\s$/, textGroup: 1 },
  { mark: 'italic', find: /(?<=^|\s)_([^_]+)_\s$/, textGroup: 1 },
  { mark: 'code', find: /(?<=^|\s)`([^`]+)`\s$/, textGroup: 1 },
  { mark: 'strike', find: /(?<=^|\s)~~([^~]+)~~\s$/, textGroup: 1 },
  { mark: 'highlight', find: /(?<=^|\s)==([^=]+)==\s$/, textGroup: 1 },
  // G878: `::text::` is the official highlight alias; `==text==` is the other spelling of the same slot.
  { mark: 'highlight', find: /(?<=^|\s)::([^:]+)::\s$/, textGroup: 1 },
  { mark: 'link', find: /(?<=^|\s)\[([^\]]+)\]\(([^)\s]+)\)\s$/, textGroup: 1, hrefGroup: 2 },
];

export interface SpaceMarkMatch {
  rule: SpaceMarkRule;
  /** Where the match starts inside `text` — the markers and the typed space are replaced from here. */
  start: number;
  length: number;
  text: string;
  href?: string;
}

/** Reads the text before the caret and returns the first rule the official table would fire. */
export function matchSpaceMarkRule(text: string): SpaceMarkMatch | null {
  for (const rule of SPACE_MARK_RULES) {
    const match = rule.find.exec(text);
    if (!match) continue;
    return {
      rule,
      start: match.index,
      length: match[0].length,
      text: match[rule.textGroup],
      href: rule.hrefGroup === undefined ? undefined : match[rule.hrefGroup],
    };
  }
  return null;
}
