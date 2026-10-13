/**
 * The Kanban guard sentence (G232). With no grouping property the view is not blank — it points
 * at the action to take, in the collected wording.
 */
export const KANBAN_NO_GROUP_PROPERTY = '添加一个支持的属性并按其分组以使用 Kanban 视图。';
export const KANBAN_NO_GROUP_PROPERTY_KEY = 'kanban_no_group_property';

/** Whether a property type can group a Kanban board. */
export function canGroupKanban(propertyType: string): boolean {
  return propertyType === 'select';
}
