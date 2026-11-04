/**
 * `gap.md` G138 —— 分享面板是**整篇文档**的作用域，不是当前子页。官方逐字（`_harvest/i18n-zh.tsv`）：
 *
 *   `collab.share.subpage.warning`
 *     「分享适用于整个文档。你对查看或编辑权限所做的任何更改都将应用于整个文档。」
 *   `collab.share.document.confirm`
 *     「是的，更改整个文档」（确认按钮自身把作用域写在按钮上）
 *
 * 撤销访问是**两问合一**：
 *   `collab.question.revoke.access`
 *     「此人的访问权限将从所有文档中移除。你是否还想撤销他们对特别邀请的文档的访问权限？」
 *   `collab.remove.all.access`「移除所有访问权限」
 */

export const SHARE_SCOPE_WARNING =
  '分享适用于整个文档。你对查看或编辑权限所做的任何更改都将应用于整个文档。';
export const SHARE_SCOPE_WARNING_KEY = 'collab.share.subpage.warning';

/** 确认按钮自身就写着作用域（官方把「整个文档」放在按钮上，而不是说明里）。 */
export const SHARE_SCOPE_CONFIRM = '是的，更改整个文档';
export const SHARE_SCOPE_CONFIRM_KEY = 'collab.share.document.confirm';

export const REVOKE_ACCESS_QUESTION =
  '此人的访问权限将从所有文档中移除。你是否还想撤销他们对特别邀请的文档的访问权限？';
export const REVOKE_ACCESS_QUESTION_KEY = 'collab.question.revoke.access';

export const REMOVE_ALL_ACCESS = '移除所有访问权限';
export const REMOVE_ALL_ACCESS_KEY = 'collab.remove.all.access';

/**
 * 这篇文档有没有子页。有子页才需要那句「分享适用于整个文档」——只有一页时这句话无信息，
 * 官方也只在多页文档上渲染它。
 */
export function hasSubpages(subpageCount: number): boolean {
  return subpageCount > 0;
}

/** 改整篇文档档位前要问的那一问；没有子页时返回 null（不问）。 */
export function shareScopeConfirmation(subpageCount: number): { title: string; confirmLabel: string } | null {
  if (!hasSubpages(subpageCount)) return null;
  return { title: SHARE_SCOPE_WARNING, confirmLabel: SHARE_SCOPE_CONFIRM };
}

/**
 * 移除某人后要问的两问合一。`elsewhere > 0`（此人在我拥有的**其它**文档里也有单独授权）时才问，
 * 否则没有第二问可答。
 */
export function revokeAcrossDocumentsPrompt(elsewhere: number): { title: string; confirmLabel: string } | null {
  if (elsewhere <= 0) return null;
  return { title: REVOKE_ACCESS_QUESTION, confirmLabel: REMOVE_ALL_ACCESS };
}
