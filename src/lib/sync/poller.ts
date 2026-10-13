// src/lib/sync/poller.ts
// web 进程内共享的 500ms 轮询器：把 sync_events 扇出给本进程 SSE 订阅者。
export type MetaMessage = { t: 'meta'; tables: string[]; cursor: string };
export type Fanout = (userId: string, msg: MetaMessage) => void;

export function createPoller(getDb: () => Promise<any>, fanout: Fanout) {
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick() {
    try {
      const db = await getDb();
      // 查询形状核对（orm-client.d.mts / 现有 action 链）：orderBy 走 lambda 字段代理，
      // limit() 返回 Collection、须以 .all() 终端收口；测试替身的 limit() 直接返回
      // Promise（无 .all），故按结果形状自适应（批量至多 200 行/tick）。
      const query: any = db.orm.public.SyncEvent
        .where({}).orderBy((r: any) => r.id.asc()).limit(200);
      const rows: any[] = await (typeof query.all === 'function' ? query.all() : query);
      for (const row of rows) {
        fanout(row.userId, { t: 'meta', tables: row.tables, cursor: row.cursor });
        await db.orm.public.SyncEvent.where({ id: row.id }).delete();
      }
    } catch { /* 断路：下一 tick 自恢复；事件仍在表中不丢 */ }
  }

  return {
    tick,
    start() { if (!timer) timer = setInterval(tick, 500); },   // spec：500ms
    stop() { if (timer) { clearInterval(timer); timer = null; } },
  };
}

type Sub = (msg: MetaMessage) => void;
let shared: (ReturnType<typeof createPoller> & { subscribe(userId: string, cb: Sub): () => void }) | null = null;

export function getSharedPoller(getDb: () => Promise<any>) {
  if (shared) return shared;
  const subs = new Map<string, Set<Sub>>();
  const base = createPoller(getDb, (userId, msg) => {
    for (const cb of subs.get(userId) ?? []) cb(msg);
  });
  shared = {
    ...base,
    subscribe(userId, cb) {
      const set = subs.get(userId) ?? new Set();
      set.add(cb); subs.set(userId, set);
      return () => { set.delete(cb); if (!set.size) subs.delete(userId); };
    },
  };
  return shared;
}
