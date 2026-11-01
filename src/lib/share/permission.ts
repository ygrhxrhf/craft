import type { ResourceRole } from '@/lib/authz/resource';
import { isAccessLevel, type AccessLevel } from './access-levels';

/**
 * G131 —— 分享的访问级别有**五档**（不是三档），且「可评论」是独立一档而非评论开关。
 * 官方那五条键（`_harvest/i18n-zh.tsv:843-850`，逐字）：
 *   - `collab.access.only.collaborators`「仅限有访问权限的协作者」；
 *   - `collab.access.view.and.comment`「可以查看和评论」；
 *   - `collab.access.edit.and.comment`「可以编辑和评论」；
 *   - `collab.access.link.view`「知道链接的人都可以查看」；
 *   - `collab.access.link.edit`「知道链接的任何人都可以编辑」。
 *
 * 词表与 `access-levels.ts` 同源（`AccessLevel` 就是这五档）。此前 `DocumentShare.permission`
 * 只存三档（`view`/`edit`/`collaborators`），「可评论」塌进了 `view` ⇒ 本批扩到五档。
 * 旧值经 `normalizeSharePermission` 归一：`view`→`linkView`、`edit`→`linkEdit`（与旧行为逐条等价，
 * 见 `permission.test.ts` 的迁移断言）。
 */
export type DocumentSharePermission = AccessLevel;

/** 五档，按官方顺序（从最闭到最开）。 */
export const SHARE_PERMISSIONS: DocumentSharePermission[] = [
  'collaborators',
  'viewAndComment',
  'editAndComment',
  'linkView',
  'linkEdit',
];

/** The closed tier's label, verbatim (`collab.access.only.collaborators`). */
export const ONLY_COLLABORATORS_LABEL = '仅限有访问权限的协作者';
export const ONLY_COLLABORATORS_KEY = 'collab.access.only.collaborators';

export function isSharePermission(value: unknown): value is DocumentSharePermission {
  return isAccessLevel(value);
}

/**
 * 归一一个存进库／来自旧行的权限值：旧三档映射到新五档（`view`→`linkView`、`edit`→`linkEdit`），
 * 已是新值则原样返回，其余返回 `null`。迁移与读侧都走它，免得两处各写一遍映射。
 */
export function normalizeSharePermission(value: unknown): DocumentSharePermission | null {
  if (value === 'view') return 'linkView';
  if (value === 'edit') return 'linkEdit';
  return isSharePermission(value) ? value : null;
}

/**
 * Whether a tier opens the document to a mere link holder. 只有后两档（`linkView`/`linkEdit`）是
 * **链接档**——前三档靠协作者名单授权，链接本身不给任何角色（`access-levels.ts` 的 `viaLink` 同源）。
 */
export function tierOpensToLink(permission: unknown): boolean {
  const tier = normalizeSharePermission(permission);
  return tier === 'linkView' || tier === 'linkEdit';
}

/**
 * The write role a share link gives this visitor. Editing requires a user id, so an
 * anonymous link holder never reaches the collab chain as a writer. Only `linkEdit` grants a role;
 * the closed and view tiers give none.
 */
export function shareWriteRole(
  permission: unknown,
  userId: string | null,
): ResourceRole | null {
  const tier = normalizeSharePermission(permission);
  if (tier !== 'linkEdit') return null;
  return userId ? 'editor' : null;
}
