/** G171 —— 忽略规则那一组的官方文案（逐字取自 `feature-catalog.md`）。 */

export const IGNORE_LIST_TITLE = '忽略列表';
export const IGNORE_LIST_DESC = '这里的任何内容都不会出现在你的标签列表中，即使带有 #。';
export const TEXT_TO_IGNORE = '要忽略的文本';
export const ADD_RULE_LABEL = '添加规则';
export const TAG_ADDED_TO_IGNORE_LIST = '标签已添加到忽略列表。你可以在“设置”中管理它';
export const IGNORED_BY_RULE_PREFIX = '被自定义规则忽略的标签：';

export function ignoredByRuleLabel(names: readonly string[]): string {
  return `${IGNORED_BY_RULE_PREFIX}${names.join('、')}`;
}

/** `tags.delete.rule.message`「你确定要删除"[0]"吗？」。 */
export function deleteRuleMessage(text: string): string {
  return `你确定要删除"${text}"吗？`;
}