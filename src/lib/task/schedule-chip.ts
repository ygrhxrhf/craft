/**
 * G371 —— 任务行的 schedule 芯片：日历图标 + 中文短日期（月日、无年份，如「10月9日」）。
 * 未设日期时返回 `null`，调用点退回只剩图标的那副面孔。
 */
export function scheduleChipLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
