import { mergeUserDisplayEntries, userDisplayEntries } from './user-display';
import { readUserDisplayCache, writeUserDisplayCache } from './local-records';

/**
 * `gap.md` G1520 —— 显示名缓存**活过整页重载**。
 *
 * `user-display.ts` 那枚 Map 只活在会话里；离线邀请了人、pending 还没推上去就刷新页面时，
 * `overlayMentionCandidates` 取不到名字就把那枚人从 `@` 名单里跳掉（本仓刻意：标不出名字的
 * chip 比"暂时不在名单里"更糟）。这里把缓存落到**内核同一座库**的 kv 段（`getKv`/`setKv`
 * 与 cursor/lastPullAt 并存），刷新后先 hydrate 再叠 pending，那枚人就不再丢。
 * ☆ 落在内核而不是另起一处 localStorage：它读的是同一座 idb/sqlite 库，红线未越。
 */
let hydrated = false;

/** 只在第一次读候选前 hydrate 一次（幂等）。读不到（库里没有这一段）＝当空缓存处理。 */
export async function hydrateUserDisplay(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  mergeUserDisplayEntries(await readUserDisplayCache());
}

/** 立刻把当前快照写回内核（fire-and-forget）。
 *  ☆ 不走去抖定时器：那一枚 0ms 定时器会被紧接着的**整页重载**取消，正是本条 Gap 要治的场景
 *    （邀请后立刻刷新页面）。邀请是低频动作，每次多写一小段 kv 不值得换回一个会丢缓存的定时器。 */
export function persistUserDisplay(): void {
  void writeUserDisplayCache(userDisplayEntries());
}

/** 测试用：重置"已 hydrate"标记。 */
export function resetUserDisplayPersistForTest(): void {
  hydrated = false;
}
