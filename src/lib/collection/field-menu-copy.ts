/**
 * 集合字段（列）管理文案（G1537），每个串停在它必须逐字匹配的 i18n key 旁边，
 * 好让 ledger-as-source 测试从 `feature-catalog.md` 读回比对——与 `src/lib/tag/official-copy.ts` 同一规矩。
 *
 * 官方把字段管理拆成两处承载面，这里照办：
 * ① 单列菜单＝`collections.edit.field`「编辑字段」＋`collections.hide.fields`「隐藏字段」＋删除确认句
 *    `alert.delete.field.desc`「你确定要删除该字段吗？」；
 * ② 视图工具条＝`collections.hide.order.fields`「隐藏和排序字段」（官方与「添加筛选器」「添加排序条件」
 *    同处一排），面板里的显示切换用 `collections.show.hide.fields`「显示/隐藏字段」，
 *    隐藏计数用 `collections.one.hidden.field`／`collections.x.hidden.fields`。
 *
 * ☆ 排序机制本身没有官方 key：官方是拖拽，本地用上移/下移两枚按钮，故那两枚按钮的可及名是
 *   描述性中文（与 `aria-label="集合操作"` 同一档），**不冒充**官方文案。
 */
export const EDIT_FIELD_KEY = 'collections.edit.field';
export const EDIT_FIELD = '编辑字段';

export const FIELD_NAME_KEY = 'collections.field.name';
export const FIELD_NAME = '字段名称';

export const HIDE_FIELDS_KEY = 'collections.hide.fields';
export const HIDE_FIELDS = '隐藏字段';

export const SHOW_HIDE_FIELDS_KEY = 'collections.show.hide.fields';
export const SHOW_HIDE_FIELDS = '显示/隐藏字段';

export const HIDE_ORDER_FIELDS_KEY = 'collections.hide.order.fields';
export const HIDE_ORDER_FIELDS = '隐藏和排序字段';

export const DELETE_FIELD_DESC_KEY = 'alert.delete.field.desc';
export const DELETE_FIELD_DESC = '你确定要删除该字段吗？';

/**
 * ☆ 这一枚**没有**官方 key：官方只给了删除确认句（`alert.delete.field.desc`），没给菜单项名。
 * 故它是本地描述性中文，不进 ledger-as-source 比对——别把它当官方串引用。
 */
export const DELETE_FIELD = '删除字段';

export const ONE_HIDDEN_FIELD_KEY = 'collections.one.hidden.field';
export const ONE_HIDDEN_FIELD = '1 个隐藏字段';

export const X_HIDDEN_FIELDS_KEY = 'collections.x.hidden.fields';
export const X_HIDDEN_FIELDS = '[0] 隐藏字段';

/** 官方是单复数两键（`one.hidden.field`／`x.hidden.fields`），[0] 处替换成数字。 */
export function formatHiddenFields(count: number): string {
  return count === 1 ? ONE_HIDDEN_FIELD : X_HIDDEN_FIELDS.replace('[0]', String(count));
}
