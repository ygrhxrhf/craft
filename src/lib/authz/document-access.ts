import { roleSatisfies, type AccessLevel, type ResourceRole } from './resource';
import { AuthorizationError, getTable } from './guard';
import { shareWriteRole } from '@/lib/share/permission';

export interface DocumentAccess {
  document: Record<string, unknown>;
  role: ResourceRole;
}

export interface ShareAccess extends DocumentAccess {
  shareVersion: number;
}

const MEMBER_ROLES: ResourceRole[] = ['editor', 'commenter', 'viewer'];

/**
 * Owner comes from `Document.userId`; everyone else needs a `DocumentMember` row.
 * Returns null when the document is gone, trashed, or the actor has no grant.
 */
export async function resolveDocumentAccess(
  documentId: string,
  userId: string,
): Promise<DocumentAccess | null> {
  const document = await (await getTable('Document')).first({ id: documentId });
  if (!document || document.isDeleted) return null;

  if (document.userId === userId) return { document, role: 'owner' };

  const member = await (await getTable('DocumentMember')).first({ documentId, userId });
  const role = member?.role as ResourceRole | undefined;
  if (!role || !MEMBER_ROLES.includes(role)) return null;

  return { document, role };
}

/**
 * A published link on the edit tier is a grant of its own, so a signed-in visitor with
 * no member row still reaches the collab chain. Callers try ownership and membership
 * first, which keeps a private document from widening here, and a trashed document stays
 * closed even while its link is open.
 */
export async function resolveShareAccess(
  documentId: string,
  userId: string,
): Promise<ShareAccess | null> {
  const document = await (await getTable('Document')).first({ id: documentId });
  if (!document || document.isDeleted) return null;

  const share = await (await getTable('DocumentShare')).first({ documentId });
  if (!share || !share.isPublished) return null;

  const role = shareWriteRole(share.permission, userId);
  if (!role) return null;

  return { document, role, shareVersion: share.shareVersion as number };
}

export async function requireDocumentAccess(
  documentId: string,
  userId: string,
  need: AccessLevel,
): Promise<DocumentAccess> {
  const access = await resolveDocumentAccess(documentId, userId);
  if (!access) throw new AuthorizationError('文档不存在');

  if (!roleSatisfies(access.role, need)) throw new AuthorizationError('没有该文档的权限');

  return access;
}
