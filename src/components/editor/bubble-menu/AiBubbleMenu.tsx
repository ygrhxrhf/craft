'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Image as ImageIcon, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from 'cn';
import { useAiBubbleStore } from '@/lib/store/use-ai-bubble-store';
import { aiBubbleKey, mainBubbleKey } from './keys';
import { requestImageGen } from '@/components/editor/ai/ImageGenDialog';
import { toast } from '@/components/ui/toast';
import { aiWriteMessage } from '@/lib/editor/ai-write-message';
import {
  fillPromptTemplate,
  promptsInGroup,
  PROMPT_GROUP_LABELS,
  type PromptGroupId,
} from '@/lib/editor/ai-prompt-library';
import type { CustomPrompt } from '@/lib/editor/custom-prompts';
import { SAVED_PROMPTS_TITLE } from '@/lib/editor/custom-prompts';
import { getCustomPrompts } from '@/actions/user/custom-prompts';
import { clearAiHistory, recordAiHistory } from '@/lib/ai/history';
import { promptDialog } from '@/lib/dialog/show';

interface AiBubbleMenuProps {
  editor: Editor;
}

type AiAction = 'rewrite' | 'continue' | 'translate' | 'summarize';

const actions: { id: AiAction; label: string; replace: boolean }[] = [
  { id: 'rewrite', label: '改写', replace: true },
  { id: 'continue', label: '续写', replace: false },
  { id: 'translate', label: '翻译', replace: true },
  { id: 'summarize', label: '总结', replace: true },
];

function rememberAi(source: string, text: string): void {
  if (typeof localStorage === 'undefined') return;
  recordAiHistory(localStorage, { at: Date.now(), source, result: text });
}

interface CapturedSelection {
  from: number;
  to: number;
  text: string;
  action: AiAction;
}

