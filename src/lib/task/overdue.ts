/**
 * 「自 [0] 起已逾期」(`calendar.overdue.since`). A task is overdue once its due day is before today and
 * it is not completed; the sentence names the day it was due, as month and day.
 */
export function isOverdue(dueDate: string | null, isCompleted: boolean, now: Date = new Date()): boolean {
  if (!dueDate || isCompleted) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return dueDay < today;
}

export function overdueLabel(dueDate: string): string {
  const due = new Date(dueDate);
  return `自 ${due.getMonth() + 1}月${due.getDate()}日 起已逾期`;
}
