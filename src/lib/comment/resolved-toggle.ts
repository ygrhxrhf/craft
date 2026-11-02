/**
 * `gap.md` G74 —— 评论串的**显示/隐藏已解决**开关。官方是"短标签＋长说明"两套（R26：
 * 分段控件用短、tooltip/菜单用长），逐字取自 `_harvest/i18n-zh.tsv:883-884,944-945`：
 *   `collab.show.resolved`「显示已解决」／`collab.show.resolved.threads`「显示已解决的主题」
 *   `collab.hide.resolved`「隐藏已解决」／`collab.hide.resolved.threads`「隐藏已解决的评论串」
 */

export const SHOW_RESOLVED = '显示已解决';
export const SHOW_RESOLVED_KEY = 'collab.show.resolved';
export const SHOW_RESOLVED_THREADS = '显示已解决的主题';
export const SHOW_RESOLVED_THREADS_KEY = 'collab.show.resolved.threads';

export const HIDE_RESOLVED = '隐藏已解决';
export const HIDE_RESOLVED_KEY = 'collab.hide.resolved';
export const HIDE_RESOLVED_THREADS = '隐藏已解决的评论串';
export const HIDE_RESOLVED_THREADS_KEY = 'collab.hide.resolved.threads';

/** 短标签：折叠控件/按钮上那枚（随当前可见性翻转）。 */
export function resolvedToggleLabel(showing: boolean): string {
  return showing ? HIDE_RESOLVED : SHOW_RESOLVED;
}

/** 长说明：tooltip 那一套（R26 的"两套文案"）。 */
export function resolvedToggleHint(showing: boolean): string {
  return showing ? HIDE_RESOLVED_THREADS : SHOW_RESOLVED_THREADS;
}

/**
 * G74 —— 已解决区要显示**是谁解决的**。官方键 `web.collab.x.resolved`「`[0]`标记为已解决」
 * （`_harvest/i18n-zh.tsv:3926`），`[0]` 是解决者的显示名。拿不到名字（老数据没写 `resolvedBy`、
 * 或账号已删）⇒ 返回 `null`，**不发明半句**（与 `signInGreeting` 同一条判据）。
 */
export const RESOLVED_BY_KEY = 'web.collab.x.resolved';

export function resolvedByText(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return `${trimmed}标记为已解决`;
}
