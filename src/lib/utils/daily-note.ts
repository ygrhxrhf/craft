export function dailyNoteTitle(date: Date): string {
  const now = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  const prefix = date.getFullYear() === now.getFullYear() ? '' : `${date.getFullYear()}年`;
  return `${prefix}${month}月${day}日 ${weekday}`;
}

/**
 * G356 —— 每日笔记的标题是**派生值**：由 `dailyNoteDate` + 当前 locale 现场合成，
 * 取不到日期才回退存下的 `title`。这样跨年/换语言时标题跟着变，不会停留在建档那天的串。
 */
export function dailyNoteDisplayTitle(doc: {
  isDailyNote?: boolean | null;
  dailyNoteDate?: string | null;
  title?: string | null;
}): string {
  if (doc.isDailyNote && doc.dailyNoteDate) {
    const date = new Date(doc.dailyNoteDate);
    if (!Number.isNaN(date.getTime())) return dailyNoteTitle(date);
  }
  return doc.title ?? '';
}
