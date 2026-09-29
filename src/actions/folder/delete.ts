'use server';

import { assertOwned, getTable, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export async function deleteFolder(id: string) {
  const userId = await requireUserId();
  await assertOwned('Folder', id, userId, '文件夹不存在');

  await (await getTable('Folder')).where({ id, userId }).update({
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  } as Record<string, unknown>);
  await emitSyncEventSafe(await getDb(), userId, ['folder'], id);
}
