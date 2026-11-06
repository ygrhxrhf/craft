'use server';

import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import {
  appendIgnoreRule as appendRule,
  matchesByRule,
  parseIgnoreRules,
  removeIgnoreRule as removeRule,
  renameIgnoreRule as renameRule,
  type IgnoreRule,
} from '@/lib/tag/ignore-rules';

export type { IgnoreRule };

async function readRules(userId: string): Promise<IgnoreRule[]> {
  const db = await getDb();
  const user = await db.orm.public.User.first({ id: userId });
  return parseIgnoreRules((user as { tagIgnoreRules?: unknown } | null)?.tagIgnoreRules);
}

async function writeRules(rules: IgnoreRule[]): Promise<IgnoreRule[]> {
  const userId = await requireUserId();
  const db = await getDb();
  await db.orm.public.User.where({ id: userId }).update({ tagIgnoreRules: rules });
  // `user` 在 SYNC_TABLES 里 ⇒ 其它设备下一次轮询就能拿到新的规则列表。
  await emitSyncEventSafe(db, userId, ['user'], userId);
  return rules;
}

/** G171：设置页的忽略列表。 */
export async function getIgnoreRules(): Promise<IgnoreRule[]> {
  return readRules(await requireUserId());
}

/**
 * G171：规则＋每条规则命中的标签名——设置页展示「被自定义规则忽略的标签：[0]」用。
 * 这里读**未过滤**的标签，否则来源标注永远为空。
 */
export async function getIgnoreOverview(): Promise<{ rules: IgnoreRule[]; matches: Record<string, string[]> }> {
  const userId = await requireUserId();
  const rules = await readRules(userId);
  const db = await getDb();
  const tags = (await db.orm.public.Tag.where({ userId, deletedAt: null }).all()) as { name: string }[];
  return { rules, matches: matchesByRule(tags, rules) };
}

/** 追加一条忽略规则；重复文本不新增。返回最新的整份列表。 */
export async function addIgnoreRule(text: string): Promise<IgnoreRule[]> {
  const userId = await requireUserId();
  const rules = await readRules(userId);
  const next = appendRule(rules, text, crypto.randomUUID());
  if (!next.added) return next.rules;
  return writeRules(next.rules);
}

export async function renameIgnoreRule(id: string, text: string): Promise<IgnoreRule[]> {
  const userId = await requireUserId();
  return writeRules(renameRule(await readRules(userId), id, text));
}

export async function deleteIgnoreRule(id: string): Promise<IgnoreRule[]> {
  const userId = await requireUserId();
  return writeRules(removeRule(await readRules(userId), id));
}