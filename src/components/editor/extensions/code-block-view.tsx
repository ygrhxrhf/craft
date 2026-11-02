'use client';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Check, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CODE_LANGUAGES, filterLanguages } from '@/lib/editor/code-languages';
import { appearsInLanguageMenu } from '@/lib/editor/mermaid-surface';
import { storeDefaultLanguage, storeDefaultTheme } from '@/lib/editor/code-preferences';
import { CODE_THEMES, DEFAULT_CODE_THEME, filterThemes, resolveCodeTheme, themeLabel } from '@/lib/editor/code-themes';
import { cn } from 'cn';
import { SearchableSelect } from './searchable-select';
import { MermaidPreview } from './mermaid-preview';

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const language = (node.attrs.language as string) ?? '';
  const themeId = (node.attrs.themeId as string) ?? DEFAULT_CODE_THEME;
  // `auto` reads the app's own light/dark state, which the `.dark` class carries.
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const surface = resolveCodeTheme(themeId, isDark);
  // One gutter cell per line (G1176). An empty block still numbers its single line.
  const lineCount = Math.max(1, (node.textContent ?? '').split('\n').length);
  // mermaid stays out of the menu unless this block already is one (G1177).
  const languages = CODE_LANGUAGES.filter(
    (item) => appearsInLanguageMenu(item.storedLangCode) || item.storedLangCode === language,
  ).map((item) => ({ value: item.storedLangCode, label: item.label }));
  const themes = CODE_THEMES.map((theme) => ({ value: theme.id, label: themeLabel(theme) }));

  // Escape leaves fullscreen, matching the one key a fullscreen surface always answers to.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied; the selection is still there for a manual copy.
    }
  };

  // G1440：块级 `⋯` 菜单的「全屏模式」一枚——菜单在另一棵树里，所以用一次冒泡事件把它接过来。
  // 事件名带 `craft-` 前缀，避免与浏览器/框架的内建事件撞名。
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onFullscreen = () => setFullscreen((prev) => !prev);
    el.addEventListener('craft-code-fullscreen', onFullscreen as EventListener);
    return () => el.removeEventListener('craft-code-fullscreen', onFullscreen as EventListener);
  }, []);

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        'crafty-code-block my-3 overflow-hidden rounded-lg border border-border',
        fullscreen && 'fixed inset-4 z-50 my-0 flex flex-col shadow-2xl',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
        <SearchableSelect
          label="代码语言"
          placeholder="搜索语言"
          value={language}
          options={languages}
          onFilter={(query) => filterLanguages(languages, query)}
          onChange={(next) => {
            updateAttributes({ language: next });
            storeDefaultLanguage(next);
          }}
        />
        <SearchableSelect
          label="代码主题"
          placeholder="搜索主题"
          value={themeId}
          options={themes}
          onFilter={(query) =>
            filterThemes(query)
              .filter((theme) => themes.some((option) => option.value === theme.id))
              .map((theme) => ({ value: theme.id, label: themeLabel(theme) }))
          }
          onChange={(next) => {
            updateAttributes({ themeId: next });
            storeDefaultTheme(next);
          }}
        />
        <button
          type="button"
          onClick={() => setFullscreen((value) => !value)}
          aria-label="全屏模式"
          aria-pressed={fullscreen}
          className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          全屏模式
        </button>
        <button
          type="button"
          onClick={copy}
          aria-label="复制代码"
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {language === 'mermaid' && (
        <MermaidPreview source={node.textContent ?? ''} dark={isDark} />
      )}
      <div
        className={cn('flex', fullscreen && 'min-h-0 flex-1')}
        style={{ background: surface.background, color: surface.foreground }}
      >
        <div
          aria-hidden
          className="code-gutter shrink-0 select-none py-3 text-right font-mono"
          style={{ color: surface.gutterForeground }}
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <pre className="min-w-0 flex-1 overflow-x-auto py-3 pr-3 font-mono">
          <NodeViewContent<'code'> as="code" />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
