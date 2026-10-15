import type { PendingRow } from './local-records';

/**
 * `gap.md` G1521（纯函数）：把本机对 `document_member` 的未推送意图叠进服务端成员名册。
 * 与 R-18 的回收站叠法同源（`TrashList` 的 `overlayTrashRows`）——本机意图即时可见、
 * 服务端权威行随后收敛。删除那一支必须叠，否则"移除协作者"走内核之后断链时行会弹回来
 * （服务端名册里还在、本机 pending 的墓碑没人读）。
 */
export interface MemberRowLike {
  id: string;
  userId: string;
  role: string;
}

export function overlayMemberRows<T extends MemberRowLike>(
  server: T[],
  pending: Map<string, PendingRow>,
): T[] {
  const out: T[] = [];
  for (const row of server) {
    const p = pending.get(row.id);
    if (p?.op === 'delete') continue;      // 本机已移除：名册里去掉
    out.push(p?.op === 'upsert' ? { ...row, ...(p.data as Partial<T>) } : row);
  }
  // 本机新建、服务端还没有的成员行：需要 defaults 才能补出完整行，交给调用方决定
  // （本批只叠"删除"与"改权限"两种，新增那一支由 `resolveDocumentMember` 的返回值直接进 state）
  return out;
}
