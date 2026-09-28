import { formatCursor, type Cursor } from './cursor';

export async function emitSyncEvent(
  db: any,
  userId: string,
  tables: string[],
  cursor: Cursor,
): Promise<void> {
  await db.orm.public.SyncEvent.create({
    tables,
    cursor: formatCursor(cursor),
    userId,
  });
}
