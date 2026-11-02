/**
 * G384／G1439 —— 文档卡片的**右键菜单共 7 项**（`panels.md` V48）：
 * `在新标签页中打开`／`复制链接`／`收藏`／`创建副本`／`移至`／`──`／`删除`。
 *
 * 三件结构性事实：
 *   1. 卡片**没有常驻 `⋯`**——入口只有右键（菜单项不挂在卡片的 hover 层上）；
 *   2. 「移至」后面有一条**分隔线**再跟「删除」——所以名册里要能表达分隔；
 *   3. 这是**卡片专属**的一套，与顶栏 `⋯`（11 项）、任务行 `⋯`（8 项）、
 *      普通文本块（9 项）、代码块（9 项）各自不同 ⇒ 不能共用一份菜单配置。
 */

export type DocumentCardMenuItemId =
  | 'openInNewTab'
  | 'copyLink'
  | 'favorite'
  | 'duplicate'
  | 'moveTo'
  | 'delete';

export interface DocumentCardMenuItem {
  id: DocumentCardMenuItemId;
  label: string;
  /** `true` ＝这一项前面画一条分隔线。 */
  separatedBefore?: boolean;
  /** 这一项是不是危险动作（红字）。 */
  danger?: boolean;
}

/** 七项名册（含那条分隔线的位置）。 */
export const DOCUMENT_CARD_MENU: readonly DocumentCardMenuItem[] = [
  { id: 'openInNewTab', label: '在新标签页中打开' },
  { id: 'copyLink', label: '复制链接' },
  { id: 'favorite', label: '收藏' },
  { id: 'duplicate', label: '创建副本' },
  { id: 'moveTo', label: '移至' },
  { id: 'delete', label: '删除', separatedBefore: true, danger: true },
] as const;

/** 卡片菜单的项数（含那枚分隔线那一格，官方数的是 7）。 */
export const DOCUMENT_CARD_MENU_SIZE = 7;

/** 渲染顺序里"分隔线"占一格 ⇒ 用于断言 7 这个数怎么来的。 */
export function documentCardMenuSlots(): Array<{ kind: 'item'; item: DocumentCardMenuItem } | { kind: 'separator' }> {
  const slots: Array<{ kind: 'item'; item: DocumentCardMenuItem } | { kind: 'separator' }> = [];
  for (const item of DOCUMENT_CARD_MENU) {
    if (item.separatedBefore) slots.push({ kind: 'separator' });
    slots.push({ kind: 'item', item });
  }
  return slots;
}

/** 「收藏」这一枚的标签随当前状态翻转（已收藏 ⇒ 取消收藏）。 */
export function favoriteLabel(isFavorite: boolean): string {
  return isFavorite ? '取消收藏' : '收藏';
}
