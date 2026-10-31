import { config } from 'dotenv';

config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { getDb } = await import('@/prisma/db');
const { listConnections, createConnection, deleteConnection } = await import('./connection');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let otherUserId = '';

async function clearRows() {
  for (const id of [userId, otherUserId]) {
    const rows = await db.orm.public.Connection.where({ userId: id }).all();
    for (const row of rows) await db.orm.public.Connection.where({ id: String(row.id) }).delete();
  }
}

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  otherUserId = crypto.randomUUID();
  for (const id of [userId, otherUserId]) {
    await db.orm.public.User.create({
      id,
      email: `connections-${id.slice(0, 8)}@example.com`,
      name: '连接测试',
      password: '!no-login-test-row',
    });
  }
});

beforeEach(async () => {
  session.userId = userId;
  await clearRows();
});

afterAll(async () => {
  await clearRows();
  for (const id of [userId, otherUserId]) {
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('connection centre', () => {
  it('creates and lists a connection for the signed-in user', async () => {
    const created = await createConnection({
      kind: 'mcp',
      name: ' 我的 MCP ',
      endpoint: ' https://mcp.example.com ',
      token: ' secret ',
    });
    expect(created).toMatchObject({ kind: 'mcp', name: '我的 MCP', endpoint: 'https://mcp.example.com', hasToken: true });

    const rows = await listConnections();
    expect(rows.map((row) => row.id)).toEqual([created.id]);
  });

  it('keeps token values out of the list projection', async () => {
    await createConnection({ kind: 'api', name: 'API', token: 'secret' });
    const [row] = await listConnections();
    expect(row).not.toHaveProperty('token');
    expect(row.hasToken).toBe(true);
  });

  it('rejects an empty name and an unknown kind', async () => {
    await expect(createConnection({ kind: 'mcp', name: '   ' })).rejects.toThrow('连接名称不能为空');
    await expect(createConnection({ kind: 'carrier-pigeon', name: 'x' })).rejects.toThrow('无效的连接类型');
  });

  it('deletes only the owner’s row', async () => {
    const created = await createConnection({ kind: 'mcp', name: 'mine' });
    session.userId = otherUserId;
    await expect(deleteConnection(created.id)).rejects.toThrow('未授权');
    session.userId = userId;
    await deleteConnection(created.id);
    expect(await listConnections()).toEqual([]);
  });
});
