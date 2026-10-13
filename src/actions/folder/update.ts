'use server';

import { assertOwned, getTable, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export async function updateFolder(id: string, data: { name?: string; icon?: string | null }) {
  const userId = await requireUserId();
  await assertOwned('Folder', id, userId, '文件夹不存在');

  await (await getTable('Folder')).where({ id, userId }).update(data as Record<string, unknown>);
  await emitSyncEventSafe(await getDb(), userId, ['folder'], id);
}
