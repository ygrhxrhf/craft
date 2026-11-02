/**
 * G1597/G1598 —— 两条任务时间动作的四档同名面板，唯一差别是动词：
 * 截止＝「将截止日期设为今天/明天/下周一/按日期设定截止日期…」；
 * 排期＝「安排到今天/明天/下周一/按日期安排…」。
 */

export type TaskDateMenuKind = 'deadline' | 'schedule';

export function taskDateMenuTitle(kind: TaskDateMenuKind): string {
  return kind === 'deadline' ? '设定截止日期' : '计划任务';
}

export function taskDateOptions(
  kind: TaskDateMenuKind,
  today = new Date(),
): { key: 'today' | 'tomorrow' | 'nextMonday'; label: string; date: Date }[] {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextMonday = new Date(today);
  // Monday is next week's Monday even when today is a Monday.
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  const prefix = kind === 'deadline' ? '将截止日期设为' : '安排到';
  return [
    { key: 'today', label: `${prefix}今天`, date: today },
    { key: 'tomorrow', label: `${prefix}明天`, date: tomorrow },
    { key: 'nextMonday', label: `${prefix}下周一`, date: nextMonday },
  ];
}

export function taskDateCustomLabel(kind: TaskDateMenuKind): string {
  return kind === 'deadline' ? '按日期设定截止日期…' : '按日期安排…';
}
