'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { readSpaceEmailOverride, writeSpaceEmailOverride } from '@/lib/app/space-notifications';
import { getSpaceContext } from './space';

export interface SpaceEmailNotification {
  spaceId: string;
  spaceName: string;
  /** `null`＝跟随全局；`true`/`false`＝这名成员在这个空间的覆盖值。 */
  emailComments: boolean | null;
  /** 全局开关（`user.notifyComments`），面板在「跟随全局」时拿它显示生效值。 */
  globalEmailComments: boolean;
}

async function currentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  return session.user.id;
}

async function read(): Promise<SpaceEmailNotification> {
  const userId = await currentUserId();
  const context = await getSpaceContext();
  const db = await getDb();
  const [space, user] = await Promise.all([
    db.orm.public.Space.first({ id: context.id }),
    db.orm.public.User.first({ id: userId }),
  ]);
  if (!space) throw new Error('空间不存在');
  return {
    spaceId: context.id,
    spaceName: String((space as { name?: unknown }).name ?? context.name),
    emailComments: readSpaceEmailOverride((space as { settings?: unknown }).settings, userId),
    globalEmailComments: (user as { notifyComments?: boolean } | null)?.notifyComments === true,
  };
}

/** G163：当前空间里、当前成员的邮件通知覆盖值（没设过＝跟随全局）。 */
export async function getSpaceEmailNotification(): Promise<SpaceEmailNotification> {
  return read();
}

/**
 * G163：写当前空间里当前成员的邮件通知开关；`null` 恢复为跟随全局。
 * 覆盖值按 userId 分格存进 `Space.settings`，同一空间里各成员互不覆盖。
 */
export async function setSpaceEmailNotification(enabled: boolean | null): Promise<SpaceEmailNotification> {
  if (enabled !== null && typeof enabled !== 'boolean') throw new Error('无效的通知设置');
  const userId = await currentUserId();
  const context = await getSpaceContext();
  const db = await getDb();
  const space = await db.orm.public.Space.first({ id: context.id });
  if (!space) throw new Error('空间不存在');
  const next = writeSpaceEmailOverride((space as { settings?: unknown }).settings, userId, enabled);
  await db.orm.public.Space.where({ id: context.id }).update({ settings: next });
  return read();
}