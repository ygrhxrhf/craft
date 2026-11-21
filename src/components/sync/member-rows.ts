import type { PendingRow } from './local-records';

/**
 * `gap.md` G1521（纯函数）：把本机对 `document_member` 的未推送意图叠进服务端成员名册。
 * 与 R-18 的回收站叠法同源（`TrashList` 的 `overlayTrashRows`）——本机意图即时可见、
 * 服务端权威行随后收敛。删除那一支必须叠，否则"移除协作者"走内核之后断链时行会弹回来
 * （服务端名册里还在、本机 pending 的墓碑没人读）。
 *
 * G1520 补的那一支——**本机新建**：邀请走内核后，那一行先躺在 pending 里、服务端名册还没有。
 * 名册的重读（`onStoreChanged('document_member')` 触发）只叠删除/改权限，就会把 `handleAdd`
 * 刚写进 state 的行冲掉——离线时服务端永远没有它，那行于是一直不出现。所以新建行也要叠；
 * 它只带得住 `userId`，显示名从 G1507/G1520 那枚缓存里取（`displayOf`）。
 * ☆ 学不到显示名的那一枚不收：与 `overlayMentionCandidates` 同一口径——名册里一行没有名字、
 *   只有内部 id，比"暂时还没出现"更糟。
 */
export interface MemberRowLike {
  id: string;
  userId: string;
  role: string;
}

export interface MemberDisplay {
  name: string | null;
  email: string;
}

export interface OverlayMemberOptions {
  /** 只叠这一篇文档的行（`document_member` 的 pending 里也躺着别篇的意图）。 */
  documentId?: string;
  /** 本机新建行只带得住 userId ⇒ 显示名从这里取（`userDisplayOf`）。 */
  displayOf?: (userId: string) => MemberDisplay | null;
}

export function overlayMemberRows<T extends MemberRowLike>(
  server: T[],
  pending: Map<string, PendingRow>,
  opts: OverlayMemberOptions = {},
): T[] {
  const seen = new Set(server.map((row) => row.id));
  const out: T[] = [];
  for (const row of server) {
    const p = pending.get(row.id);
    if (p?.op === 'delete') continue;      // 本机已移除：名册里去掉
    out.push(p?.op === 'upsert' ? { ...row, ...(p.data as Partial<T>) } : row);
  }

  const { documentId, displayOf } = opts;
  if (documentId && displayOf) {
    // id 与 userId 双去重：服务端可能已用另一个 id 落了同一枚人（pending 还没 ack）。
    const userIds = new Set(server.map((row) => row.userId));
    for (const [id, p] of pending) {
      if (p.op !== 'upsert' || seen.has(id)) continue;
      const data = p.data as { documentId?: unknown; userId?: unknown; role?: unknown } | undefined;
      if (!data || data.documentId !== documentId) continue;
      const userId = typeof data.userId === 'string' ? data.userId : '';
      if (!userId || userIds.has(userId)) continue;
      const display = displayOf(userId);
      if (!display) continue;
      const role = typeof data.role === 'string' ? data.role : 'editor';
      out.push({ id, userId, role, name: display.name, email: display.email } as unknown as T);
      seen.add(id);
      userIds.add(userId);
    }
  }
  return out;
}
