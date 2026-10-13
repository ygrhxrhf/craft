'use client';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { CODE_LANGUAGES, filterLanguages } from '@/lib/editor/code-languages';
import { appearsInLanguageMenu } from '@/lib/editor/mermaid-surface';
import { CODE_THEMES, DEFAULT_CODE_THEME, filterThemes, resolveCodeTheme, themeLabel } from '@/lib/editor/code-themes';
import { SearchableSelect } from './searchable-select';

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as string) ?? '';
  const themeId = (node.attrs.themeId as string) ?? DEFAULT_CODE_THEME;
  // `auto` reads the app's own light/dark state, which the `.dark` class carries.
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const surface = resolveCodeTheme(themeId, isDark);
  // mermaid stays out of the menu unless this block already is one (G1177).
  const languages = CODE_LANGUAGES.filter(
    (item) => appearsInLanguageMenu(item.storedLangCode) || item.storedLangCode === language,
  ).map((item) => ({ value: item.storedLangCode, label: item.label }));
  const themes = CODE_THEMES.map((theme) => ({ value: theme.id, label: themeLabel(theme) }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied; the selection is still there for a manual copy.
    }
  };

  return (
    <NodeViewWrapper as="div" className="crafty-code-block my-3 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
        <SearchableSelect
          label="代码语言"
          placeholder="搜索语言"
          value={language}
          options={languages}
          onFilter={(query) => filterLanguages(languages, query)}
          onChange={(next) => updateAttributes({ language: next })}
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
          onChange={(next) => updateAttributes({ themeId: next })}
        />
        <button
          type="button"
          onClick={copy}
          aria-label="复制代码"
          className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre
        className="overflow-x-auto p-3 font-mono text-sm"
        style={{ background: surface.background, color: surface.foreground }}
      >
        <NodeViewContent<'code'> as="code" />
      </pre>    </NodeViewWrapper>
  );
}
