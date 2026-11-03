/**
 * G360: 「查看备份」是文档级一等入口，但能看多久由套餐决定——Free 30 天、Plus/Family 180 天。
 * The panel shows the official quota sentence and hides versions older than the window.
 */

export type BackupPlan = 'free' | 'plus' | 'family';

export const BACKUP_WINDOW_DAYS: Record<BackupPlan, number> = {
  free: 30,
  plus: 180,
  family: 180,
};

/** The current build runs on the Free tier (the settings badge says Free). */
export const CURRENT_BACKUP_PLAN: BackupPlan = 'free';

export const BACKUP_DAY_SENTENCE = '目前显示 [0] 天。';

export function backupWindowDays(plan: BackupPlan): number {
  return BACKUP_WINDOW_DAYS[plan] ?? BACKUP_WINDOW_DAYS.free;
}

export function backupWindowSentence(plan: BackupPlan): string {
  return BACKUP_DAY_SENTENCE.replace('[0]', String(backupWindowDays(plan)));
}

export function versionsInWindow<T extends { createdAt: string }>(
  versions: T[],
  plan: BackupPlan,
  now = Date.now(),
): T[] {
  const cutoff = now - backupWindowDays(plan) * 24 * 60 * 60 * 1000;
  return versions.filter((version) => {
    const at = Date.parse(version.createdAt);
    return Number.isNaN(at) ? true : at >= cutoff;
  });
}
