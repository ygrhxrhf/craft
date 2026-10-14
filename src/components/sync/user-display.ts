// 成员行的同步列里没有姓名/邮箱（那两枚在 User 表上，而 User 不进同步契约），
// 所以还没推出去的 pending 成员行只带得住 userId。这一份是客户端**当场学到**的那半截显示名：
// 邀请那一发 `resolveDocumentMember` 返回的就是账号名＋邮箱，顺手记下来，@ 候选叠 pending 时才有得可标。
// ☆ 只活在本页会话里——刷新之后 pending 多半已被 ack，服务端权威行自己会带着显示名回来。
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

/** 测试用：会话缓存没有卸载钩子，用例之间要自己清。 */
export function forgetAllUserDisplay(): void {
  display.clear();
}
