'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@/components/ui/toast';
import { createIdeaDocument } from '@/actions/ai/idea-starter';
import type { PmNode } from '@/lib/import/markdown';
import {
  IDEA_STARTER,
  IDEA_SUGGESTIONS,
  ideaLoadingTitle,
  ideaProgressFor,
  ideaProgressRunMs,
  ideaSkeleton,
  type IdeaType,
} from '@/lib/ai/idea-starter';

/**
 * G70：Idea Starter 弹层。创建过程中按所选类型的四条进度句轮播，成功/失败各走一条 toast。
 * G349：空白页弹层用 `onApply` 把结构写进**当前这篇**文档（官方就是在这页上生成），
 * 名册入口那条仍然新建一篇并按描述命名。
 */
export function IdeaStarterDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply?: (content: PmNode) => void | Promise<void>;
}) {
  const router = useRouter();
  const [type, setType] = useState<IdeaType | null>(null);
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
    const started = Date.now();
    setBusy(true);
    setStep(0);
    timer.current = setInterval(() => {
      setStep((current) => Math.min(current + 1, progress.length - 1));
    }, 420);
    try {
      if (onApply) {
        // 空白页这一路本地是即时生成的，但官方的四段轮播与两态标题是真看得见的过程，
        // 所以先把轮播跑完再落笔。
        const hold = ideaProgressRunMs(progress.length) - (Date.now() - started);
        if (hold > 0) await new Promise((resolve) => setTimeout(resolve, hold));
        await onApply(ideaSkeleton(type, description));
      } else {
        const created = await createIdeaDocument({ type, description });
        router.push(`/documents/${created.id}`);
      }
      toast.add({ type: 'success', title: IDEA_STARTER.success });
      onClose();
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

  const heading = busy ? ideaLoadingTitle(type) : IDEA_STARTER.title;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={heading}
        data-testid="idea-starter"
        className="relative w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-background p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{heading}</h2>
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
