/**
 * G440 —— 冲突判据是**索引比较**，不是版本号相等（`internals.md` §十一 1）。
 *
 * 官方那句：`e.blocks.length > 0 && localSyncIndex > connectionStatus.lastSyncPatchIndex`
 * ⇒ **有未上报的本地改动**（`blocks` 非空）**且**服务端补丁落后于本地索引，才进合并。
 * 另有两条：**空补丁直接采用**（没什么可合的），**日志级别是 `warn` 而非 `error`**
 * （一次冲突是常态，不是故障）。
 *
 * 本地此前没有这一层（写库整行覆盖、靠 `updatedAt` LWW 拒旧），本模块把这条判据写成纯核。
 */

export interface ConflictCriterionInput {
  /** 本地待上报的块数（官方那句的 `e.blocks.length`）。 */
  localBlocks: number;
  /** 本地同步索引（`localSyncIndex`）。 */
  localSyncIndex: number;
  /** 连接状态里记的服务端补丁索引（`lastSyncPatchIndex`）。 */
  lastSyncPatchIndex: number;
}

export type ConflictDecision = 'merge' | 'adopt';

/**
 * 该不该进合并。两个条件都成立才合并：**有未上报的本地改动**（`localBlocks > 0`）
 * 且 **本地索引 > 服务端补丁索引**（服务端落后）。否则直接采用（`adopt`）。
 */
export function decideConflict(input: ConflictCriterionInput): ConflictDecision {
  if (input.localBlocks > 0 && input.localSyncIndex > input.lastSyncPatchIndex) return 'merge';
  return 'adopt';
}

/** 空补丁直接采用——没有要合的东西，合并器不必跑。 */
export function isEmptyPatch(patch: { blocks?: unknown[] } | null | undefined): boolean {
  return !patch || !Array.isArray(patch.blocks) || patch.blocks.length === 0;
}

/** 冲突的日志级别是 `warn`，不是 `error`——一次冲突是常态，不该被当成故障上报。 */
export const CONFLICT_LOG_LEVEL = 'warn' as const;
