'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  FEEDBACK_EMOJI_ROWS,
  FEEDBACK_KEYS,
  FEEDBACK_SUBJECT_PLACEHOLDER,
  FEEDBACK_SUBMIT_LABEL,
  canSubmitFeedback,
  rateAppInStore,
  showFeedbackEmail,
  storeRatingAvailable,
} from '@/lib/app/feedback';
import { useFeedbackStore } from '@/lib/store/use-feedback-store';
import { escapeKeyDef, focusStack } from '@/lib/focus/focus-stack';
import { cn } from 'cn';

/**
 * G1414：反馈弹窗。形态照屏上真值：有遮罩（`popup-backdrop=1`）但 **overlay 不带
 * `role=dialog`**（官方读到 `role=dialog=0`），所以这里是自绘层，不走 `ui/dialog`。
 * 13 条键逐字在 `FEEDBACK_KEYS`；「邮箱」格只在匿名用户下出现（本地恒登录 ⇒ 不渲染）。
 * 提交止于感谢屏——本地没有采集端，不发明网络目标。
 */
export function FeedbackDialog() {
  const open = useFeedbackStore((s) => s.open);
  const view = useFeedbackStore((s) => s.view);
  const close = useFeedbackStore((s) => s.close);
  const setView = useFeedbackStore((s) => s.setView);
  const [moods, setMoods] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // G479/G1414：Esc 与设置同一套焦点栈注册。
  useEffect(() => {
    if (!open) return;
    focusStack.push({ id: 'feedback', keyDefs: [escapeKeyDef(close)] });
    return () => focusStack.remove('feedback');
  }, [open, close]);

  // 关掉时把上一轮的草稿清空。渲染期跟随 `open` 调整，不用 effect 等一帧。
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (!open) {
      setMoods([]);
      setSubject('');
      setMessage('');
    }
  }

  if (!open) return null;

  const toggleMood = (emoji: string) =>
    setMoods((prev) => (prev.includes(emoji) ? prev.filter((m) => m !== emoji) : [...prev, emoji]));

  const submit = () => {
    if (!canSubmitFeedback({ moods, subject, message })) return;
    setView('thanks');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/16" onClick={close} aria-hidden="true" />
      <div
        data-feedback-dialog
        aria-label={FEEDBACK_KEYS['feedback.feel.about.craft']}
        className="relative flex w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl bg-background p-5 shadow-(--shadow-md)"
      >
        <button
          type="button"
          onClick={close}
          aria-label="关闭"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-foreground/6"
        >
          <X className="size-4" />
        </button>

        {view === 'thanks' ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="text-[17px] font-semibold">{FEEDBACK_KEYS['feedback.thanks.title']}</div>
            <div className="mt-2 text-[13px] text-foreground/70">
              {FEEDBACK_KEYS['feedback.thanks.subtitle']}
            </div>
            <div className="mt-1 text-[13px] text-foreground/70">
              {FEEDBACK_KEYS['feedback.thanks.support']}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => (storeRatingAvailable() ? setView('rate') : close())}
            >
              {FEEDBACK_KEYS['feedback.thanks.secondarybutton']}
            </Button>
          </div>
        ) : view === 'rate' ? (
          /* 评分引导是独立的一条：按钮体在官方是 `window.topApi.rateAppInStore()`（交给桌面壳）。
             本地只有存在该宿主时才走到这一屏；无宿主时「以后再说」直接落下。 */
          <div className="flex flex-col items-center py-6 text-center">
            <div className="text-[17px] font-semibold">{FEEDBACK_KEYS['feedback.rate.craft']}</div>
            <div className="mt-2 text-[13px] text-foreground/70">
              {FEEDBACK_KEYS['feedback.rate.in.store']}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  rateAppInStore();
                  close();
                }}
              >
                {FEEDBACK_KEYS['feedback.rate.craft']}
              </Button>
              <Button variant="ghost" size="sm" onClick={close}>
                {FEEDBACK_KEYS['feedback.thanks.secondarybutton']}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="pr-6 text-[17px] font-semibold">
              {FEEDBACK_KEYS['feedback.feel.about.craft']}
            </div>
            <div className="mt-1 text-[13px] text-foreground/60">
              {FEEDBACK_KEYS['feedback.form.subtitle']}
            </div>

            <div className="mt-4 flex flex-col gap-2" role="group" aria-label={FEEDBACK_KEYS['feedback.form.subtitle']}>
              {FEEDBACK_EMOJI_ROWS.map((row) => (
                <div key={row.join('')} className="flex justify-center gap-3">
                  {row.map((emoji) => {
                    const active = moods.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        aria-pressed={active}
                        aria-label={emoji}
                        onClick={() => toggleMood(emoji)}
                        className={cn(
                          'flex size-9 items-center justify-center rounded-full text-xl transition-colors',
                          active ? 'bg-(--craft-accent)/15 ring-2 ring-(--craft-accent)' : 'hover:bg-foreground/6',
                        )}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-foreground/60">
              {FEEDBACK_KEYS['feedback.input.subtitle']}
            </div>

            {showFeedbackEmail(false) && (
              <Input className="mt-3" aria-label={FEEDBACK_KEYS['feedback.email.optional']} placeholder={FEEDBACK_KEYS['feedback.email.optional']} />
            )}
            <Input
              className="mt-3"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              aria-label={FEEDBACK_SUBJECT_PLACEHOLDER}
              placeholder={FEEDBACK_SUBJECT_PLACEHOLDER}
            />
            <Textarea
              className="mt-2 min-h-[96px]"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label={FEEDBACK_KEYS['feedback.input.like.or.not']}
              placeholder={FEEDBACK_KEYS['feedback.input.like.or.not']}
            />

            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                disabled={!canSubmitFeedback({ moods, subject, message })}
                onClick={submit}
              >
                {FEEDBACK_SUBMIT_LABEL}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}