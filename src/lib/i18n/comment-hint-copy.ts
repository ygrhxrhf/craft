/**
 * G320：评论输入框下那四条**带 `<highlight>` 标签**的提示。逐字取自
 * `_harvest/i18n-zh.tsv:3909-3912`；渲染走 `RichText`（`<highlight>` 出高亮、不打印标签）。
 */
export const COMMENT_HINT_EMOJI = { key: 'web.collab.comment.hint.emoji', template: '输入<highlight>[0]</highlight>或其他字符即可快速获取表情符号' } as const;
export const COMMENT_HINT_MENTION = { key: 'web.collab.comment.hint.mention', template: '输入<highlight>@</highlight>来提及某人' } as const;
export const COMMENT_HINT_NEW_LINE = { key: 'web.collab.comment.hint.new.line', template: '按<highlight>Shift + Enter</highlight>添加新行' } as const;
export const COMMENT_HINT_SEND = { key: 'web.collab.comment.hint.send.comment', template: '按<highlight>Enter</highlight>发送评论' } as const;

export const COMMENT_HINTS = [
  COMMENT_HINT_EMOJI,
  COMMENT_HINT_MENTION,
  COMMENT_HINT_NEW_LINE,
  COMMENT_HINT_SEND,
] as const;

/** 表情那条的 `[0]` 填成触发字符（本地是 `:`）。 */
export function commentHintEmoji(trigger: string): string {
  return COMMENT_HINT_EMOJI.template.replace('[0]', trigger);
}
