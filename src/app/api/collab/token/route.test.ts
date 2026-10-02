import { config } from 'dotenv';

// The route resolves grants through the real ORM, so it needs the same .env that
// Next loads at runtime.
config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked. The claim has to be signed by the real route against the
 * real share row, otherwise this test would prove nothing about the collab chain. */
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { POST } = await import('@/app/api/collab/token/route');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let visitorId = '';
let documentId = '';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/collab/token', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function claimsOf(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
}

async function grant(permission: string, isPublished: boolean, shareVersion: number) {
  await db.orm.public.DocumentShare.where({ documentId }).delete();
  await db.orm.public.DocumentShare.create({
    id: crypto.randomUUID(),
    documentId,
    token: crypto.randomUUID(),
    permission,
    isPublished,
    shareVersion,
  });
}

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  visitorId = crypto.randomUUID();
  documentId = crypto.randomUUID();
  for (const id of [ownerId, visitorId]) {
    await db.orm.public.User.create({
      id,
      email: `g04-collab-${id.slice(0, 8)}@example.com`,
      name: '链路测试账号',
      password: '!no-login-test-row',
    });
  }
  await db.orm.public.Document.create({ id: documentId, title: 'G04 协作链路', userId: ownerId });
});

beforeEach(async () => {
  await db.orm.public.Document.where({ id: documentId }).update({ isDeleted: false });
  session.userId = visitorId;
});

afterAll(async () => {
  await db.orm.public.User.where({ id: ownerId }).delete();
  await db.orm.public.User.where({ id: visitorId }).delete();
});

describe('collab token for a share link', () => {
  it('signs an editor claim carrying the live share version', async () => {
    await grant('edit', true, 3);
    const res = await POST(request({ documentId }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { token: string; role: string; readOnly: boolean };
    expect(body).toMatchObject({ role: 'editor', readOnly: false });
    expect(claimsOf(body.token)).toMatchObject({
      docId: documentId,
      userId: visitorId,
      role: 'editor',
      readOnly: false,
      viaShare: true,
      shareVersion: 3,
    });
  });

  it('gives the view tier no collab grant at all', async () => {
    await grant('view', true, 1);
    expect((await POST(request({ documentId }))).status).toBe(404);
  });

  it('refuses a revoked publication even on the edit tier', async () => {
    await grant('edit', false, 4);
    expect((await POST(request({ documentId }))).status).toBe(404);
  });

  it('refuses a trashed document whose link is still published', async () => {
    await grant('edit', true, 5);
    await db.orm.public.Document.where({ id: documentId }).update({ isDeleted: true });
    expect((await POST(request({ documentId }))).status).toBe(404);
  });

  it('keeps the owner claim scoped by membership rather than by the share', async () => {
    await grant('edit', true, 7);
    session.userId = ownerId;
    const res = await POST(request({ documentId }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { token: string; role: string };
    expect(body.role).toBe('owner');
    expect(claimsOf(body.token)).not.toHaveProperty('viaShare');
  });
});
