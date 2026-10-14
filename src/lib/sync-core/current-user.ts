import { getSession } from 'next-auth/react';

/**
 * `useSession()` 的 `data` 在客户端是异步到位的：登录后**立刻**点「新建」时它可能还是 undefined，
 * 于是写路径回退到旧的 Server Action。而 Server Action 自己生成行 id，紧随其后的 `applyLocal` patch
 * 打在本地那个 `crypto.randomUUID()` 上 ⇒ 两边对不上，这次改动静默丢失
 * （实测：日历/任务页新建后马上设截止日，UI 读回来的仍是没有排期的那一行）。
 *
 * 所以未命中时先问一次 `/api/auth/session`，只有真没登录才允许回退。
 */
export async function currentUserId(known?: string | null): Promise<string | null> {
  if (known) return known;
  const session = await getSession();
  return session?.user?.id ?? null;
}
