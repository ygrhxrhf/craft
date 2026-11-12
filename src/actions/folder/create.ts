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
  // 落点＝同层末尾（与既有可观察行为一致：INSERT 落在堆尾）。显式写 order 是为了让
  // 「拖动重排过 0…n-1」的层也一样——否则新行 order 0 会插到已排好的兄弟前面。
  const siblings: Array<{ parentId: string | null; order: number }> = await db.orm.public.Folder
    .where({ userId, isDeleted: false })
    .select('parentId', 'order')
    .all();
  const parentId = input.parentId ?? null;
  const maxOrder = siblings
    .filter((s) => (s.parentId ?? null) === parentId)
    .reduce((max, s) => Math.max(max, s.order ?? 0), -1);

  const folder = await db.orm.public.Folder.create({
    id: crypto.randomUUID(),
    name: input.name ?? UNTITLED_FOLDER,
    userId,
    parentId,
    order: maxOrder + 1,
  });

  await emitSyncEventSafe(db, userId, ['folder'], (folder as any).id ?? userId);
  return folder;
}
