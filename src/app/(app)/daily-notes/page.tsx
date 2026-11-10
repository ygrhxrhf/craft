import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { getDailyNotes, getDailyNoteStartTime, getOrCreateDayNote } from '@/actions/daily-notes/daily-notes';
import type { DailyNoteItem } from '@/actions/daily-notes/daily-notes';
import { DAILY_NOTE_BUCKETS, dailyNoteBucket, type DailyNoteBucket } from '@/lib/utils/daily-note-window';
import { TodayNoteButton } from './TodayNoteButton';
import { DailyNotesList } from './DailyNotesList';
import { AppPageContainer } from '@/components/app/AppPageContainer';
import { AppPageHeader } from '@/components/app/AppPageHeader';

const BUCKET_LABELS: Record<DailyNoteBucket, string> = {
  today: '今天',
  yesterday: '昨天',
  week: '7 天内',
  month: '本月早些时候',
  earlier: '更早',
};

export default async function DailyNotesPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;
  if (params?.date) {
    const raw = params.date.trim();
    const match = /^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/.exec(raw);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const targetDate = new Date(year, month - 1, day);
      if (
        targetDate.getFullYear() === year &&
        targetDate.getMonth() === month - 1 &&
        targetDate.getDate() === day
      ) {
        const note = await getOrCreateDayNote(targetDate);
        if (note?.id) {
          redirect(`/documents/${note.id}`);
        }
      }
    }
  }

  // G20：分组必须与 `getOrCreateDayNote` 同源——它按配置的起始时间算日窗，页面此前却按午夜分组，
  // 于是起始时间非 00:00 时同一条笔记在两处被归到不同的天（04:00 起始时凌晨写的那篇落到「昨天」）。
  const [notes, startTime] = await Promise.all([getDailyNotes(), getDailyNoteStartTime()]);

  const now = new Date();
  const byBucket = new Map<DailyNoteBucket, DailyNoteItem[]>();
  for (const note of notes) {
    const date = note.dailyNoteDate ? new Date(note.dailyNoteDate) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const bucket = dailyNoteBucket(date, now, startTime);
    const list = byBucket.get(bucket) ?? [];
    list.push(note);
    byBucket.set(bucket, list);
  }

  const groups: { label: string; notes: DailyNoteItem[] }[] = DAILY_NOTE_BUCKETS.map((bucket) => ({
    label: BUCKET_LABELS[bucket],
    notes: byBucket.get(bucket) ?? [],
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <AppPageHeader title="日记" actions={<TodayNoteButton />} />
      <AppPageContainer className="max-w-3xl">

        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              还没有日记，点击右上角按钮开始今天的第一篇
            </p>
          </div>
        ) : (
          <DailyNotesList groups={groups} />
        )}
      </AppPageContainer>
    </div>
  );
}
