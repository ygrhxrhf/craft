'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import {
  deleteCustomPrompt,
  getCustomPrompts,
  saveCustomPrompt,
} from '@/actions/user/custom-prompts';
import { operationFailed } from '@/lib/errors/alert-copy';
import {
  CREATE_CUSTOM_PROMPT,
  CUSTOM_PROMPT_LIMIT_TOAST_MS,
  customPromptLimitDesc,
  MAX_PROMPT_CHARS,
  SAVED_PROMPTS_TITLE,
  type CustomPrompt,
} from '@/lib/editor/custom-prompts';

/** G120: the assistant settings panel — saved custom prompts, per user. */
export function AssistantPanel() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void getCustomPrompts()
      .then((next) => {
        if (alive) setPrompts(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const add = async () => {
    if (busy || !draft.trim()) return;
    setBusy(true);
    try {
      const result = await saveCustomPrompt(draft);
      if (result.status === 'limit') {
        toast.add({
          type: 'error',
          title: customPromptLimitDesc(),
          timeout: CUSTOM_PROMPT_LIMIT_TOAST_MS,
        });
      } else if (result.status === 'saved') {
        setPrompts(result.prompts);
        setDraft('');
      }
    } catch {
      toast.add({ type: 'error', title: operationFailed(null) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const result = await deleteCustomPrompt(id);
      setPrompts(result.prompts);
    } catch {
      toast.add({ type: 'error', title: operationFailed(null) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="assistant-settings">
      <div>
        <h3 className="text-[15px] font-semibold">{SAVED_PROMPTS_TITLE}</h3>
        <p className="mt-1 text-[13px] text-foreground/55">{customPromptLimitDesc()}</p>

        <div className="mt-3 space-y-1.5">
          {loaded && prompts.length === 0 && (
            <div className="rounded-xl bg-foreground/4 px-4 py-3 text-[13px] text-foreground/55">
              还没有保存的提示。
            </div>
          )}
          {prompts.map((item) => (
            <div
              key={item.id}
              data-testid="saved-prompt"
              className="flex items-start gap-3 rounded-xl bg-foreground/4 px-4 py-3"
            >
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {item.prompt}
              </p>
              <button
                type="button"
                onClick={() => void remove(item.id)}
                disabled={busy}
                aria-label="删除提示"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-foreground/4 p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            aria-label={CREATE_CUSTOM_PROMPT}
            placeholder={CREATE_CUSTOM_PROMPT}
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-foreground/35"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[12px] tabular-nums text-foreground/45">
              {draft.length}/{MAX_PROMPT_CHARS}
            </span>
            <button
              type="button"
              onClick={() => void add()}
              disabled={busy || !draft.trim()}
              className="rounded-md bg-(--craft-accent) px-3 py-1 text-[12px] text-white transition-colors hover:bg-(--craft-accent-hover) disabled:opacity-50"
            >
              {CREATE_CUSTOM_PROMPT}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
