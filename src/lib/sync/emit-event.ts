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

/**
 * I2：服务端元数据 action 的兜底广播——落库后调用，失败吞掉不阻断业务
 * （与 updateDocument 的 emit 姿态一致：广播丢一次无害，客户端 30s 轮询兜底）。
 */
export async function emitSyncEventSafe(
  db: any,
  userId: string,
  tables: string[],
  id: string,
): Promise<void> {
  try {
    await emitSyncEvent(db, userId, tables, { ts: new Date().toISOString(), id });
  } catch {
    // broadcast failure must never block saving
  }
}
