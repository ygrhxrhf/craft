'use server';

import { assertOwned, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { UNTITLED_FOLDER } from '@/lib/document/untitled-copy';

export async function createFolder(input: {
  name?: string;
  parentId?: string | null;
}) {
  const userId = await requireUserId();
  if (input.parentId) await assertOwned('Folder', input.parentId, userId, '父文件夹不存在');

  const db = await getDb();
  const folder = await db.orm.public.Folder.create({
    id: crypto.randomUUID(),
    name: input.name ?? UNTITLED_FOLDER,
    userId,
    parentId: input.parentId ?? null,
  });

  await emitSyncEventSafe(db, userId, ['folder'], (folder as any).id ?? userId);
  return folder;
}
