/**
 * Each link write has its own progress sentence (G139). The ledger's rule is that a shared "loading"
 * is not enough: the line has to name the operation. The source lists three, so they are enumerated
 * rather than templated — an invented fourth wording would read as local copy.
 *
 * Completion sentences are collected separately, because the source only pairs two of them with an
 * arrow (`removing.link` → `link.removed`, `updating.password` → `secret.link.password.updated`);
 * `secret.link.created` is listed on its own, so it is not tied to an operation here.
 */

export type LinkOperation = 'updatingLink' | 'updatingPassword' | 'removingLink';

/** The three in-progress lines, each naming its own operation. */
export const LINK_OPERATION_PENDING: Record<LinkOperation, { label: string; key: string }> = {
  updatingLink: { label: '正在更新链接', key: 'collab.updating.link' },
  updatingPassword: { label: '正在更新密码', key: 'collab.updating.password' },
  removingLink: { label: '正在移除链接', key: 'collab.removing.link' },
};

/** The in-progress line for an operation. */
export function linkOperationPending(op: LinkOperation): string {
  return LINK_OPERATION_PENDING[op].label;
}

/**
 * The completion lines, with the two operations the source pairs them to. `secret.link.created` has
 * no arrow in the source, so it carries no operation here.
 */
export const LINK_OPERATION_DONE = {
  updatingPassword: { label: '私密链接密码已成功更新', key: 'collab.secret.link.password.updated' },
  removingLink: { label: '私密链接已成功移除', key: 'collab.link.removed' },
  secretLinkCreated: { label: '私密链接已成功创建', key: 'collab.secret.link.created' },
} as const;

/** The completion line for an operation that has one; `updatingLink` has none in the source. */
export function linkOperationDone(op: LinkOperation): string | null {
  return op === 'updatingLink' ? null : LINK_OPERATION_DONE[op].label;
}
