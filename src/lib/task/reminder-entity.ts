/**
 * G252 —— 提醒可挂在**任意区块**上，不只任务块（`tasks.md` §五）。
 *
 * 官方那支 `X7e(reminder, patch, …)`：
 *   1. 先 `EW(i, reason)` 做统一富集/校验；
 *   2. **块提醒**（`Gl(i)`）：补 `deeplinkUrl = buildDynamicDeeplinkToBlock({blockId, documentId, spaceId, editingAllowed:true})`；
 *   3. 日程型（`o9(i)`）走第二分支；
 *   4. 两者都不是 ⇒ 只记 `warn` 日志 `"Unknown reminder type"` 并带上 JSON，**不抛错**。
 * 另：resolve/unresolve 是一等动作（`isCompleted` + `completionDate`）；新建的提醒 id 用前缀
 * `new_reminder_` ⇒ **未落库的临时提醒靠 id 前缀识别**。
 */

/** 未落库的临时提醒 id 前缀（官方 `J7e`/`jzt`/`Rzt` 都用它）。 */
export const TEMP_REMINDER_PREFIX = 'new_reminder_';

export function isTempReminder(id: string): boolean {
  return id.startsWith(TEMP_REMINDER_PREFIX);
}

export function mintTempReminderId(uuid: string): string {
  return `${TEMP_REMINDER_PREFIX}${uuid}`;
}

export type ReminderKind = 'block' | 'schedule';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  blockId?: string;
  documentId?: string;
  spaceId?: string;
  isCompleted: boolean;
  completionDate?: number;
  deeplinkUrl?: string;
}

/**
 * 块提醒的深链：官方那句 `buildDynamicDeeplinkToBlock({blockId, documentId, spaceId, editingAllowed:true})`
 * ——**带 `editingAllowed`**，所以从提醒点进去是可编辑的，不是只读快照。
 */
export function buildDynamicDeeplinkToBlock(input: {
  blockId: string;
  documentId: string;
  spaceId?: string;
  editingAllowed: boolean;
}): string {
  const params = new URLSearchParams();
  params.set('blockId', input.blockId);
  params.set('documentId', input.documentId);
  if (input.spaceId) params.set('spaceId', input.spaceId);
  params.set('editingAllowed', String(input.editingAllowed));
  return `craftdocs://block?${params.toString()}`;
}

export type ReminderEnrich =
  | { kind: 'block'; reminder: Reminder }
  | { kind: 'schedule'; reminder: Reminder }
  | { kind: 'unknown'; warning: string };

/**
 * 统一富集：块提醒补深链；日程型原样；两者都不是 ⇒ 返回 `unknown` 与那句 `warn`（不抛错）。
 * 调用方据 `kind` 分派，`unknown` 只记日志。
 */
export function enrichReminder(reminder: Reminder): ReminderEnrich {
  if (reminder.kind === 'block') {
    if (!reminder.blockId || !reminder.documentId) {
      return { kind: 'unknown', warning: 'Unknown reminder type' };
    }
    return {
      kind: 'block',
      reminder: {
        ...reminder,
        deeplinkUrl: buildDynamicDeeplinkToBlock({
          blockId: reminder.blockId,
          documentId: reminder.documentId,
          spaceId: reminder.spaceId,
          editingAllowed: true,
        }),
      },
    };
  }
  if (reminder.kind === 'schedule') return { kind: 'schedule', reminder };
  return { kind: 'unknown', warning: 'Unknown reminder type' };
}

/** resolve：置 `isCompleted` 并写 `completionDate`（官方 `Dzt`）。 */
export function resolveReminder(reminder: Reminder, now: number): Reminder {
  return { ...reminder, isCompleted: true, completionDate: now };
}

/** unresolve：把 `completionDate` 清成 `undefined`（官方反向那支）。 */
export function unresolveReminder(reminder: Reminder): Reminder {
  return { ...reminder, isCompleted: false, completionDate: undefined };
}
