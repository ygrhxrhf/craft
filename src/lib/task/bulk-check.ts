/**
 * G106: the bulk check is state-driven, not a flip. If any row in the list is
 * still unchecked, one action completes them all; once every row is checked,
 * the same action unchecks them. Cancelled rows are a third state and stay put.
 */

export interface CheckableTask {
  id: string;
  isCompleted: boolean;
  status?: string | null;
}

export function bulkCheckCandidates<T extends CheckableTask>(tasks: T[]): T[] {
  return tasks.filter((task) => task.status !== 'cancelled');
}

/** The rows a bulk toggle would touch — only the ones that need to change. */
export function bulkCheckTargets<T extends CheckableTask>(tasks: T[]): T[] {
  const candidates = bulkCheckCandidates(tasks);
  const anyUnchecked = candidates.some((task) => !task.isCompleted);
  return candidates.filter((task) => task.isCompleted !== anyUnchecked);
}

export function bulkCheckLabel(tasks: CheckableTask[]): string {
  const anyUnchecked = bulkCheckCandidates(tasks).some((task) => !task.isCompleted);
  return anyUnchecked ? '全部完成' : '全部取消勾选';
}
