'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import {
  assistantAvailable,
  parseDisabledSpaces,
  setSpaceDisabled,
  type AssistantAccess,
} from '@/lib/ai/assistant-access';

export interface AssistantSettings {
  enabled: boolean;
  spaceId: string | null;
  spaceEnabled: boolean;
  available: boolean;
}

type Row = { assistantEnabled?: unknown; assistantDisabledSpaces?: unknown };

async function currentSpaceId(db: any, userId: string): Promise<string | null> {
  const membership = await db.orm.public.SpaceMember.first({ userId });
  if (membership) return String(membership.spaceId);
  const owned = await db.orm.public.Space.first({ ownerId: userId });
  return owned ? String(owned.id) : null;
}

async function loadAccess(db: any, userId: string) {
  const user = (await db.orm.public.User.first({ id: userId })) as Row | null;
  if (!user) throw new Error('用户不存在');
  const access: AssistantAccess = {
    enabled: user.assistantEnabled !== false,
    disabledSpaces: parseDisabledSpaces(user.assistantDisabledSpaces),
  };
  const spaceId = await currentSpaceId(db, userId);
  return { access, spaceId };
}

function toSettings(access: AssistantAccess, spaceId: string | null): AssistantSettings {
  return {
    enabled: access.enabled,
    spaceId,
    spaceEnabled: spaceId === null ? access.enabled : !access.disabledSpaces.includes(spaceId),
    available: assistantAvailable(access, spaceId),
  };
}

async function store(db: any, userId: string, access: AssistantAccess) {
  await db.orm.public.User.where({ id: userId }).update({
    assistantEnabled: access.enabled,
    assistantDisabledSpaces: JSON.stringify(access.disabledSpaces),
  });
  await emitSyncEventSafe(db, userId, ['user'], userId);
}

export async function getAssistantSettings(): Promise<AssistantSettings> {
  const session = await auth();
  if (!session?.user?.id) {
    return { enabled: false, spaceId: null, spaceEnabled: false, available: false };
  }
  const db = await getDb();
  const { access, spaceId } = await loadAccess(db, session.user.id);
  return toSettings(access, spaceId);
}

export async function setAssistantEnabled(enabled: boolean): Promise<AssistantSettings> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const db = await getDb();
  const { access, spaceId } = await loadAccess(db, session.user.id);
  const next = { ...access, enabled: Boolean(enabled) };
  await store(db, session.user.id, next);
  return toSettings(next, spaceId);
}

export async function setSpaceAssistantEnabled(enabled: boolean): Promise<AssistantSettings> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const db = await getDb();
  const { access, spaceId } = await loadAccess(db, session.user.id);
  if (!spaceId) throw new Error('没有可用的空间');
  const next = setSpaceDisabled(access, spaceId, Boolean(enabled));
  await store(db, session.user.id, next);
  return toSettings(next, spaceId);
}

/** Server-side gate for the AI route: false means 助手已禁用 on both axes. */
export async function assistantAvailableForUser(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const db = await getDb();
  const { access, spaceId } = await loadAccess(db, session.user.id);
  return assistantAvailable(access, spaceId);
}
