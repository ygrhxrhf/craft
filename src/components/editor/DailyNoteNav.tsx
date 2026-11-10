'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOrCreateDayNote } from '@/actions/daily-notes/daily-notes';

/**
 * 前一天 / 后一天 on an open daily note (G20). Each opens that day's note, creating it when the day
 * has none yet, the same way the today button does.
 */
export function DailyNoteNav() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const go = async (step: -1 | 1) => {
    if (busy) return;
    setBusy(true);
    try {
      const note = await getOrCreateDayNote(step);
      router.push(`/documents/${note.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-2 flex items-center gap-1 text-meta text-foreground/55">
      <button
        type="button"
        onClick={() => void go(-1)}
        disabled={busy}
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-1 hover:bg-foreground/4 hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        前一天
      </button>
      <button
        type="button"
        onClick={() => void go(1)}
        disabled={busy}
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-1 hover:bg-foreground/4 hover:text-foreground"
      >
        后一天
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
