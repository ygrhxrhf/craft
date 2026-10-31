/**
 * The field types the collection UI offers. One list, because the add menu, the type-change
 * menu and the server-side setter must agree on the vocabulary (G393/G299).
 */
export const PROPERTY_TYPES: readonly { value: string; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '单选' },
  { value: 'multi_select', label: '多选' },
  { value: 'date', label: '日期' },
  { value: 'checkbox', label: '勾选框' },
  { value: 'url', label: '链接' },
  { value: 'email', label: '邮箱' },
  { value: 'phone', label: '电话' },
  { value: 'person', label: '人员' },
  { value: 'file', label: '文件' },
  { value: 'relation', label: '关联' },
  { value: 'formula', label: '公式' },
];

export const PROPERTY_TYPE_VALUES = new Set(PROPERTY_TYPES.map((type) => type.value));
