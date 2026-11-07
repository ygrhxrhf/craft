import { repeatAnchorNote } from '@/lib/task/repeat-anchor';

/**
 * G637: the official repeat panel explains the anchor it is set to in a banner painted with
 * `var(--accent-200)` on `var(--accent-500)`. The sentence differs per anchor; both are verbatim
 * (`tasks.complete.task.decs` / `tasks.task.rescheduled.to.x.later`).
 */
export function RepeatAnchorNote({ raw }: { raw: string | null }) {
  const note = repeatAnchorNote(raw);
  if (!note) return null;
  return (
    <p
      data-testid="repeat-anchor-note"
      data-i18n-key={note.key}
      className="rounded-md bg-[var(--accent-200)] px-2 py-1 text-[11px] leading-snug text-[var(--accent-500)]"
    >
      {note.text}
    </p>
  );
}