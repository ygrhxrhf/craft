/**
 * G1511 —— 同设备连写的「后一笔被前一笔判旧」问题（`gap.md` G1511）。
 *
 * 现场：服务端对每一笔 applied 都无条件重打 `metaUpdatedAt = serverNow()`，于是本机去抖窗口里
 * 排在一起的两笔，**先到先落的那笔把自己的时间戳抬到"此刻"**，后一笔（客户端钟点的更早时刻）
 * 在 `decideLww` 那里天生 `tCli <= tSrv` ⇒ `reject` + `reason:'stale'` ⇒ `store.applyRemote`
 * 把它当权威值盖回本地 ＝ **动作被自己另一笔在途写入静默撤销**。
 *
 * 台账给的三个改法各有代价，**需要单独裁决**：
 *   ① `delete`-op 不吃 `stale`——墓碑那笔的语义是"从此刻起不存在"，本就不该跟内容时间戳比大小；
 *   ② 同设备回环豁免——`rejected` 里的 `stale` 只当"他端更新"，**若本机 pending 还有同 id 的更晚意图则不盖本地**；
 *   ③ 服务端不再重打、只推进到 `max(serverNow, rec.syncTs)`——动摇 spec C3 的时钟权威前提，代价最大。
 *
 * 本模块把三条**各自**写成可判定的纯核，好让裁决落在明面上，而不是悄悄选一条改掉同步语义。
 */

export type StaleFixOption = 'delete-op-exempt' | 'loopback-exempt' | 'server-max-ts';

/** ① 墓碑不吃 stale：`delete`-op 的陈旧拒绝一律改判为接受。 */
export function deleteOpExemptsStale(op: 'upsert' | 'delete', reason: string | undefined): boolean {
  return op === 'delete' && reason === 'stale';
}

/**
 * ② 同设备回环豁免：一个 `stale` 拒绝该不该盖回本地。
 * 若**本机 pending 里还有同一记录的更晚意图**（`syncTs` 更大），则不盖——那一笔才是本机最新想做的。
 */
export interface PendingIntent {
  table: string;
  recordId: string;
  syncTs: string;
}

export function shouldOverwriteLocal(input: {
  rejected: { table: string; id: string; reason?: string };
  rejectedSyncTs: string;
  pending: PendingIntent[];
}): boolean {
  if (input.rejected.reason !== 'stale') return true; // 非 stale 的拒绝照旧盖回
  const newer = input.pending.some(
    (op) =>
      op.table === input.rejected.table &&
      op.recordId === input.rejected.id &&
      op.syncTs > input.rejectedSyncTs,
  );
  return !newer;
}

/**
 * ③ 服务端时间戳只推进不倒退：落库时间戳取 `max(serverNow, rec.syncTs)`。
 * 这条会**动摇 spec C3 的时钟权威前提**（服务端时钟不再无条件覆盖），故只作为可判定的备选，
 * 不默认启用。
 */
export function serverTimestamp(serverNow: string, clientSyncTs: string): string {
  return clientSyncTs > serverNow ? clientSyncTs : serverNow;
}
