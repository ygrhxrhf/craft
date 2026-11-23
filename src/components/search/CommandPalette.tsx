'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { KEY_BINDINGS, detectPlatform, matches } from '@/lib/editor/keymap';
import { useRouter, usePathname } from 'next/navigation';
import {Database, FileText, Plus, Search, Terminal, Type, Folder, Calendar} from 'lucide-react';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useCommandPaletteStore } from '@/lib/store/use-command-palette-store';
import { useActiveEditorStore } from '@/lib/store/use-active-editor-store';
import { slashCommands } from '@/components/editor/slash-menu/slash-commands';
import { commandEnabled, filterCommands, mergePaletteCommands, type PaletteCommand } from '@/lib/commands/registry';
import { APP_COMMANDS } from '@/lib/commands/app-commands';
import { OFFICIAL_COMMANDS } from '@/lib/commands/official-catalog';
import { searchAll } from '@/actions/document/search';
import { cumulativeOffsets, groupResults } from '@/lib/search/result-groups';
import type { SearchResultDoc, SearchResultBlock, SearchResultRow } from '@/actions/document/search';
import { createDocumentLocal } from '@/components/sync/create-local';
import { parseDateExpression } from '@/lib/task/date-parse';
import { getOrCreateDayNote } from '@/actions/daily-notes/daily-notes';
import { exportLibraryZip } from '@/actions/document/export-library';
import { downloadBase64File } from '@/lib/download/base64-file';
import { BLOCKS_HEADING, DOCS_HEADING, NO_RESULTS_FOUND, PRESS_ENTER, ROWS_HEADING, SEE_MORE_RESULTS, SEARCHING_OTHER_MATCHES, createDocLabel, noResultsFor } from '@/lib/search/official-copy';
import { hitCountLabel } from '@/lib/search/hit-count';
import {
  REMOVE_FROM_RECENTS,
  forgetRecent,
  loadRecents,
  recentForDisplay,
  rememberRecent,
  saveRecents,
  type RecentDocument,
} from '@/lib/search/recents';
import { toast } from '@/components/ui/toast';
import { useSession } from 'next-auth/react';

async function downloadLibraryArchive() {
  try {
    const file = await exportLibraryZip();
    downloadBase64File(file.filename, file.base64, 'application/zip');
  } catch {
    toast.add({ id: 'library-export-failed', type: 'error', title: '资料库导出失败' });
  }
}

const implementedCommands: PaletteCommand[] = [
  ...slashCommands.map((command) => ({
    id: `insert.${command.name}`,
    title: command.name,
    group: '插入',
    keywords: command.keywords,
    run: () => {
      const editor = useActiveEditorStore.getState().editor;
      if (!editor) return;
      const { from, to } = editor.state.selection;
      void command.command(editor, { from, to });
    },
  })),
  {
    id: 'library.export',
    title: '导出整个资料库',
    group: '操作',
    keywords: ['export', 'zip', '资料库', '导出'],
    aliases: ['commands.export.home.as'],
    run: () => void downloadLibraryArchive(),
  },
  ...APP_COMMANDS,
];

