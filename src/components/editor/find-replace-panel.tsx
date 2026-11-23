'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import { Check, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { cn } from 'cn';

import { getSubpageStats, type SubpageStats } from '@/actions/document/get';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
import type { FindScope } from '@/lib/find/options';
import { findMatches, formatResultCount } from '@/lib/find/matcher';

/**
 * 查找和替换 (`find.*`, `panels.md §六`) —— G1418 的官方形态是一栏 **288px 左侧栏**
 * （采集里 `id="frsidebar"`，x=0、整列高）：栏顶是「查找 ⌄」下拉与一枚「选项」图标按钮，
 * 四档选项（作用域 / 模式 / 区分大小写 / 忽略变音符号）收在「选项」弹出的列表里，
 * 选中态由行右侧的勾承载，而不是平铺的胶囊。
 *
 * 每一条文案都是采集到的键：`find`（栏题）、`find.and.replace`（下拉里的第二档）、
 * `find.{text|regex}.{in.doc|on.page}`（占位符，随模式与作用域同时变）、`find.next` /
 * `find.previous`（导航）、`find.replace.search` / `one.result` / `no.result`（结果数，
 * `[1]` 是 `in.doc` / `on.page` 的随作用域变化那一段）、
 * `find.replace.with`（替换占位符）、`replace` / `replace.all`（两枚按钮）、
 * `stats.this.page` / `stats.full.document`（作用域两项）、`text` / `regexp`（模式两项）、
 * `match.case`、`ignore.diacritics`。
 */

/** G1418「完整文档」：子页正文里的命中各成一行，点开跳到那一页。 */
interface SubpageHit {
  id: string;
  title: string;
  count: number;
  before: string;
  hit: string;
  after: string;
}

const SNIPPET_CONTEXT = 40;

/**
 * The snippet is cut from the match offsets `findMatches` reported, not by re-searching the text:
 * a lowercase `indexOf` would disagree with regex / case-sensitive / diacritic modes.
 */
function snippetParts(text: string, from: number, to: number) {
  const start = Math.max(0, from - SNIPPET_CONTEXT);
  const end = Math.min(text.length, to + SNIPPET_CONTEXT);
  const collapse = (value: string) => value.replace(/\s+/g, ' ');
  return {
    before: `${start > 0 ? '…' : ''}${collapse(text.slice(start, from))}`,
    hit: collapse(text.slice(from, to)),
    after: `${collapse(text.slice(to, end))}${end < text.length ? '…' : ''}`,
  };
}

