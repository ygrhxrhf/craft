/**
 * 白板元数据的 applyLocal patch。键必须落在 `SYNC_TABLES.whiteboard` 的列白名单内
 * （`id`/`name`/`shareToken`/`isDeleted`/`deletedAt`/`createdAt`/`updatedAt`）——
 * 本地 store 没有服务端那道求交闸门，写进脏键会被离线期的 UI 直接读到。
 *
 * ☆ 没有 `shareToken` 一档：分享 token 由服务端 `createShareToken()` 签发。让浏览器自己
 *   生成会进本地队列，同一张白板在两台设备离线各造一个 token、同步时后写的覆盖先写的，
 *   已经发出去的链接会静默失效。
 */
export const whiteboardMetaPatch = {
  rename(name: string) {
    return { name: name.trim() };
  },

  /** 软删：读侧按 `isDeleted` 过滤，`deletedAt` 留着给「最近删除」排时间。 */
  delete(deletedAt: string) {
    return { isDeleted: true, deletedAt, updatedAt: deletedAt };
  },

  restore(updatedAt: string) {
    return { isDeleted: false, deletedAt: null, updatedAt };
  },
};
