'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { canCreateConnection, MAX_CONNECTIONS, CONNECTION_PERMISSIONS, CONNECTION_PROTECTIONS, CONNECTION_SCOPES } from '@/lib/connections/connection-spec';

export type ConnectionKind = 'mcp' | 'api';

export interface ConnectionItem {
  id: string;
  kind: ConnectionKind;
  name: string;
  endpoint: string;
  hasToken: boolean;
  /** G122: the three axes of the access centre. */
  permission: string;
  protection: string;
  scope: string;
  createdAt: string;
}

function assertKind(value: unknown): ConnectionKind {
  if (value !== 'mcp' && value !== 'api') throw new Error('无效的连接类型');
  return value;
}

export async function listConnections(): Promise<ConnectionItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const rows: Record<string, unknown>[] = await db.orm.public.Connection
    .where({ userId: session.user.id })
    .orderBy((row: any) => row.createdAt.desc())
    .all();

  return rows.map((row) => ({
    id: String(row.id),
    kind: row.kind === 'api' ? 'api' : 'mcp',
    name: String(row.name ?? ''),
    endpoint: String(row.endpoint ?? ''),
    hasToken: typeof row.token === 'string' && row.token.length > 0,
    permission: String(row.permission ?? 'read-write'),
    protection: String(row.protection ?? 'public'),
    scope: String(row.scope ?? 'all-documents'),
    createdAt: String(row.createdAt ?? ''),
  }));
}

export async function createConnection(input: {
  kind: unknown;
  name: string;
  endpoint?: string;
  token?: string;
  /** G122 axes; each falls back to its official default when unset or invalid. */
  permission?: string;
  protection?: string;
  scope?: string;
}): Promise<ConnectionItem> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const kind = assertKind(input.kind);
  const name = input.name.trim();
  if (!name) throw new Error('连接名称不能为空');

  const db = await getDb();
  // G122: the official hard cap is 10 API connections. Enforced here, before the insert, so the
  // cap cannot be raced past by two concurrent creates in the same tab.
  const existing = await db.orm.public.Connection.where({ userId: session.user.id }).all();
  if (!canCreateConnection(existing as { kind: string }[], kind)) {
    throw new Error(`最多只能创建 ${MAX_CONNECTIONS} 个 API 连接`);
  }
  const id = crypto.randomUUID();
  // G122: the three axes; an unset one takes its official default.
  const permission = CONNECTION_PERMISSIONS.includes(input.permission as never)
    ? String(input.permission)
    : 'read-write';
  const protection = CONNECTION_PROTECTIONS.includes(input.protection as never)
    ? String(input.protection)
    : 'public';
  const scope = CONNECTION_SCOPES.includes(input.scope as never) ? String(input.scope) : 'all-documents';
  await db.orm.public.Connection.create({
    id,
    userId: session.user.id,
    kind,
    name,
    endpoint: (input.endpoint ?? '').trim(),
    token: input.token?.trim() ? input.token.trim() : null,
    permission,
    protection,
    scope,
  });
  revalidatePath('/connections');
  return {
    id,
    kind,
    name,
    endpoint: (input.endpoint ?? '').trim(),
    hasToken: Boolean(input.token?.trim()),
    permission,
    protection,
    scope,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteConnection(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const row = await db.orm.public.Connection.first({ id });
  if (!row || row.userId !== session.user.id) throw new Error('未授权');
  await db.orm.public.Connection.where({ id }).delete();
  revalidatePath('/connections');
}
