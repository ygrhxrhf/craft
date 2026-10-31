'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';

export type ConnectionKind = 'mcp' | 'api';

export interface ConnectionItem {
  id: string;
  kind: ConnectionKind;
  name: string;
  endpoint: string;
  hasToken: boolean;
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
    createdAt: String(row.createdAt ?? ''),
  }));
}

export async function createConnection(input: {
  kind: unknown;
  name: string;
  endpoint?: string;
  token?: string;
}): Promise<ConnectionItem> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const kind = assertKind(input.kind);
  const name = input.name.trim();
  if (!name) throw new Error('连接名称不能为空');

  const db = await getDb();
  const id = crypto.randomUUID();
  await db.orm.public.Connection.create({
    id,
    userId: session.user.id,
    kind,
    name,
    endpoint: (input.endpoint ?? '').trim(),
    token: input.token?.trim() ? input.token.trim() : null,
  });
  revalidatePath('/connections');
  return {
    id,
    kind,
    name,
    endpoint: (input.endpoint ?? '').trim(),
    hasToken: Boolean(input.token?.trim()),
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
