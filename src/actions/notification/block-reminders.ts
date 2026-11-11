'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { reminderCompletion, type ReminderCompletion } from '@/lib/task/reminder-entity';

export interface BlockReminderInput {
  blockId: string;
  title: string;
  remindAt: string;
  /** G703：块上那枚完成戳（ISO）；空／缺省＝未解决。 */
  completedAt?: string | null;
}

/** 两枚完成态字段是否已经一致：按毫秒比，避免驱动把 ISO 回读成 `Date` 时反复写。 */
function sameCompletion(row: Record<string, unknown>, next: ReminderCompletion): boolean {
  if (Boolean(row.isCompleted) !== next.isCompleted) return false;
  const current = row.completionDate == null ? null : Date.parse(String(row.completionDate));
  const wanted = next.completionDate ?? null;
  if (current === null || wanted === null) return current === wanted;
  return current === wanted;
}

/**
 * G252 —— 非任务块的提醒投影。正文里那些带 `remindAt` 的段落／标题块是唯一输入，这张表是投影
 * （任务块的提醒仍随 `Task.remindAt` 走，两处不重叠：这里只收 `taskItem` 之外的块）。
 *
 * 对账键是 `(documentId, blockId)`：同一枚块在同一篇文档里只有一枚**当前**提醒。块的 `remindAt`
 * 被改期 ⇒ 是同一枚提醒换了时刻（把 `remindAt` 原地改掉，不铸新行）；被清掉 ⇒ 打墓碑（`deletedAt`），
 * 让别的设备经同一条游标看到"这枚提醒没了"，与 `syncDocumentTasks` 的软删姿态一致。
 */
export async function syncDocumentBlockReminders(
  documentId: string,
  reminders: BlockReminderInput[],
): Promise<void> {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'editor');

  const db = await getDb();
  const existing: Record<string, unknown>[] = await db.orm.public.BlockReminder
    .where({ documentId, userId })
    .all();

  const byBlock = new Map(
    existing
      .filter((row) => typeof row.blockId === 'string' && row.blockId)
      .map((row) => [String(row.blockId), row]),
  );
  const incoming = new Map(reminders.map((reminder) => [reminder.blockId, reminder]));

  let mutated = false;

  for (const [blockId, reminder] of incoming) {
    const match = byBlock.get(blockId);
    // G703 —— 完成戳单独算：`isCompleted`／`completionDate` 一起写，`remindAt` 与标题照旧保留，
    // 于是「已解决」的提醒仍然带着它原本的时刻（官方 completionDate 与 dueDate 并存）。
    const completion = reminderCompletion(reminder.completedAt);
    const completionDate =
      completion.completionDate == null ? null : new Date(completion.completionDate).toISOString();
    if (match) {
      const tombstoned = Boolean(match.deletedAt);
      if (
        tombstoned ||
        match.title !== reminder.title ||
        String(match.remindAt ?? '') !== reminder.remindAt ||
        !sameCompletion(match, completion)
      ) {
        await db.orm.public.BlockReminder.where({ id: match.id as string }).update({
          ...(tombstoned ? { deletedAt: null, updatedAt: new Date().toISOString() } : {}),
          title: reminder.title,
          remindAt: reminder.remindAt,
          isCompleted: completion.isCompleted,
          completionDate,
        });
        mutated = true;
      }
    } else {
      await db.orm.public.BlockReminder.create({
        id: crypto.randomUUID(),
        userId,
        documentId,
        blockId,
        title: reminder.title,
        remindAt: reminder.remindAt,
        isCompleted: completion.isCompleted,
        completionDate,
      });
      mutated = true;
    }
  }

  for (const row of existing) {
    if (typeof row.blockId === 'string' && !incoming.has(row.blockId) && !row.deletedAt) {
      await db.orm.public.BlockReminder.where({ id: row.id as string }).update({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mutated = true;
    }
  }

  if (mutated) await emitSyncEventSafe(db, userId, ['block_reminder'], documentId);
}
