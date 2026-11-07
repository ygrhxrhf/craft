'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { getCustomPrompts, deleteCustomPrompt, saveCustomPrompt } from '@/actions/user/custom-prompts';
import {
  getAssistantSettings,
  setAssistantEnabled,
  setSpaceAssistantEnabled,
  type AssistantSettings,
} from '@/actions/user/assistant';
import { Switch } from '@/components/ui/switch';
import {
  ASSISTANT_DISABLED,
  ENABLE_ASSISTANT,
  ENABLE_ASSISTANT_DESC,
  SPACE_ASSISTANT_DESC,
} from '@/lib/ai/assistant-access';
import { operationFailed } from '@/lib/errors/alert-copy';
import { clearAiHistory } from '@/lib/ai/history';
import { CLEAR_HISTORY_CONFIRM, CLEAR_HISTORY_LABEL } from '@/lib/ai/conversation-copy';
import { confirmDialog } from '@/lib/dialog/show';
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
  const [settings, setSettings] = useState<AssistantSettings | null>(null);

  useEffect(() => {
    let alive = true;
    void getAssistantSettings()
      .then((next) => {
        if (alive) setSettings(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const toggleUser = async (enabled: boolean) => {
    setBusy(true);
    try {
      setSettings(await setAssistantEnabled(enabled));
    } catch {
      toast.add({ type: 'error', title: operationFailed(null) });
    } finally {
      setBusy(false);
    }
  };

  const toggleSpace = async (enabled: boolean) => {
    setBusy(true);
    try {
      setSettings(await setSpaceAssistantEnabled(enabled));
    } catch {
      toast.add({ type: 'error', title: operationFailed(null) });
    } finally {
      setBusy(false);
    }
  };

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
        <div className="flex items-center justify-between gap-4 rounded-xl bg-foreground/4 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium">{ENABLE_ASSISTANT}</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/55">
              {ENABLE_ASSISTANT_DESC}
            </p>
          </div>
          <Switch
            checked={settings?.enabled ?? true}
            disabled={busy || settings === null}
            onCheckedChange={(next) => void toggleUser(next === true)}
            className="data-checked:bg-(--craft-accent)"
          />
        </div>
        {settings && !settings.enabled && (
          <p role="status" className="mt-2 text-[12px] text-muted-foreground">
            {ASSISTANT_DISABLED}
          </p>
        )}

        <p className="mt-4 text-[13px] leading-relaxed text-foreground/55">
          {SPACE_ASSISTANT_DESC}
        </p>
        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl bg-foreground/4 px-4 py-3">
          <div className="text-[13px] font-medium">此空间</div>
          <Switch
            checked={settings?.spaceEnabled ?? true}
            disabled={busy || settings === null || !settings.enabled}
            onCheckedChange={(next) => void toggleSpace(next === true)}
            className="data-checked:bg-(--craft-accent)"
          />
        </div>
      </div>

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

      {/* G39 `clear.history`：AI 结果只存在本机，设置内清空即删掉全部本地历史。
          G123：官方给"清除历史"配了一句无法撤销的确认（与"删除对话"各一句）⇒ 清空之前先问。 */}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-foreground/4 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium">AI 历史</div>
          <p className="mt-0.5 text-[12px] text-foreground/55">清除保存在此设备上的全部 AI 结果。</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void confirmDialog({
              title: CLEAR_HISTORY_LABEL,
              message: CLEAR_HISTORY_CONFIRM,
              confirmLabel: CLEAR_HISTORY_LABEL,
            }).then((confirmed) => {
              if (!confirmed) return;
              clearAiHistory(window.localStorage);
              toast.add({ type: 'success', title: '已清除 AI 历史' });
            });
          }}
          className="shrink-0 rounded-md border border-border px-3 py-1 text-[12px] transition-colors hover:bg-foreground/6"
        >
          {CLEAR_HISTORY_LABEL}
        </button>
      </div>
    </div>
  );
}