/** G33: all 189 official ids are searchable; the ones this build has not wired are greyed out. */
const paletteCommands: PaletteCommand[] = mergePaletteCommands(implementedCommands, OFFICIAL_COMMANDS);

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isOpen, close, open, seedQuery } = useCommandPaletteStore();
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<SearchResultDoc[]>([]);
  const [blocks, setBlocks] = useState<SearchResultBlock[]>([]);
  const [rows, setRows] = useState<SearchResultRow[]>([]);
  const [folders, setFolders] = useState<{ id: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);
  // G235: the panel's 「最近使用」 list, persisted per browser.
  const [recents, setRecents] = useState<RecentDocument[]>([]);
  useEffect(() => {
    setRecents(loadRecents(typeof window === 'undefined' ? undefined : window.localStorage));
  }, []);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const platform = detectPlatform();
    const quickOpenIds = new Set([
      'TOGGLE_QUICK_OPEN',
      'TOGGLE_QUICK_OPEN_ALT',
      'TOGGLE_QUICK_OPEN_SAFARI',
    ]);
    const handleKeyDown = (e: KeyboardEvent) => {
      // G69: the editor's own document-capture handler claims Mod-K for the link picker and
      // preventDefaults it. A chord already handled there must not also open the palette.
      if (e.defaultPrevented) return;
      // G1580: only the plain Ctrl/⌘-K opens the palette; Ctrl-Shift-K belongs to block links and
      // must not be swallowed here.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
        return;
      }
      // G1589: ⌘O / ⌘P / ⌘⇧O are the same panel — the official build has four chords, not one.
      const alt = KEY_BINDINGS.find(
        (binding) =>
          quickOpenIds.has(binding.id) &&
          matches(
            {
              metaKey: e.metaKey,
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              shiftKey: e.shiftKey,
              key: e.key,
              code: e.code,
            },
            binding,
            platform,
          ),
      );
      if (alt) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // 打开时把外部带进来的 seed 填进输入框。渲染期按上一值调整，不在 effect 里同步 setQuery
  //（react-hooks/set-state-in-effect）；seed 为空的打开保持原有输入。
  const [syncedSeed, setSyncedSeed] = useState(seedQuery);
  if (syncedSeed !== seedQuery) {
    setSyncedSeed(seedQuery);
    if (isOpen && seedQuery) setQuery(seedQuery);
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    timerRef.current = setTimeout(async () => {
      if (!q) {
        setDocs([]);
        setBlocks([]);
        setRows([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        // spec D7-④ 离线提示：搜索走服务端，需要网络（固定 id 防重复弹）
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          toast.add({ id: 'offline-hint', type: 'warning', title: '需要网络' });
          return;
        }
        const result = await searchAll(q);
        setDocs(result.documents);
        setBlocks(result.blocks);
        setRows(result.rows);
        setFolders(result.folders ?? []);
      } finally {
        setSearching(false);
      }
    }, q ? 200 : 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  /**
   * G1419：面板底部那一行是「查看更多结果 + 按 Enter 键」，选中即进完整结果页
   * （第 419 批采样：URL 变 `…?q=Craft&scope=ALL`）。分页因此从面板挪到结果页；
   * 面板只负责第一页 20 条。
   */
  const handleSeeAllResults = () => {
    const q = query.trim();
    if (!q) return;
    close();
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(q)}&scope=ALL`);
  };

  const handleOpenDocument = (id: string, title?: string) => {
    // G355：每条最近文档记下这篇文档自己的 updatedAt（来自搜索结果），供「最近文档」组按
    // Updated 升序排；从最近列表里再点开时 rememberRecent 会沿用存量值。
    const updatedAt = docs.find((doc) => doc.id === id)?.updatedAt;
    setRecents((current) => {
      const next = rememberRecent(current, {
        id,
        title: title || current.find((item) => item.id === id)?.title || '未命名',
        updatedAt,
      });
      saveRecents(typeof window === 'undefined' ? undefined : window.localStorage, next);
      return next;
    });
    close();
    setQuery('');
    router.push(`/documents/${id}`);
  };

  const handleForgetRecent = (id: string) => {
    setRecents((current) => {
      const next = forgetRecent(current, id);
      saveRecents(typeof window === 'undefined' ? undefined : window.localStorage, next);
      return next;
    });
  };

  const hasQuery = query.trim().length > 0;
  // G355：官方「最近文档」组先把**正在看的这篇**剔除，再按 20 条截断。
  const currentDocumentId =
    pathname?.startsWith('/documents/') ? (pathname.split('/')[2] ?? null) : null;
  const recentsForDisplay = recentForDisplay(recents, currentDocumentId);
  // G354: a query that parses as a date gets one extra `type:"date"` result. The official parser
  // is async chrono; local parsing is synchronous, so no extra round trip is visible.
  const parsedDate = useMemo(() => {
    if (!hasQuery) return null;
    const result = parseDateExpression(query.trim());
    return result.ok ? result.date : null;
  }, [hasQuery, query]);

  const handleOpenDate = async (date: Date) => {
    close();
    setQuery('');
    const note = await getOrCreateDayNote(date);
    router.push(`/documents/${note.id}`);
  };

  /**
   * G353：结果按**多归属**分桶 + 预计算跨组累计 offset。官方那支 `bit()` 是"匹配到就 push、
   * 不 break"⇒ 同一条结果可同时出现在两个组里。本地这里把"同一篇文档既命中标题、其正文块又命中"
   * 这一情形落成真多归属：那条文档结果同时进「文档」与「块内容」两组，`cumulativeOffsets` 给键盘
   * ↑/↓ 提供拍平序。
   */
  const resultGroups = useMemo(() => {
    const docsWithBlockHits = new Set(blocks.map((b) => b.documentId));
    const items = [
      ...docs.map((doc) => ({
        facets: docsWithBlockHits.has(doc.id) ? ['docs', 'blocks'] : ['docs'],
      })),
      ...blocks.map(() => ({ facets: ['blocks'] })),
      ...rows.map(() => ({ facets: ['rows'] })),
    ];
    return groupResults(items, [
      { key: 'docs', label: DOCS_HEADING },
      { key: 'blocks', label: BLOCKS_HEADING },
      { key: 'rows', label: ROWS_HEADING },
    ]);
  }, [docs, blocks, rows]);
  // 拍平序的组起点：键盘 ↑/↓ 拿到拍平序号后，用它定位落在第几组。
  const groupOffsets = useMemo(() => cumulativeOffsets(resultGroups), [resultGroups]);
  // 拍平后的总条数＝最后一组的起点 + 该组条数；也用作"有没有结果"的判据。
  const totalResultCount =
    groupOffsets.length === 0
      ? 0
      : groupOffsets[groupOffsets.length - 1] + resultGroups[resultGroups.length - 1].members.length;
  const groupOf = (key: string) => resultGroups.find((group) => group.key === key);
  const matchingCommands = hasQuery ? filterCommands(paletteCommands, query).slice(0, 8) : [];

  const handleRunCommand = (command: PaletteCommand) => {
    if (!commandEnabled(command)) return;
    close();
    setQuery('');
    command.run?.();
  };

  // `browse.search.create.doc` =「创建 [0]」. The row sits above the results and the document is
  // created through the same offline path as 「新建文档」, titled with the query.
  const handleCreateFromQuery = async () => {
    const title = query.trim();
    if (!title) return;
    close();
    setQuery('');
    const id = await createDocumentLocal({ userId: session?.user?.id, title });
    router.push(`/documents/${id}`);
  };

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(v) => (v ? open() : close())}
      title="搜索"
      description="搜索文档与内容"
      className="max-w-xl max-md:w-[calc(100vw-1.5rem)]"
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="打开" />

      <CommandList>
        {!hasQuery && recentsForDisplay.length > 0 && (
          <CommandGroup heading="最近使用" data-testid="search-recents">
            {recentsForDisplay.map((recent) => (
              <CommandItem
                key={recent.id}
                value={`recent-${recent.id}`}
                onSelect={() => handleOpenDocument(recent.id, recent.title)}
              >
                <FileText className="size-4" />
                <span className="min-w-0 flex-1 truncate">{recent.title}</span>
                <button
                  type="button"
                  aria-label={REMOVE_FROM_RECENTS}
                  className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleForgetRecent(recent.id);
                  }}
                >
                  ×
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* G178：没有查询、也没有最近使用时的空态（官方裸键 `browse.no.results.found`）。 */}
        {!hasQuery && recentsForDisplay.length === 0 && (
          <div data-testid="palette-empty" className="py-6 text-center text-ui text-foreground/40">
            {NO_RESULTS_FOUND}
          </div>
        )}

        {parsedDate && (
          <CommandGroup>
            <CommandItem
              data-testid="palette-date-result"
              value={`date-${parsedDate.toISOString()}`}
              onSelect={() => void handleOpenDate(parsedDate)}
            >
              <Calendar className="size-4" />
              <span>
                {parsedDate.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {hasQuery && (
          <CommandGroup>
            <CommandItem
              data-testid="palette-create-doc"
              value={`create-${query.trim()}`}
              onSelect={handleCreateFromQuery}
            >
              <Plus className="size-4" />
              <span>{createDocLabel(query.trim())}</span>
            </CommandItem>
          </CommandGroup>
        )}

        {hasQuery && matchingCommands.length > 0 && (
          <CommandGroup heading="命令">
            {matchingCommands.map((command) => (
              <CommandItem
                key={command.id}
                value={command.id}
                disabled={!commandEnabled(command)}
                onSelect={() => handleRunCommand(command)}
              >
                <Terminal className="size-4" />
                <span>{command.title}</span>
                {!commandEnabled(command) && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">未接入</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* G235：空态是显式分支，不是 `CommandEmpty`。结果项里永远有一条「创建 [0]」，
            它的 value 含查询词、于是自己命中自己 ⇒ 列表从不"空"，`CommandEmpty` 永不渲染，
            官方那句「未找到 [0] 的结果」就永远出不来（探针实测：搜不存在的词只剩创建行）。
            G178：搜索是分阶段返回的——「正在搜索其他匹配项」是**分页哨兵行**（官方 `type:
            "loadingMore"`），所以它在列表末尾、有一类结果时也照样出现，不只在空列表里。 */}
        {hasQuery && !searching && totalResultCount === 0 && (
          <div className="py-6 text-center text-ui text-foreground/40">{noResultsFor(query.trim())}</div>
        )}

        {folders.length > 0 && (
          <CommandGroup heading="文件夹">
            {folders.map((folder) => (
              <CommandItem
                key={`folder-${folder.id}`}
                value={`folder-${folder.id}-${folder.title}`}
                onSelect={() => {
                  close();
                  router.push(`/folders/${folder.id}`);
                }}
              >
                <Folder className="size-4" />
                <span className="truncate">{folder.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupOf('docs')!.members.length > 0 && (
          <CommandGroup heading={groupOf('docs')!.label}>
            {docs.map((doc) => (
              <CommandItem key={`doc-${doc.id}`} value={`doc-${doc.id}-${doc.title}`} onSelect={() => handleOpenDocument(doc.id, doc.title)}>
                {doc.icon ? (
                  <span className="text-base leading-none">{doc.icon}</span>
                ) : (
                  <FileText className="size-4" />
                )}
                <span className="truncate">{doc.title}</span>
                {doc.hitCount !== undefined && (
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {hitCountLabel(doc.hitCount)}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupOf('blocks')!.members.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={groupOf('blocks')!.label}>
              {blocks.map((block, i) => (
                <CommandItem
                  key={`block-${i}`}
                  value={`block-${i}-${block.text}`}
                  onSelect={() => handleOpenDocument(block.documentId)}
                >
                  <Type className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex flex-col">
                    <span className="truncate text-xs text-muted-foreground">{block.documentTitle}</span>
                    {/* G1286：命中词加粗，片段围绕首个命中截取。 */}
                    <span className="truncate">
                      {block.snippet.prefix ? '…' : ''}
                      {block.snippet.segments.map((segment, index) =>
                        segment.hit ? (
                          <strong key={index} className="font-semibold text-foreground">
                            {segment.text}
                          </strong>
                        ) : (
                          <span key={index}>{segment.text}</span>
                        )
                      )}
                      {block.snippet.suffix ? '…' : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {groupOf('rows')!.members.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={groupOf('rows')!.label}>
              {rows.map((row, i) => (
                <CommandItem
                  key={`row-${row.itemId}-${i}`}
                  value={`row-${row.itemId}-${i}`}
                  onSelect={() => {
                    close();
                    setQuery('');
                    router.push(`/collections/${row.collectionId}`);
                  }}
                >
                  <Database className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex flex-col">
                    <span className="truncate text-xs text-muted-foreground">{row.collectionName}</span>
                    <span className="truncate">{row.text || '未命名条目'}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* G178：哨兵行——已有结果但仍在找其他类匹配时也出现（官方把它当分页行钉在末尾）。 */}
        {hasQuery && searching && (
          <div
            data-testid="palette-searching"
            className="py-3 text-center text-ui text-foreground/40"
          >
            {SEARCHING_OTHER_MATCHES}
          </div>
        )}

        {hasQuery && totalResultCount > 0 && (
          <CommandItem
            value="see-more-results"
            onSelect={handleSeeAllResults}
            className="justify-center gap-2 text-muted-foreground"
          >
            {SEE_MORE_RESULTS}
            <kbd className="rounded border border-border px-1 text-[10px]">{PRESS_ENTER}</kbd>
          </CommandItem>
        )}
      </CommandList>

      <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Search className="size-3" /> 搜索文档与块
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <kbd className="rounded border border-border px-1">Esc</kbd> 关闭
        </span>
      </div>
    </CommandDialog>
  );
}