export function FindReplacePanel({ editor, documentId }: { editor: Editor | null; documentId: string }) {
  const open = useFindReplaceStore((state) => state.open);
  const showReplace = useFindReplaceStore((state) => state.showReplace);
  const query = useFindReplaceStore((state) => state.query);
  const replacement = useFindReplaceStore((state) => state.replacement);
  const mode = useFindReplaceStore((state) => state.mode);
  const scope = useFindReplaceStore((state) => state.scope);
  const caseSensitive = useFindReplaceStore((state) => state.caseSensitive);
  const ignoreDiacritics = useFindReplaceStore((state) => state.ignoreDiacritics);
  const matches = useFindReplaceStore((state) => state.matches);
  const current = useFindReplaceStore((state) => state.current);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [titleMenu, setTitleMenu] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [subpages, setSubpages] = useState<SubpageStats[]>([]);

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
  }, [editor, open, query, mode, scope, caseSensitive, ignoreDiacritics]);

  // The options list is a settings list, not a command menu: it stays open while the user flips
  // several rows, so it only closes on an outside press or Escape.
  useEffect(() => {
    if (!optionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOptionsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [optionsOpen]);

  // 关掉面板就收起两层菜单；跟随 `open` 就地调整。
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (!open) {
      setOptionsOpen(false);
      setTitleMenu(false);
    }
  }

  // G1418「完整文档」：子页是独立的 Document 行，正文不在当前 ProseMirror doc 里，所以这一档
  // 要另读一次子树（`getSubpageStats` 已按 parentId 展开整棵子树）。
  // 键是「空查询」这个布尔而不是查询本身：每敲一个字都重读一遍子树没有意义，匹配在本地做。
  const needsSubpages = open && scope === 'doc' && query.trim() !== '';
  useEffect(() => {
    if (!needsSubpages) return;
    let live = true;
    getSubpageStats(documentId)
      .then((rows) => {
        if (live) setSubpages(rows);
      })
      .catch(() => {
        if (live) setSubpages([]);
      });
    return () => {
      live = false;
    };
  }, [needsSubpages, documentId]);

  const subpageHits = useMemo<SubpageHit[]>(() => {
    if (scope !== 'doc' || !query.trim()) return [];
    const hits: SubpageHit[] = [];
    for (const page of subpages) {
      if (!page.plainText) continue;
      const result = findMatches(
        [{ text: page.plainText, from: 0, to: page.plainText.length }],
        query,
        mode,
        caseSensitive,
        ignoreDiacritics,
      );
      if (result.matches.length === 0) continue;
      const first = result.matches[0];
      hits.push({
        id: page.id,
        title: page.title,
        count: result.matches.length,
        ...snippetParts(page.plainText, first.from, first.to),
      });
    }
    return hits;
  }, [scope, query, subpages, mode, caseSensitive, ignoreDiacritics]);

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
    }
  };

  // Escape is the panel's, not the query field's: once the options list takes focus (a scope or
  // mode row was pressed), that is still the same key scope, and the list has to dismiss before
  // the panel does. Handled at the root so it works from any control the panel owns — the two
  // handlers cannot double-fire because the inputs no longer answer Escape.
  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (optionsOpen) setOptionsOpen(false);
    else useFindReplaceStore.getState().setOpen(false);
  };

  const totalResults = matches.length + subpageHits.reduce((sum, hit) => sum + hit.count, 0);

  const placeholder =
    mode === 'regex'
      ? scope === 'doc'
        ? '在文档中查找正则表达式'
        : '在页面上查找正则表达式'
      : scope === 'doc'
        ? '在文档中查找文本'
        : '在页面上查找文本';

  // 官方「选项」列表的逐项顺序（第 414／415 批采集）：作用域二选一、模式二选一、再两枚
  // 独立开关；分隔线落在三组之间。
  const optionRows: Array<{
    testId: string;
    label: string;
    pressed: boolean;
    divider: boolean;
    select: () => void;
  }> = [
    {
      testId: 'find-replace-scope-doc',
      label: '完整文档',
      pressed: scope === 'doc',
      divider: false,
      select: () => useFindReplaceStore.getState().setScope('doc' as FindScope),
    },
    {
      testId: 'find-replace-scope-page',
      label: '这一页',
      pressed: scope === 'page',
      divider: false,
      select: () => useFindReplaceStore.getState().setScope('page' as FindScope),
    },
    {
      testId: 'find-replace-mode-text',
      label: '文本',
      pressed: mode === 'text',
      divider: true,
      select: () => useFindReplaceStore.getState().setMode('text'),
    },
    {
      testId: 'find-replace-mode-regex',
      label: '正则表达式',
      pressed: mode === 'regex',
      divider: false,
      select: () => useFindReplaceStore.getState().setMode('regex'),
    },
    {
      testId: 'find-replace-case',
      label: '区分大小写',
      pressed: caseSensitive,
      divider: true,
      select: () => useFindReplaceStore.getState().setCaseSensitive(!caseSensitive),
    },
    {
      testId: 'find-replace-diacritics',
      label: '忽略变音符号（例如 ä = a）',
      pressed: ignoreDiacritics,
      divider: false,
      select: () => useFindReplaceStore.getState().setIgnoreDiacritics(!ignoreDiacritics),
    },
  ];

  return (
    <div
      ref={rootRef}
      id="frsidebar"
      data-testid="find-replace-panel"
      onKeyDown={onPanelKeyDown}
      className="relative flex h-full w-72 shrink-0 flex-col border-r border-border bg-background"
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2">
        <div className="relative">
          <button
            type="button"
            data-testid="find-replace-title"
            aria-haspopup="menu"
            aria-expanded={titleMenu}
            onClick={() => {
              setTitleMenu(!titleMenu);
              setOptionsOpen(false);
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-foreground/4"
          >
            查找
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
          {titleMenu && (
            <div
              role="menu"
              data-testid="find-replace-title-menu"
              className="absolute left-0 top-9 z-40 w-40 rounded-lg border border-border bg-background py-1 shadow-lg"
            >
              {/* G1570 的两档：`⌘F` 只开查找框，`⌘⇧F` 才补出替换行；下拉把这两档也做成入口。 */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  useFindReplaceStore.getState().openWith(false);
                  setTitleMenu(false);
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-foreground/4"
              >
                查找
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  useFindReplaceStore.getState().openWith(true);
                  setTitleMenu(false);
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-foreground/4"
              >
                查找和替换
              </button>
            </div>
          )}
        </div>

        <span className="flex-1" />

        <button
          type="button"
          data-testid="find-replace-options-trigger"
          aria-label="选项"
          title="选项"
          aria-haspopup="true"
          aria-expanded={optionsOpen}
          onClick={() => {
            setOptionsOpen(!optionsOpen);
            setTitleMenu(false);
          }}
          className={cn(
            'rounded p-1.5 text-muted-foreground hover:bg-foreground/4 hover:text-foreground',
            optionsOpen && 'bg-foreground/4 text-foreground',
          )}
        >
          <SlidersHorizontal className="size-4" />
        </button>
        <button
          type="button"
          aria-label="关闭"
          title="关闭"
          onClick={() => useFindReplaceStore.getState().setOpen(false)}
          className="rounded p-1.5 text-muted-foreground hover:bg-foreground/4 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 border-b border-border p-2">
        <input
          ref={inputRef}
          data-testid="find-replace-query"
          className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
          placeholder={placeholder}
          value={query}
          onChange={(event) => useFindReplaceStore.getState().setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="查找"
        />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="whitespace-nowrap tabular-nums" data-testid="find-replace-count">
            {/* 官方三档：`no.result` 是裸「暂无结果」、`one.result` 与 `find.replace.search` 都把
                `in.doc` / `on.page` 填进一个槽位——所以空结果不印作用域、非空才有。 */}
            {formatResultCount(totalResults, scope)}
          </span>
          <span className="whitespace-nowrap tabular-nums" data-testid="find-replace-current">
            {current >= 0 ? `${current + 1} / ${matches.length}` : ''}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            title="查找上一个"
            aria-label="查找上一个"
            disabled={matches.length === 0}
            onClick={() => run('findPrevious')}
            className="rounded p-1 text-muted-foreground hover:bg-foreground/4 disabled:opacity-40"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            title="查找下一个"
            aria-label="查找下一个"
            disabled={matches.length === 0}
            onClick={() => run('findNext')}
            className="rounded p-1 text-muted-foreground hover:bg-foreground/4 disabled:opacity-40"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* G1570: the replacement row only exists on the `⌘⇧F` tier — `⌘F` leaves the panel at
          `replaceInput:0`, which is what the official screen shows. */}
      {showReplace && (
        <div className="flex flex-col gap-2 border-b border-border p-2" data-testid="find-replace-replacement-row">
          <input
            data-testid="find-replace-replacement"
            className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
            placeholder="替换为……"
            value={replacement}
            onChange={(event) => useFindReplaceStore.getState().setReplacement(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="替换为"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="find-replace-one"
              disabled={matches.length === 0 || !editor}
              onClick={() => editor?.commands.findReplaceCurrent(replacement)}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-foreground/4 disabled:opacity-40"
            >
              替换
            </button>
            <button
              type="button"
              data-testid="find-replace-all"
              disabled={matches.length === 0 || !editor}
              onClick={() => editor?.commands.findReplaceAll(replacement)}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-foreground/4 disabled:opacity-40"
            >
              全部替换
            </button>
          </div>
        </div>
      )}

      {/* G1418「完整文档」：子页的命中在这里逐页列出（官方在同一栏里给出跨页结果），点一行
          跳到那一页；替换按钮仍只管当前页——子页正文不在当前编辑器里，改不了。 */}
      {scope === 'doc' && query.trim() !== '' && (
        <div
          data-testid="find-replace-subpage-results"
          className="min-h-0 flex-1 overflow-y-auto border-b border-border"
        >
          {subpageHits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              data-testid="find-replace-subpage-hit"
              onClick={() => router.push(`/documents/${hit.id}`)}
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-foreground/4"
            >
              <span className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{hit.title}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{hit.count}</span>
              </span>
              <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {hit.before}
                <mark className="bg-craft-accent/25 text-foreground">{hit.hit}</mark>
                {hit.after}
              </span>
            </button>
          ))}
        </div>
      )}

      {optionsOpen && (
        <div
          role="group"
          aria-label="选项"
          data-testid="find-replace-options"
          className="absolute left-2 top-12 z-40 w-64 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-xl"
        >
          {optionRows.map((row) => (
            <button
              key={row.testId}
              type="button"
              data-testid={row.testId}
              aria-pressed={row.pressed}
              onClick={row.select}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground/80 hover:bg-foreground/4',
                row.divider && 'border-t border-border',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {/* 官方把选中态放在行右侧的勾上（`hasRightContent`）；这里用勾图标承载，同一视觉。 */}
              {row.pressed && <Check className="size-3.5 shrink-0 text-craft-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