export function AiBubbleMenu({ editor }: AiBubbleMenuProps) {
  const isOpen = useAiBubbleStore((s) => s.isOpen);
  const close = useAiBubbleStore((s) => s.close);
  const [loading, setLoading] = useState<AiAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const capturedRef = useRef<CapturedSelection | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setLoading(null);
    setError(null);
    setResult(null);
    setPendingReplace(false);
    setShowPrompts(false);
  }, []);

  // the bubble plugin only re-evaluates shouldShow on selection/doc changes,
  // so show/hide must go through its explicit transaction meta
  const showBubble = useCallback(() => {
    editor.view.dispatch(
      editor.state.tr.setMeta(aiBubbleKey, 'show').setMeta(mainBubbleKey, 'hide')
    );
  }, [editor]);

  const hideBubble = useCallback(() => {
    editor.view.dispatch(editor.state.tr.setMeta(aiBubbleKey, 'hide'));
  }, [editor]);

  const handleClose = useCallback(() => {
    close();
    reset();
    hideBubble();
  }, [close, reset, hideBubble]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const wasOpen = useAiBubbleStore.getState().isOpen;
        if (wasOpen) {
          handleClose();
          return;
        }
        if (!editor.state.selection.empty) {
          useAiBubbleStore.getState().open();
          showBubble();
        }
        return;
      }
      if (e.key === 'Escape' && useAiBubbleStore.getState().isOpen) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, handleClose]);

  // G120：提示库展开时读一次用户自己保存的提示（per-user，设置在设置页维护）。
  useEffect(() => {
    if (!showPrompts) return;
    let alive = true;
    void getCustomPrompts()
      .then((next) => {
        if (alive) setCustomPrompts(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [showPrompts]);

  const runAction = useCallback(
    async (action: AiAction, replace: boolean) => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      if (!selectedText.trim()) return;

      // capture selection before the await; the selection may drift afterwards
      capturedRef.current = { from, to, text: selectedText, action };
      setPendingReplace(replace);
      setLoading(action);
      setError(null);
      setResult(null);
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, text: selectedText }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'AI 请求失败');
          return;
        }
        setResult(data.text);
        rememberAi(action, data.text);
      } catch {
        setError('网络错误，请重试');
      } finally {
        setLoading(null);
      }
    },
    [editor]
  );

  const runWebSearch = useCallback(async () => {
    const { from, to } = editor.state.selection;
    const query = editor.state.doc.textBetween(from, to, '\n').trim();
    if (!query) return;
    capturedRef.current = { from, to, text: query, action: 'rewrite' };
    setPendingReplace(false);
    setLoading('rewrite');
    setError(null);
    setResult(null);
    setShowPrompts(false);
    try {
      const response = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'web_search', query }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.connectError ? `连接失败：${data.error}` : data.error ?? '联网搜索失败');
        return;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      const text = results.length
        ? results.map((item: { title: string; url: string; snippet: string }) => `${item.title}\n${item.url}\n${item.snippet}`).join('\n\n')
        : '没有找到结果。';
      setResult(text);
      rememberAi('联网搜索', text);
    } catch {
      setError('连接失败，请检查网络');
    } finally {
      setLoading(null);
    }
  }, [editor]);

  const runPdf = useCallback(async (file: File, question: string) => {
    setPendingReplace(false);
    setLoading('summarize');
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('question', question);
      const response = await fetch('/api/ai/pdf', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'PDF 问答失败');
        return;
      }
      setResult(data.text);
      rememberAi('PDF 问答', data.text);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(null);
    }
  }, []);

  const runPrompt = useCallback(
    async (item: { id: string; label: string; prompt: string }) => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      if (!selectedText.trim()) return;
      capturedRef.current = { from, to, text: selectedText, action: 'rewrite' };
      setPendingReplace(true);
      setLoading('rewrite');
      setError(null);
      setResult(null);
      setShowPrompts(false);
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: item.prompt, text: selectedText }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? 'AI 请求失败');
          return;
        }
        setResult(data.text);
        rememberAi(item.label, data.text);
      } catch {
        setError('网络错误，请重试');
      } finally {
        setLoading(null);
      }
    },
    [editor]
  );

  const fillFromSelection = useCallback(
    (template: string) => {
      const { from, to } = editor.state.selection;
      return fillPromptTemplate(template, editor.state.doc.textBetween(from, to, '\n'));
    },
    [editor]
  );

  const applyResult = useCallback(
    (mode: 'replace' | 'insert-below') => {
      const captured = capturedRef.current;
      if (!captured || result === null) return;
      if (mode === 'replace') {
        editor
          .chain()
          .focus()
          .insertContentAt({ from: captured.from, to: captured.to }, result)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContentAt(captured.to, ` ${result}`)
          .run();
      }
      // G50: one visible line describing the write, with the undo action attached
      // to the same result so the two cannot drift apart.
      toast.add({
        id: crypto.randomUUID(),
        type: 'success',
        title: aiWriteMessage(captured.action, mode),
        description: '可撤销',
        actionProps: {
          children: '撤销',
          onClick: () => {
            editor.chain().focus().undo().run();
          },
        },
      });
      handleClose();
    },
    [editor, result, handleClose]
  );

  return (
    <TiptapBubbleMenu
      editor={editor}
      pluginKey={aiBubbleKey}
      className="crafty-bubble-menu"
      options={{ placement: 'top' }}
      shouldShow={({ state, from, to }) =>
        useAiBubbleStore.getState().isOpen && state.selection.from === from && from !== to
      }
    >
      <div className="w-64 rounded-md bg-[rgb(250,250,250)] p-1.5 shadow-md animate-in fade-in-0 zoom-in-95 duration-150 dark:bg-[#242424]">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-meta font-medium text-foreground/40">
            <Sparkles className="size-3.5" />
            AI 助手
            <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px]">
              当前选择 {editor.state.selection.to - editor.state.selection.from} 字
            </span>
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="关闭"
            className="flex size-5 items-center justify-center rounded-md text-foreground/40 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {result === null ? (
          <>
            <div className="grid grid-cols-2 gap-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={loading !== null}
                  onClick={() => runAction(action.id, action.replace)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-ui transition-colors duration-150 ease-craft',
                    'text-foreground/85 hover:bg-foreground/4 disabled:opacity-50'
                  )}
                >
                  {loading === action.id ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Sparkles className="size-3.5 text-muted-foreground" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
            <button
              key="imageGen"
              type="button"
              onClick={() => {
                handleClose();
                requestImageGen(
                  editor.state.doc
                    .textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to,
                      '\n'
                    )
                    .trim() || undefined
                );
              }}
              className={cn(
                'mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-ui transition-colors duration-150 ease-craft',
                'text-foreground/85 hover:bg-foreground/4'
              )}
            >
              <ImageIcon className="size-3.5 text-muted-foreground" />
              生成图像
            </button>
            <button
              type="button"
              onClick={() => setShowPrompts((value) => !value)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/4"
            >
              <Sparkles className="size-3.5 text-muted-foreground" />
              提示库
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void runWebSearch()}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/4 disabled:opacity-50"
            >
              <Sparkles className="size-3.5 text-muted-foreground" />
              联网搜索
            </button>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void (async () => {
                  const question = await promptDialog({
                    title: '询问此 PDF',
                    placeholder: '输入你的问题',
                    confirmLabel: '提问',
                  });
                  if (question) void runPdf(file, question);
                })();
              }}
            />
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => pdfInputRef.current?.click()}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/4 disabled:opacity-50"
            >
              <Sparkles className="size-3.5 text-muted-foreground" />
              询问 PDF
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof localStorage !== 'undefined') clearAiHistory(localStorage);
                handleClose();
              }}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-ui text-muted-foreground transition-colors duration-150 ease-craft hover:bg-foreground/4"
            >
              清除历史
            </button>
            {showPrompts && (
              <div className="mt-1 flex max-h-64 flex-col gap-1 overflow-y-auto">
                {(Object.keys(PROMPT_GROUP_LABELS) as PromptGroupId[]).map((group) => (
                  <div key={group} className="flex flex-col gap-0.5">
                    <div className="px-2 pt-1 text-[10px] font-medium tracking-wide text-foreground/35">
                      {PROMPT_GROUP_LABELS[group]}
                    </div>
                    {promptsInGroup(group).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={loading !== null}
                        onClick={() =>
                          void runPrompt({
                            id: item.id,
                            label: item.label,
                            prompt: fillFromSelection(item.template),
                          })
                        }
                        className="rounded-md px-2 py-1.5 text-left text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/4 disabled:opacity-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
                {customPrompts.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2 pt-1 text-[10px] font-medium tracking-wide text-foreground/35">
                      {SAVED_PROMPTS_TITLE}
                    </div>
                    {customPrompts.map((item) => (
                      <button
                        key={`custom-${item.id}`}
                        type="button"
                        title={item.prompt}
                        disabled={loading !== null}
                        onClick={() =>
                          void runPrompt({ id: item.id, label: item.prompt, prompt: item.prompt })
                        }
                        className="line-clamp-2 rounded-md px-2 py-1.5 text-left text-ui text-foreground/85 transition-colors duration-150 ease-craft hover:bg-foreground/4 disabled:opacity-50"
                      >
                        {item.prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {error && <p className="px-1 pt-1.5 text-meta text-destructive">{error}</p>}
          </>
        ) : (
          <div>
            <div className="max-h-32 overflow-y-auto rounded-md bg-foreground/4 px-2 py-1.5 text-meta leading-relaxed whitespace-pre-wrap">
              {result}
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {pendingReplace && (
                <button
                  type="button"
                  onClick={() => applyResult('replace')}
                  className="flex-1 rounded-lg bg-craft-accent px-2 py-1 text-ui text-white transition-colors duration-150 ease-craft hover:bg-craft-accent-hover"
                >
                  替换选区
                </button>
              )}
              <button
                type="button"
                onClick={() => applyResult('insert-below')}
                className={cn(
                  'rounded-lg px-2 py-1 text-ui transition-colors duration-150 ease-craft',
                  pendingReplace
                    ? 'flex-1 border border-foreground/10 text-foreground/85 hover:bg-foreground/4'
                    : 'flex-1 bg-craft-accent text-white hover:bg-craft-accent-hover'
                )}
              >
                插入到下方
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="取消"
                className="flex size-6 items-center justify-center rounded-md text-foreground/40 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </TiptapBubbleMenu>
  );
}
