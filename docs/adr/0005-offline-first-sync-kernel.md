# ADR-0005：元数据同步改用离线优先内核

- 状态：已接受
- 日期：2026-10-13
- 分支：`integrate/offline-kernel`
- 取代：ADR-0003

## 背景

ADR-0003 选择了 `GET /api/sync/changes` 游标轮询，理由是单人场景下几秒轮询足够、且避免 SSE/WebSocket 的复杂度。之后 `feature/windows-offline-sync` 分支实现了另一套离线优先内核，目标是 Windows 桌面端断网可完整读写、联网自动对账。两条线在 `09c52df` 处分叉，内核分支冻结了 11 天。

两套机制互斥：ADR-0003 明确否决 SSE，而离线内核的实时通道正是 SSE。

## 决策

**以离线优先内核为元数据同步的唯一机制，退役 ADR-0003 的轮询客户端。**

- 客户端内核：`src/lib/sync-core`（reconciler / queue / store + IndexedDB 与 SQLite 双适配器）。本地写走 `applyLocal`（写本地库 + 入队），联网后 `flush` 推送。
- 服务端：`GET/POST /api/v1/sync`（游标增量 + 记录级 LWW 裁决，服务端时钟为准）与 SSE `/api/v1/events`（`sync_events` 表广播）。
- 冲突：记录级 LWW。`Document`/`Whiteboard` 用 `metaUpdatedAt`（正文保存不 bump），其余表用 `updatedAt`。
- 删除：软删（`deletedAt` + `isDeleted`），墓碑保留 30 天。
- 侧栏取数仍走 `useSidebarSnapshot()`（一次批量请求），离线意图通过 `mergePending` 纯函数叠加在快照行上。

## 后果

- ADR-0003 的 `src/lib/sync/client.ts`、`use-sync-store.ts`、`MetadataSyncProvider`、`/api/sync/changes` 及其测试已删除。
- `Tag`/`DocumentTag`/`Favorite` 补了 `updatedAt`，不再需要"每次全量"的特例。
- 通知（`Notification`）不进同步流：它由服务端生成，通知铃改为在标签页重新获得焦点时重拉。
- 迁移链在 `20260924T2230` 处分叉，已重建为一条线性迁移 `20261013T0146_add_offline_sync_columns`。

## 未决

- 任务页 / 集合页的写路径仍直调服务端 action，离线不可用（内核设计文档已标注递延）。
- `impl/crafty-p0` 的 22 个功能提交尚未并入本线。
