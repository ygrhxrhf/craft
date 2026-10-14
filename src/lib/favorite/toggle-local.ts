// 收藏的离线写路径（G240）。
//
// Favorite 的唯一键是 `@@unique([userId, documentId])`，且**不排除墓碑行**：同一个文档
// 在库里永远只有一行收藏记录，取消＝给它写 deletedAt，重新收藏＝清掉 deletedAt。
// 因此这里的两条分支都不用 `patch: null` 的 delete op，而是统一走 upsert：
// - 服务端 delete 分支只会写 `deletedAt/updatedAt`，与本处写入的落库结果完全一致；
// - delete op 在本地镜像里会丢掉 data（`store.applyRemote` 的墓碑分支），
//   而下一条收藏需要这份 data 才能把 documentId 映射回同一行的 id。
// 未知 id 也安全：服务端 R-19 用 `favorite` 的唯一键定位器回读存量行，就地改写，
// 不会撞约束、不会整批 500。
import { getSyncManager } from '@/lib/sync-core';
import { isDocumentFavorite } from '@/actions/document/favorite';
import { findFavoriteRowId, findLiveFavoriteIds, readLocalRecords } from '@/components/sync/local-records';

export interface FavoriteToggleInput {
  documentId: string;
  /** 操作前是否为收藏状态（UI 的权威显示值）。 */
  favored: boolean;
  /** 只作本地乐观标记：服务端按会话覆盖 payload.userId。 */
  userId?: string | null;
  now?: string;
}

/** 收藏行的列白名单（SYNC_TABLES.favorite 的 7 列）内、本路径需要的键。 */
function favoritePatch(input: FavoriteToggleInput, now: string, deletedAt: string | null) {
  return {
    documentId: input.documentId,
    ...(input.userId ? { userId: input.userId } : {}),
    deletedAt,
    updatedAt: now,
  };
}

/**
 * 切换收藏，返回切换后的状态。写一条本地镜像 + 入队，随即 flush（收藏页读的是服务端行，
 * 不推送就看不到刚收藏的文档）。离线时 flush 自己吞掉请求，入队等着补推。
 */
export async function toggleFavoriteLocal(input: FavoriteToggleInput): Promise<boolean> {
  const now = input.now ?? new Date().toISOString();
  const manager = getSyncManager();

  if (input.favored) {
    // 生效行可能有多条（跨设备各建一行 + 本地乐观行尚未对账）：全部墓碑，否则星号取消不掉。
    const live = await findLiveFavoriteIds(input.documentId);
    const ids = live.length > 0 ? live : [await findFavoriteRowId(input.documentId) ?? crypto.randomUUID()];
    for (const id of ids) {
      await manager.applyLocal({
        table: 'favorite',
        id,
        patch: favoritePatch(input, now, now),
      });
    }
    await manager.flushNow();
    return false;
  }

  const id = await findFavoriteRowId(input.documentId) ?? crypto.randomUUID();
  await manager.applyLocal({
    table: 'favorite',
    id,
    patch: { ...favoritePatch(input, now, null), createdAt: now },
  });
  await manager.flushNow();
  return true;
}

/**
 * 本地镜像对这篇文档收藏状态的裁决：镜像里有它的行（活或墓碑）就按 `deletedAt` 判定；
 * 一行都没有（还没拉到、或本地库不可用）返回 null，交回服务端读。
 *
 * 先问镜像而不是先问服务端，是因为刚做的收藏/取消可能还在队列里没推上去——
 * 服务端此刻的答案是旧的，菜单会显示反过来的标签。
 */
export async function favoriteMirrorState(documentId: string): Promise<boolean | null> {
  const rows = (await readLocalRecords('favorite')).filter((r) => r.data?.documentId === documentId);
  if (rows.length === 0) return null;
  return rows.some((r) => r.op !== 'delete' && !r.data?.deletedAt);
}

/** 菜单/信息面板读收藏状态的唯一入口：镜像优先，服务端补齐镜像没见过的文档。 */
export async function resolveFavoriteState(documentId: string): Promise<boolean> {
  const mirrored = await favoriteMirrorState(documentId);
  if (mirrored !== null) return mirrored;
  try {
    return !!(await isDocumentFavorite(documentId));
  } catch {
    return false;
  }
}
