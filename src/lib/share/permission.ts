import type { ResourceRole } from '@/lib/authz/resource';

export type DocumentSharePermission = 'view' | 'edit';

export const SHARE_PERMISSIONS: DocumentSharePermission[] = ['view', 'edit'];

export function isSharePermission(value: unknown): value is DocumentSharePermission {
  return typeof value === 'string' && SHARE_PERMISSIONS.includes(value as DocumentSharePermission);
}

/**
 * The write role a share link gives this visitor. Editing requires a user id, so an
 * anonymous link holder never reaches the collab chain as a writer.
 */
export function shareWriteRole(
  permission: unknown,
  userId: string | null,
): ResourceRole | null {
  if (!isSharePermission(permission)) return null;
  if (permission !== 'edit') return null;
  return userId ? 'editor' : null;
}
