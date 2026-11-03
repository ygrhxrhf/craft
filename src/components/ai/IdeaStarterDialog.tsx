'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@/components/ui/toast';
import { createIdeaDocument } from '@/actions/ai/idea-starter';
import {
  IDEA_STARTER,
  IDEA_SUGGESTIONS,
  ideaProgressFor,
  type IdeaType,
} from '@/lib/ai/idea-starter';

/**
 * G70：Idea Starter 弹层。创建过程中按所选类型的四条进度句轮播，成功/失败各走一条 toast。
 */
export function IdeaStarterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<IdeaType>('guide');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setStep(0);
      setDescription('');
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    }
  }, [open]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  if (!open) return null;

  const progress = ideaProgressFor(type);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setStep(0);
    timer.current = setInterval(() => {
      setStep((current) => Math.min(current + 1, progress.length - 1));
    }, 420);
    try {
      const created = await createIdeaDocument({ type, description });
      toast.add({ type: 'success', title: IDEA_STARTER.success });
      onClose();
      router.push(`/documents/${created.id}`);
    } catch {
      toast.add({
        type: 'error',
        title: IDEA_STARTER.errorTitle,
        description: IDEA_STARTER.errorSubtitle,
      });
      setBusy(false);
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={IDEA_STARTER.title}
        data-testid="idea-starter"
        className="relative w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-background p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{IDEA_STARTER.title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/55">{IDEA_STARTER.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {IDEA_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              aria-pressed={type === suggestion.id}
              disabled={busy}
              onClick={() => setType(suggestion.id)}
              className="rounded-md border border-foreground/10 px-2.5 py-1 text-[13px] transition-colors hover:bg-foreground/4 aria-pressed:border-foreground/40 aria-pressed:bg-foreground/6 disabled:opacity-50"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          disabled={busy}
          aria-label={IDEA_STARTER.placeholder}
          placeholder={IDEA_STARTER.placeholder}
          className="mt-3 w-full resize-none rounded-lg border border-input bg-transparent p-3 text-[13px] leading-relaxed outline-none transition-colors focus:border-ring disabled:opacity-60"
        />

        <div className="mt-1 h-5 text-[12px] text-foreground/55" role="status" aria-live="polite">
          {busy && progress[step]}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-[13px] text-foreground/70 transition-colors hover:bg-foreground/4 disabled:opacity-50"
          >
            {IDEA_STARTER.close}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-md bg-(--craft-accent) px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-(--craft-accent-hover) disabled:opacity-50"
          >
            {IDEA_STARTER.create}
          </button>
        </div>
      </div>
    </div>
  );
}
