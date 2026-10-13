'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { dailyNoteTitle } from '@/lib/utils/daily-note';
import { dayWindow } from '@/lib/utils/daily-note-window';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export interface DailyNoteItem {
  id: string;
  title: string;
  icon: string | null;
  plainText: string;
  dailyNoteDate: string;
  updatedAt: string;
}

export async function getDailyNotes(): Promise<DailyNoteItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const notes = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false, isDailyNote: true })
    .orderBy((d: any) => d.dailyNoteDate.desc())
    .limit(120)
    .all();

  return notes.map((n: any) => ({
    id: n.id,
    title: n.title,
    icon: n.icon,
    plainText: n.plainText ?? '',
    dailyNoteDate: n.dailyNoteDate,
    updatedAt: n.updatedAt,
  }));
}

export async function getOrCreateTodayNote() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const uid = session.user.id;

  const db = await getDb();
  const now = new Date();

  // The config carries a start time (G20): with one set, a moment before it belongs to the
  // previous day's note. Read the config first so the day window is the configured one.
  const config = await db.orm.public.DailyNotesConfig.first({ userId: uid });
  const startTime = config ? ((config as any).startTime as string | null) : null;
  const { start, end } = dayWindow(now, startTime);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const existing = await db.orm.public.Document
    .where({ userId: uid, isDeleted: false, isDailyNote: true })
    .where((d: any) => d.dailyNoteDate.gte(startIso))
    .where((d: any) => d.dailyNoteDate.lte(endIso))
    .limit(1)
    .all();

  if (existing.length > 0) {
    const n = existing[0] as any;
    return { id: n.id, created: false };
  }

  const folderId = config ? (config as any).folderId : null;

  const doc = await db.orm.public.Document.create({
    id: crypto.randomUUID(),
    title: dailyNoteTitle(start),
    icon: '📅',
    userId: uid,
    folderId,
    isDailyNote: true,
    dailyNoteDate: startIso,
    // No DB default on metaUpdatedAt; without it new rows never enter the
    // incremental-sync stream (document tsCol is metaUpdatedAt).
    metaUpdatedAt: now.toISOString(),
  });

  await emitSyncEventSafe(db, uid, ['document'], (doc as any).id ?? uid);
  return { id: (doc as any).id as string, created: true };
}
