import { reminderInstant } from './task-reminders';

export interface InboxRow {
  id: string;
  title: string;
  kind: string;
  remindAt: string | null;
  documentId: string | null;
  /** G252: set on a block reminder — the block to jump back to when the row is opened. */
  blockId: string | null;
  /** G137: null means unread. Read and resolved are separate axes. */
  readAt: string | null;
}

/**
 * Missing or unparsable times sink to the bottom rather than disappearing: a
 * reminder the user has not resolved is always actionable.
 */
function sortInstant(remindAt: string | null): number {
  if (remindAt === null) return 0;
  const at = reminderInstant(remindAt);
  return Number.isNaN(at) ? 0 : at;
}

/** Read side of the bell, fed by the metadata poll's `Notification` cache. */
export function unreadReminders(rows: Iterable<Record<string, unknown>>): InboxRow[] {
  const inbox: InboxRow[] = [];

  for (const row of rows) {
    if (row.isResolved === true) continue;
    if (typeof row.id !== 'string' || row.id === '') continue;

    inbox.push({
      id: row.id,
      title: typeof row.title === 'string' ? row.title : '',
      kind: typeof row.kind === 'string' ? row.kind : 'taskReminder',
      remindAt: typeof row.remindAt === 'string' ? row.remindAt : null,
      documentId: typeof row.documentId === 'string' ? row.documentId : null,
      blockId: typeof row.blockId === 'string' ? row.blockId : null,
      readAt: typeof row.readAt === 'string' ? row.readAt : null,
    });
  }

  return inbox.sort((a, b) => {
    const byTime = sortInstant(b.remindAt) - sortInstant(a.remindAt);
    if (byTime !== 0) return byTime;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
