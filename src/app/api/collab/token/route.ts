import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { AuthorizationError, getTable, requireUserId } from '@/lib/authz/guard';
import { resolveDocumentAccess, resolveShareAccess } from '@/lib/authz/document-access';
import { requireSecret } from '@/lib/env/secret';
import type { ResourceRole } from '@/lib/authz/resource';

export const TOKEN_TTL_MS = 30 * 60 * 1000;

export interface CollabClaims {
  docId: string;
  userId: string;
  role: ResourceRole;
  readOnly: boolean;
  exp: number;
  /** Set only when a share link, not ownership or a member row, authorized this claim. */
  viaShare?: true;
  shareVersion?: number;
}

export function signCollabToken(claims: CollabClaims): string {
  const secret = requireSecret(['COLLAB_SECRET', 'AUTH_SECRET', 'NEXTAUTH_SECRET']);
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    const status = error instanceof AuthorizationError ? 401 : 500;
    return Response.json({ error: '未授权' }, { status });
  }

  let body: { documentId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '无效请求' }, { status: 400 });
  }
  const documentId = body.documentId;
  if (!documentId) {
    return Response.json({ error: '缺少 documentId' }, { status: 400 });
  }

  const access = await resolveDocumentAccess(documentId, userId);
  const share = access ? null : await resolveShareAccess(documentId, userId);
  const grant = access ?? share;
  if (!grant) {
    return Response.json({ error: '文档不存在' }, { status: 404 });
  }

  const readOnly = grant.role === 'viewer' || grant.role === 'commenter';
  const claims: CollabClaims = {
    docId: documentId,
    userId,
    role: grant.role,
    readOnly,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  // Only a link grant is scoped by the share row. Marking an owner or member claim with
  // it would let the owner changing a tier lock collaborators out of the document.
  if (share) {
    claims.viaShare = true;
    claims.shareVersion = share.shareVersion;
  }
  const token = signCollabToken(claims);

  const account = await (await getTable('User')).first({ id: userId });

  return Response.json({
    token,
    role: grant.role,
    readOnly,
    user: {
      id: userId,
      name: (account?.name as string) || (account?.email as string) || '协作者',
    },
  });
}
