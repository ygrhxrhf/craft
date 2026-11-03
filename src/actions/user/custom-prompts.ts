'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import {
  appendCustomPrompt,
  readCustomPromptState,
  removeCustomPrompt,
  type CustomPrompt,
} from '@/lib/editor/custom-prompts';

type PromptRow = { prompts?: unknown; promptObjects?: unknown };

async function loadState(db: any, userId: string) {
  const user = (await db.orm.public.User.first({ id: userId })) as PromptRow | null;
  if (!user) throw new Error('用户不存在');
  return readCustomPromptState({ prompts: user.prompts, promptObjects: user.promptObjects });
}

async function storeState(
  db: any,
  userId: string,
  state: { prompts: string[]; promptObjects: CustomPrompt[] },
) {
  await db.orm.public.User.where({ id: userId }).update({
    prompts: JSON.stringify(state.prompts),
    promptObjects: JSON.stringify(state.promptObjects),
  });
  await emitSyncEventSafe(db, userId, ['user'], userId);
}

export async function getCustomPrompts(): Promise<CustomPrompt[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const db = await getDb();
  const state = await loadState(db, session.user.id);
  // read-time migration: the legacy string list is rewritten as the object list once.
  if (state.migrated) await storeState(db, session.user.id, state);
  return state.promptObjects;
}

export type SaveCustomPromptResult =
  | { status: 'saved'; prompts: CustomPrompt[] }
  | { status: 'limit' | 'empty' | 'signed-out'; prompts: CustomPrompt[] };

export async function saveCustomPrompt(text: string): Promise<SaveCustomPromptResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: 'signed-out', prompts: [] };
  const db = await getDb();
  const state = await loadState(db, session.user.id);
  const appended = appendCustomPrompt(state, text);
  if (!appended.ok) return { status: appended.reason, prompts: appended.promptObjects };
  await storeState(db, session.user.id, appended);
  return { status: 'saved', prompts: appended.promptObjects };
}

export async function deleteCustomPrompt(id: string): Promise<{ prompts: CustomPrompt[] }> {
  const session = await auth();
  if (!session?.user?.id) return { prompts: [] };
  const db = await getDb();
  const state = await loadState(db, session.user.id);
  const next = removeCustomPrompt(state, id);
  await storeState(db, session.user.id, next);
  return { prompts: next.promptObjects };
}
