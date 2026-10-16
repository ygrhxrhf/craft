import type { ResourceRole } from '@/lib/authz/resource';

/**
 * The share tiers (G04). The official picker has **three**, not two: the two link tiers
 * (`collab.access.link.view`「知道链接的人都可以查看」/ `collab.access.link.edit`「知道链接的任何人都可以编辑」)
 * and the closed tier `collab.access.only.collaborators`「仅限有访问权限的协作者」, which hands the
 * document to signed-in collaborators only — the link itself grants nothing.
 */
export type DocumentSharePermission = 'view' | 'edit' | 'collaborators';

export const SHARE_PERMISSIONS: DocumentSharePermission[] = ['view', 'edit', 'collaborators'];

/** The closed tier's label, verbatim (`collab.access.only.collaborators`). */
export const ONLY_COLLABORATORS_LABEL = '仅限有访问权限的协作者';
export const ONLY_COLLABORATORS_KEY = 'collab.access.only.collaborators';

export function isSharePermission(value: unknown): value is DocumentSharePermission {
  return typeof value === 'string' && SHARE_PERMISSIONS.includes(value as DocumentSharePermission);
}

/**
 * Whether a tier opens the document to a mere link holder. The closed tier does not: it is only
 * reachable by someone the document already grants access to, so the link alone must not resolve
 * to any role.
 */
export function tierOpensToLink(permission: unknown): boolean {
  return permission === 'view' || permission === 'edit';
}

/**
 * The write role a share link gives this visitor. Editing requires a user id, so an
 * anonymous link holder never reaches the collab chain as a writer. The closed tier gives no
 * role at all — it is not a link grant, it is the absence of one.
 */
export function shareWriteRole(
  permission: unknown,
  userId: string | null,
): ResourceRole | null {
  if (!isSharePermission(permission)) return null;
  if (permission === 'collaborators') return null;
  if (permission !== 'edit') return null;
  return userId ? 'editor' : null;
}
