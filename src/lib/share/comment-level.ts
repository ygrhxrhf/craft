/**
 * G64 —— 私密链接的**访客评论权限三档**（`publishing.md:13` 的 `commentLevel`）：
 *
 *   `add`  访客可以添加评论   `toolbar.visitors.add.comments`
 *   `view` 访客可以查看评论   `toolbar.visitors.view.comments`
 *   `none` 不给访客评论（草稿态，语言包里没有专句）
 *
 * ★ 官方判定 `(level==="view" || level==="add")` ⇒ 面板上的「访客互动」分区**只在这两档下出现**；
 * `none` 时整组隐藏（不是禁用）。
 */

export const COMMENT_LEVELS = ['add', 'view', 'none'] as const;
export type CommentLevel = (typeof COMMENT_LEVELS)[number];

export const COMMENT_LEVEL_COPY: Record<CommentLevel, { label: string; key: string | null }> = {
  add: { label: '访客可以添加评论', key: 'toolbar.visitors.add.comments' },
  view: { label: '访客可以查看评论', key: 'toolbar.visitors.view.comments' },
  none: { label: '访客不能评论', key: null },
};

/** 官方默认：可添加评论。 */
export const DEFAULT_COMMENT_LEVEL: CommentLevel = 'add';

/** 面板上「访客互动」那一分区是否出现（官方只看 `view`／`add` 两档）。 */
export function visitorInteractionShown(level: CommentLevel): boolean {
  return level === 'view' || level === 'add';
}

/** 认一下读回来的值（老行缺列/脏值落默认）。 */
export function normalizeCommentLevel(raw: unknown): CommentLevel {
  return typeof raw === 'string' && (COMMENT_LEVELS as readonly string[]).includes(raw)
    ? (raw as CommentLevel)
    : DEFAULT_COMMENT_LEVEL;
}

/** 三档循环（面板上一个"点一下换一档"的开关用得到）。 */
export function nextCommentLevel(level: CommentLevel): CommentLevel {
  const index = COMMENT_LEVELS.indexOf(level);
  return COMMENT_LEVELS[(index + 1) % COMMENT_LEVELS.length];
}
