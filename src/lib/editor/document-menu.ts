/**
 * G1451 —— 文档级 `⋯` 弹层的**五分组名册**（官方组件 `hOn`，props `{docId, spaceId}`）。
 *
 * 逐字读出来的结构：
 *   - `styleSection`             → `pageStyle`「页面样式」
 *   - `navigationSection`        → `findInPage`「在页面中查找」／`tableOfContents`「目录」
 *   - `viewSection`              → `view`「视图」（★ `preventCloseOnClick: true` ＋右侧一枚图标）
 *   - `documentActionsSection`   → 运行时注入的一枚 ＋ `moveTo`「移至」
 *   - `documentManagementSection`→ `undo`「撤销/重做」＋ 上下文动态项（`...w.map(Lie)`）
 *
 * 三件容易抄错的：
 *   1. 文档级这枚是 `commands.move.to`「**移至**」，与块级 G1444 的「移动到…」是**两枚不同的键**；
 *   2. 「视图」那格点了**不关弹层**，而是把整份内容换成四枚（页面信息／任务／附件／评论）；
 *   3. 最后两组各有一枚"按当前上下文注入"的项 ⇒ 固定名册只能给到骨架，注入位要留。
 *
 * 几何：`sections: A`、`placement: 'bottom-end'`、`width: 216`。
 */

export type DocumentMenuGroupId =
  | 'styleSection'
  | 'navigationSection'
  | 'viewSection'
  | 'documentActionsSection'
  | 'documentManagementSection';

export interface DocumentMenuItem {
  id: string;
  label: string;
  /** 官方那个取词键，逐字。 */
  key: string;
  /** `true` ＝点了不关弹层（官方 `preventCloseOnClick`）。 */
  preventCloseOnClick?: boolean;
  /** 这一枚是"按上下文注入"的位，固定名册里不写具体动作。 */
  dynamic?: boolean;
}

export interface DocumentMenuSection {
  id: DocumentMenuGroupId;
  items: DocumentMenuItem[];
}

/** 五分组骨架（逐字文案取自语言包：page.style／commands.search.inpage／table.of.contents／view／commands.move.to／undo.redo）。 */
export const DOCUMENT_MENU_SECTIONS: readonly DocumentMenuSection[] = [
  {
    id: 'styleSection',
    items: [{ id: 'pageStyle', label: '页面样式', key: 'page.style' }],
  },
  {
    id: 'navigationSection',
    items: [
      { id: 'findInPage', label: '在页面中查找', key: 'commands.search.inpage' },
      { id: 'tableOfContents', label: '目录', key: 'table.of.contents' },
    ],
  },
  {
    id: 'viewSection',
    items: [{ id: 'view', label: '视图', key: 'view', preventCloseOnClick: true }],
  },
  {
    id: 'documentActionsSection',
    items: [
      // 官方这里第一枚是 `Lie(I)` 注入（本尺不定位它答什么），第二枚才是 moveTo。
      { id: 'injectedAction', label: '', key: '', dynamic: true },
      { id: 'moveTo', label: '移至', key: 'commands.move.to' },
    ],
  },
  {
    id: 'documentManagementSection',
    items: [
      { id: 'undo', label: '撤销/重做', key: 'undo.redo' },
      // `...w.map(Lie)` —— 末尾是上下文给的动态项。
      { id: 'dynamicTail', label: '', key: '', dynamic: true },
    ],
  },
] as const;

/**
 * 「视图」那栏的四枚（官方 `m` 为真时整份换成这一段）。
 * `pageInfo`／`comments` 走一条开栏通路，`tasks`／`attachments` 走另一条 —— 本地都落到右侧面板的对应页签。
 */
export const DOCUMENT_VIEW_ITEMS: readonly DocumentMenuItem[] = [
  { id: 'pageInfo', label: '页面信息', key: 'blockdetails.sidebar.pageinfo' },
  { id: 'tasks', label: '任务', key: 'tasks' },
  { id: 'attachments', label: '附件', key: 'attachments' },
  { id: 'comments', label: '评论', key: 'comments' },
] as const;

/** 弹层几何（官方给的锚点）。 */
export const DOCUMENT_MENU_GEOMETRY = {
  placement: 'bottom-end',
  width: 216,
} as const;

/** 静态项（去掉注入位）——渲染时只画这些，注入位由调用点补。 */
export function staticItemsOf(section: DocumentMenuSection): DocumentMenuItem[] {
  return section.items.filter((item) => !item.dynamic);
}
