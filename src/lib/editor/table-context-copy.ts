/** G34：官方 `table.alert.actions.unavailable` 逐字。 */
export const TABLE_CONTEXT_UNAVAILABLE = '这些操作无法通过上下文菜单执行。';

/** G34：官方 `table.alert.actions.use.x.to.y` 模板 `请使用 [0] 来 [1]`。 */
export function tableRedirectCopy(tool: string, action: string): string {
  return `请使用${tool}来${action}`;
}
