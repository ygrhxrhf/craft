'use client';

import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

import { useFindReplaceStore, type FindScope } from '@/lib/store/use-find-replace-store';
import { formatResultCount } from '@/lib/find/matcher';

/**
 * 查找和替换 (`find.*`, `panels.md §六`): one field for the query, one for the replacement, two
 * modes, two scopes, and navigation that carries the hit index.
 *
 * Every string on this panel is a collected key — `find.and.replace` for the title,
 * `find.{text|regex}.{in.doc|on.page}` for the placeholder (which is why it changes with both
 * the mode and the scope), `find.next` / `find.previous` for navigation, `find.replace.search`
 * for the count, `find.replace.with` for the replacement placeholder, and `replace` /
 * `replace.all` for the two buttons. `[1]` in the count key was never collected, so it is left
 * out rather than guessed.
 */
export function FindReplacePanel({ editor }: { editor: Editor | null }) {
  const open = useFindReplaceStore((state) => state.open);
  const showReplace = useFindReplaceStore((state) => state.showReplace);
  const query = useFindReplaceStore((state) => state.query);
  const replacement = useFindReplaceStore((state) => state.replacement);
  const mode = useFindReplaceStore((state) => state.mode);
  const scope = useFindReplaceStore((state) => state.scope);
  const caseSensitive = useFindReplaceStore((state) => state.caseSensitive);
  const matches = useFindReplaceStore((state) => state.matches);
  const current = useFindReplaceStore((state) => state.current);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  // The count follows the document as well as the query: editing while the panel is open changes
  // what a query would match without the query itself changing. `findRefresh` is value-compared
  // on the store side, so this cannot keep itself alive.
  useEffect(() => {
    if (!editor || !open) return;
    // Captured once: `editor.commands` hands back a fresh object on every access, so the
    // listener registered here and the one removed on cleanup must be the same reference.
    const refresh = () => {
      editor.commands.findRefresh();
    };
    refresh();
    editor.on('update', refresh);
    return () => {
      editor.off('update', refresh);
    };
  }, [editor, open, query, mode, scope, caseSensitive]);

  if (!open) return null;

  const run = (command: 'findNext' | 'findPrevious') => {
    editor?.commands[command]();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run(event.shiftKey ? 'findPrevious' : 'findNext');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      run('findNext');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      run('findPrevious');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      useFindReplaceStore.getState().setOpen(false);
    }
  };

  const placeholder =
    mode === 'regex'
      ? scope === 'doc'
        ? '在文档中查找正则表达式'
        : '在页面上查找正则表达式'
      : scope === 'doc'
        ? '在文档中查找文本'
        : '在页面上查找文本';

  return (
    <div className="flex w-full flex-col gap-2 border-b border-border p-3" data-testid="find-replace-panel">
      <div className="flex items-center gap-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          data-testid="find-replace-query"
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
          placeholder={placeholder}
          value={query}
          onChange={(event) => useFindReplaceStore.getState().setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="查找"
        />
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground" data-testid="find-replace-count">
          {/* An uncompilable pattern simply matches nothing, which is still 「0 结果」. */}
          {formatResultCount(matches.length)}
        </span>
        <button
          type="button"
          title="查找上一个"
          aria-label="查找上一个"
          disabled={matches.length === 0}
          onClick={() => run('findPrevious')}
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-40"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          title="查找下一个"
          aria-label="查找下一个"
          disabled={matches.length === 0}
          onClick={() => run('findNext')}
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-40"
        >
          <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          title="查找和替换"
          aria-label="关闭"
          onClick={() => useFindReplaceStore.getState().setOpen(false)}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(['text', 'regex'] as const).map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`find-replace-mode-${value}`}
            aria-pressed={mode === value}
            onClick={() => useFindReplaceStore.getState().setMode(value)}
            className={`rounded-full px-2 py-0.5 ${mode === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
          >
            {value === 'text' ? '文本' : '正则'}
          </button>
        ))}
        <span className="text-border">|</span>
        {/* Official menu group shape (gap.md:1418): `match.case` is its own toggle, independent
            of mode and scope. The panel's on/off label carries the parent key text since
            `find.replace.match.case` itself is not in the catalog. */}
        <button
          type="button"
          data-testid="find-replace-case"
          aria-pressed={caseSensitive}
          title="区分大小写"
          onClick={() => useFindReplaceStore.getState().setCaseSensitive(!caseSensitive)}
          className={`rounded-full px-2 py-0.5 font-mono ${caseSensitive ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
        >
          Aa
        </button>
        <span className="text-border">|</span>
        {(['page', 'doc'] as const).map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`find-replace-scope-${value}`}
            aria-pressed={scope === value}
            onClick={() => {
              useFindReplaceStore.getState().setScope(value as FindScope);
            }}
            className={`rounded-full px-2 py-0.5 ${scope === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
          >
            {value === 'page' ? '在页面上' : '在文档中'}
          </button>
        ))}
        <span className="ml-auto tabular-nums text-muted-foreground" data-testid="find-replace-current">
          {current >= 0 ? `${current + 1} / ${matches.length}` : ''}
        </span>
      </div>

      {/* G1570: the replacement row only exists on the `⌘⇧F` tier — `⌘F` leaves the panel at
          `replaceInput:0`, which is what the official screen shows. */}
      {showReplace && (
        <div className="flex items-center gap-2" data-testid="find-replace-replacement-row">
          <input
            data-testid="find-replace-replacement"
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
            placeholder="替换为……"
            value={replacement}
            onChange={(event) => useFindReplaceStore.getState().setReplacement(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="替换为"
          />
          <button
            type="button"
            data-testid="find-replace-one"
            disabled={matches.length === 0 || !editor}
            onClick={() => editor?.commands.findReplaceCurrent(replacement)}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
          >
            替换
          </button>
          <button
            type="button"
            data-testid="find-replace-all"
            disabled={matches.length === 0 || !editor}
            onClick={() => editor?.commands.findReplaceAll(replacement)}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
          >
            全部替换
          </button>
        </div>
      )}
    </div>
  );
}
