// 成员行的同步列里没有姓名/邮箱（那两枚在 User 表上，而 User 不进同步契约），
// 所以还没推出去的 pending 成员行只带得住 userId。这一份是客户端**当场学到**的那半截显示名：
// 邀请那一发 `resolveDocumentMember` 返回的就是账号名＋邮箱，顺手记下来，@ 候选叠 pending 时才有得可标。
// G1520：这枚 Map 会**落到内核同一座库**（kv 段，见 `user-display-persist.ts`）——离线邀请了人、
// pending 还没推上去就刷新页面时，缓存跟着内核活下来，@ 名单里那枚人不再丢。
const display = new Map<string, { name: string | null; email: string }>();

/** 只增不减：同一枚用户后来只学到邮箱时，不把已经知道的姓名抹掉。 */
export function rememberUserDisplay(user: {
  userId: string;
  name?: string | null;
  email?: string;
}): void {
  if (!user.userId) return;
  const prev = display.get(user.userId);
  display.set(user.userId, {
    name: user.name ?? prev?.name ?? null,
    email: user.email ?? prev?.email ?? '',
  });
}

export function userDisplayOf(userId: string): { name: string | null; email: string } | null {
  return display.get(userId) ?? null;
}

/** 拍一份当前缓存的快照（落库用）。 */
export function userDisplayEntries(): Array<[string, { name: string | null; email: string }]> {
  return [...display.entries()];
}

/** 把一份快照并回缓存：仍走 `rememberUserDisplay` 的只增不减合并，不回退已有姓名。
 *  ☆ 快照里的空串邮箱按"没学到"处理（`|| undefined`）——否则一次空值并回会把已有邮箱抹成空。 */
export function mergeUserDisplayEntries(
  entries: Array<[string, { name: string | null; email: string }]> | null | undefined,
): void {
  if (!entries) return;
  for (const [userId, value] of entries) {
    rememberUserDisplay({ userId, name: value?.name ?? null, email: value?.email || undefined });
  }
}

/** 测试用：会话缓存没有卸载钩子，用例之间要自己清。 */
export function forgetAllUserDisplay(): void {
  display.clear();
}
