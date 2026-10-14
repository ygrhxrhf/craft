'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar, User, Play, Folder, Copy, Star, Clock, Trash2,
  FileText, LayoutTemplate, Download, Search, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  MessageSquare, ChevronRight, FoldVertical, UnfoldVertical,
} from 'lucide-react';
import { cn } from 'cn';
import { getBacklinks } from '@/actions/document/backlinks';
import { saveAsTemplate } from '@/actions/document/template';
import { isDocumentFavorite, toggleFavorite } from '@/actions/document/favorite';
import { createDocument } from '@/actions/document/create';
import { getFolders } from '@/actions/folder/get';
import { getDocument, getDocuments, getSubpageStats, type SubpageStats } from '@/actions/document/get';
import { relativeTime } from '@/lib/document/relative-time';
import { pageStats, statsInputFor, statsTitle, STATS_SCOPES, STATS_SCOPE_LABELS, type StatsScope } from '@/lib/document/page-stats';
import { LOCATION_TITLE, locationPathLabel } from '@/lib/document/location-path';
import { getOrCreateShare, setSharePublished } from '@/actions/document/share';
import { exportDocument, type ExportFormat } from '@/actions/document/export';
import { getSyncManager } from '@/lib/sync-core';
import { findLiveFavoriteId, findDocumentShareId } from '@/components/sync/local-records';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { useCommandPaletteStore } from '@/lib/store/use-command-palette-store';
import { buildBlockMove, type MoveTarget } from '@/lib/editor/block-move';
import {
  BACKLINK_SORTS,
  BACKLINK_SORT_LABELS,
  sortBacklinks,
  type BacklinkSort,
} from '@/lib/document/backlink-sort';
import { VersionDialog } from './VersionDialog';
import { CommentSection } from '../comments/CommentSection';
import { TagsSection } from './TagsSection';
import { MembersSection } from './MembersSection';
import type { Editor } from '@tiptap/react';
import { untitledFor } from '@/lib/document/untitled-copy';

/** Moves the block holding the selection. No-ops at the edge, same as the key chord. */
function moveSelection(editor: Editor | null, target: MoveTarget) {
  if (!editor) return;
  const tr = buildBlockMove(editor.state, target);
  if (tr) editor.view.dispatch(tr);
}

interface InfoTabProps {
  documentId: string;
  editor: import('@tiptap/react').Editor | null;
  wordCount: number;
  isOwner: boolean;
  onClose: () => void;
}

interface Backlink {
  id: string;
  title: string;
  icon: string | null;
  createdAt: string;
  linkCount?: number;
}

interface FolderItem {
  id: string;
  name: string;
  icon: string | null;
}

interface DocItem {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
}

export function InfoTab({ documentId, editor, wordCount, isOwner, onClose }: InfoTabProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<'info' | 'actions'>('info');
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [backlinkSort, setBacklinkSort] = useState<BacklinkSort>('alphabetical');
  const [collapsedLinks, setCollapsedLinks] = useState<ReadonlySet<string>>(new Set());
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // The property rows read the document's own timestamps (G202) rather than fixed strings.
  const [meta, setMeta] = useState<{ createdAt: string; updatedAt: string } | null>(null);
  const [statsScope, setStatsScope] = useState<StatsScope>('page');
  const [subpages, setSubpages] = useState<SubpageStats[]>([]);
  // The selection reading has to repaint when the highlight moves, which a render of this panel does
  // not otherwise notice.
  const [selectionTick, setSelectionTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const repaint = () => setSelectionTick((tick) => tick + 1);
    editor.on('selectionUpdate', repaint);
    return () => {
      editor.off('selectionUpdate', repaint);
    };
  }, [editor]);

  useEffect(() => {
    let alive = true;
    getDocument(documentId)
      .then((doc) => {
        if (!alive || !doc) return;
        const row = doc as { createdAt?: string; updatedAt?: string };
        setMeta({ createdAt: row.createdAt ?? '', updatedAt: row.updatedAt ?? '' });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [documentId]);

  const handleExport = async (format: ExportFormat) => {
    setBusy(true);
    try {
      const file = await exportDocument(documentId, format);
      const blob = new Blob([file.body], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
      setActionError(null);
    } catch {
      setActionError('导出失败');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      await saveAsTemplate(documentId);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch {
      alert('另存为模板失败');
    }
  };

  useEffect(() => {
    getBacklinks(documentId)
      .then((links) => {
        setBacklinks(links.map((l) => ({
          id: l.sourceDocumentId,
          title: l.sourceTitle,
          icon: l.sourceIcon,
          createdAt: l.createdAt,
          linkCount: l.linkCount,
        })));
      })
      .catch(() => {});
    getSubpageStats(documentId)
      .then((rows) => setSubpages(rows))
      .catch(() => {});
    isDocumentFavorite(documentId)
      .then((favored) => setIsFavorite(!!favored))
      .catch(() => {});
  }, [documentId]);

  const openMoveMenu = async () => {
    try {
      const [folderList, docList] = await Promise.all([
        getFolders(),
        getDocuments(),
      ]);
      setFolders(folderList ?? []);
      setDocs(
        (docList as Array<{ id: string; title: string; icon: string | null; parentId: string | null }>)
          .filter((d) => d.id !== documentId)
      );
      setMoving(true);
    } catch {
      setActionError('无法加载移动目标');
    }
  };

  const handleToggleFavorite = async () => {
    setBusy(true);
    try {
      if (isFavorite) {
        // 取消收藏 → applyLocal 墓碑推送（活行 id 来自本地镜像；缺失则退回服务端）
        const liveId = await findLiveFavoriteId(documentId);
        if (liveId) {
          await getSyncManager().applyLocal({ table: 'favorite', id: liveId, patch: null });
          setIsFavorite(false);
        } else {
          // 镜像还没拉到该行 → 退回服务端 action（toggleFavorite 返回新状态）
          setIsFavorite(!!(await toggleFavorite(documentId)));
        }
      } else {
        // 收藏保留服务端 action：Favorite 墓碑行无 data，客户端无法复用旧行 id
        // （盲建会撞 @@unique([userId,documentId])），见 task-13 报告
        setIsFavorite(!!(await toggleFavorite(documentId)));
      }
      setActionError(null);
    } catch {
      setActionError('收藏操作失败');
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    setBusy(true);
    try {
      const copy = await createDocument({ duplicateFrom: documentId });
      setActionError(null);
      router.push(`/documents/${(copy as { id: string }).id}`);
    } catch {
      setActionError('创建副本失败');
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (target: { folderId?: string | null; parentId?: string | null }) => {
    setBusy(true);
    try {
      // 移动 → applyLocal，patch 只带变更字段
      await getSyncManager().applyLocal({
        table: 'document',
        id: documentId,
        patch: {
          folderId: target.folderId ?? null,
          parentId: target.parentId ?? null,
        },
      });
      setMoving(false);
      setActionError(null);
      router.refresh();
    } catch {
      setActionError('移动失败');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      // 删除 → applyLocal（读侧按 isDeleted 过滤，patch 带 isDeleted/deletedAt）
      await getSyncManager().applyLocal({
        table: 'document',
        id: documentId,
        patch: { isDeleted: true, deletedAt: new Date().toISOString() },
      });
      router.refresh();
      router.push('/documents');
    } catch {
      setActionError('删除失败');
      setBusy(false);
    }
  };

  // The four figures are derived from the editor (G201): character count excludes spaces, and
  // the block count is the document's top-level children. The scope (G67) picks the page, the
  // current selection, or the page plus its subpages. A subpage has no stored block count, so it
  // adds words and characters only.
  const selection = selectionTick >= 0 ? editor?.state.selection : undefined;
  const from = selection?.from ?? 0;
  const to = selection?.to ?? 0;
  const selectionText = editor && from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
  const stats = pageStats(
    statsInputFor(statsScope, {
      page: { wordCount, plainText: editor?.getText() ?? '', blockCount: editor?.state.doc.childCount ?? 0 },
      selection: {
        // The page's "字数" is the editor's character count, so the selection uses the same measure.
        wordCount: selectionText.length,
        plainText: selectionText,
        blockCount: selectionText ? 1 : 0,
      },
      subpages,
    }),
  );

  // The ancestry chain comes from the same document list the move menu already loads.
  const locationLabel = locationPathLabel(docs, documentId);

  return (
    <div className="p-3">
      {/* Sub-tab switcher */}
      <div className="mb-4 flex rounded-lg border border-foreground/8 bg-foreground/4 p-0.5">
        <button
          type="button"
          onClick={() => setSubTab('info')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-meta font-medium transition-colors duration-150 ease-craft',
            subTab === 'info' ? 'bg-card text-foreground shadow-sm' : 'text-foreground/55 hover:text-foreground/85'
          )}
        >
          页面信息
        </button>
        <button
          type="button"
          onClick={() => setSubTab('actions')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-meta font-medium transition-colors duration-150 ease-craft',
            subTab === 'actions' ? 'bg-card text-foreground shadow-sm' : 'text-foreground/55 hover:text-foreground/85'
          )}
        >
          动作
        </button>
      </div>

      {subTab === 'info' ? (
        <div className="space-y-4">
          {/* Properties */}
          <section>
            <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">属性</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-ui">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">已创建：</span>
                <span>{meta?.createdAt ? relativeTime(meta.createdAt) : '—'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-ui">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">已更新：</span>
                <span>{meta?.updatedAt ? relativeTime(meta.updatedAt) : '—'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-ui">
                <User className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">作者：</span>
                <span>你</span>
              </div>
            </div>
          </section>

          {/* Location — the document's ancestry (G203) */}
          {locationLabel && (
            <section>
              <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">
                {LOCATION_TITLE}
              </h4>
              <div className="flex items-center gap-2.5 text-ui text-muted-foreground">
                <Folder className="size-3.5" />
                <span className="truncate">{locationLabel}</span>
              </div>
            </section>
          )}

          {/* Tags */}
          <TagsSection documentId={documentId} />

          {/* Collaborators */}
          <MembersSection documentId={documentId} canManage={isOwner} />

          {/* Backlinks — three sorts plus expand/collapse all (G63). */}
          {backlinks.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-caption font-medium uppercase tracking-wider text-foreground/40">
                  @链接到此页面 ({backlinks.length})
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="全部展开"
                    title="全部展开"
                    onClick={() => setCollapsedLinks(new Set())}
                    className="rounded p-0.5 text-foreground/40 hover:text-foreground/85"
                  >
                    <UnfoldVertical className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="全部折叠"
                    title="全部折叠"
                    onClick={() => setCollapsedLinks(new Set(backlinks.map((link) => link.id)))}
                    className="rounded p-0.5 text-foreground/40 hover:text-foreground/85"
                  >
                    <FoldVertical className="size-3.5" />
                  </button>
                </div>
              </div>
              <select
                aria-label="反向链接排序"
                value={backlinkSort}
                onChange={(event) => setBacklinkSort(event.target.value as BacklinkSort)}
                className="mb-1 w-full rounded bg-transparent text-meta text-foreground/55 outline-none hover:text-foreground/85"
              >
                {BACKLINK_SORTS.map((option) => (
                  <option key={option} value={option}>
                    {BACKLINK_SORT_LABELS[option]}
                  </option>
                ))}
              </select>
              <div className="space-y-1">
                {sortBacklinks(
                  backlinks.map((link) => ({
                    sourceDocumentId: link.id,
                    sourceTitle: link.title,
                    sourceIcon: link.icon,
                    createdAt: link.createdAt,
                    linkCount: link.linkCount,
                  })),
                  backlinkSort,
                ).map((link) => {
                  const collapsed = collapsedLinks.has(link.sourceDocumentId);
                  return (
                    <div key={link.sourceDocumentId}>
                      <div className="flex items-center gap-1 rounded-md px-1 py-1 text-ui hover:bg-foreground/4">
                        <button
                          type="button"
                          aria-label={collapsed ? '展开' : '折叠'}
                          aria-expanded={!collapsed}
                          onClick={() =>
                            setCollapsedLinks((prev) => {
                              const next = new Set(prev);
                              if (next.has(link.sourceDocumentId)) next.delete(link.sourceDocumentId);
                              else next.add(link.sourceDocumentId);
                              return next;
                            })
                          }
                          className="rounded p-0.5 text-foreground/40"
                        >
                          <ChevronRight className={cn('size-3.5 transition-transform', !collapsed && 'rotate-90')} />
                        </button>
                        <Link href={`/documents/${link.sourceDocumentId}`} className="flex min-w-0 flex-1 items-center gap-2">
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{link.sourceIcon} {link.sourceTitle || untitledFor('list')}</span>
                        </Link>
                      </div>
                      {!collapsed && (
                        <div className="ml-6 px-2 pb-1 text-meta text-foreground/40">
                          {link.linkCount ?? 1} 个链接
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Stats */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-caption font-medium uppercase tracking-wider text-foreground/40">
                {statsTitle(statsScope)}
              </h4>
              <select
                aria-label="统计范围"
                value={statsScope}
                onChange={(event) => setStatsScope(event.target.value as StatsScope)}
                className="rounded bg-transparent text-meta text-foreground/55 outline-none hover:text-foreground/85"
              >
                {STATS_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {STATS_SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-ui text-muted-foreground">
              <div>{stats.words.toLocaleString()} 字</div>
              <div>{stats.characters.toLocaleString()} 字符（不包括空格）</div>
              <div>{stats.blocks.toLocaleString()} 区块</div>
              <div>{stats.readingMinutes.toLocaleString()} 分钟阅读</div>
            </div>
          </section>

          <CommentSection documentId={documentId} editor={editor} />
        </div>
      ) : (
        <div className="space-y-1">
          {actionError && (
            <div className="rounded-md bg-destructive/10 px-2 py-1.5 text-meta text-destructive">
              {actionError}
            </div>
          )}

          {moving && (
            <div className="mb-2 rounded-lg border border-foreground/10 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-meta font-medium">移动到...</span>
                <button
                  type="button"
                  onClick={() => setMoving(false)}
                  className="text-meta text-muted-foreground hover:text-foreground"
                >
                  取消
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleMove({ folderId: null, parentId: null })}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-meta text-muted-foreground transition-colors hover:bg-foreground/4 disabled:opacity-50"
                >
                  📄 独立文档（根目录）
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleMove({ folderId: folder.id, parentId: null })}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-meta transition-colors hover:bg-foreground/4 disabled:opacity-50"
                  >
                    <span>{folder.icon || '📁'}</span>
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
                <div className="mt-1 border-t border-foreground/10 pt-1" />
                {docs
                  .filter((d) => !d.parentId)
                  .map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      disabled={busy}
                      onClick={() => handleMove({ parentId: doc.id, folderId: null })}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-meta transition-colors hover:bg-foreground/4 disabled:opacity-50"
                    >
                      <span>{doc.icon || '📄'}</span>
                      <span className="truncate">{doc.title || untitledFor('list')}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              try {
                const share = await getOrCreateShare(documentId);
                // 发布开关 → applyLocal（share 行 id 走本地镜像；镜像没有则退回服务端 action）
                const shareId = await findDocumentShareId(documentId);
                if (shareId) {
                  await getSyncManager().applyLocal({
                    table: 'document_share',
                    id: shareId,
                    patch: { isPublished: true },
                  });
                } else {
                  await setSharePublished(documentId, true);
                }
                window.open(`/p/${share.token}`, '_blank');
              } catch {
                setActionError('打开发布页失败');
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
          >
            <Play className="size-3.5 text-muted-foreground" />
            <span>展示</span>
          </button>
          <button
            type="button"
            onClick={openMoveMenu}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <Folder className="size-3.5 text-muted-foreground" />
            <span>移动到...</span>
          </button>
          <button
            type="button"
            onClick={() => {
              useFindReplaceStore.getState().setOpen(true);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <Search className="size-3.5 text-muted-foreground" />
            <span>在页面中查找</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('info');
              useCommentRequestStore.getState().ask();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <span>添加评论</span>
          </button>
          <button
            type="button"
            onClick={() => {
              useCommandPaletteStore.getState().open();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span>快速开启</span>
          </button>
          {([
            ['up', '上移', ArrowUp],
            ['down', '下移', ArrowDown],
            ['top', '移至顶部', ChevronsUp],
            ['bottom', '移至底部', ChevronsDown],
          ] as const).map(([target, label, Icon]) => (
            <button
              key={target}
              type="button"
              disabled={!editor}
              onClick={() => moveSelection(editor, target)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              <span>{label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
          >
            <Copy className="size-3.5 text-muted-foreground" />
            <span>创建副本</span>
          </button>
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
          >
            <Star className={cn('size-3.5', isFavorite ? 'fill-current text-amber-500' : 'text-muted-foreground')} />
            <span>{isFavorite ? '取消收藏' : '收藏文档'}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <LayoutTemplate className="size-3.5 text-muted-foreground" />
            <span>{templateSaved ? '已保存为模板' : '另存为模板'}</span>
          </button>
          <button
            type="button"
            onClick={() => setVersionsOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <Clock className="size-3.5 text-muted-foreground" />
            <span>查看备份</span>
          </button>
          <button
            type="button"
            onClick={() => setShowExport((prev) => !prev)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>导出</span>
          </button>
          {showExport && (
            <div className="mb-2 rounded-lg border border-foreground/10 p-2">
              <div className="mb-1 grid grid-cols-2 gap-1">
                {(['markdown', 'html', 'text', 'json'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={busy}
                    onClick={() => handleExport(format)}
                    className="rounded-md border border-foreground/10 px-2 py-1.5 text-meta transition-colors hover:bg-foreground/4 disabled:opacity-50"
                  >
                    {format === 'markdown' ? 'Markdown' : format === 'html' ? 'HTML' : format === 'text' ? '纯文本' : 'JSON'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="my-2 h-px bg-border" />
          {confirmDelete ? (
            <div className="rounded-md bg-destructive/10 p-2">
              <p className="mb-2 text-meta text-destructive">移入回收站？可在回收站恢复。</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="flex-1 rounded-md bg-destructive px-2 py-1 text-meta text-white disabled:opacity-50"
                >
                  确认删除
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-md border border-foreground/10 px-2 py-1 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              <span>删除</span>
            </button>
          )}
        </div>
      )}

      <VersionDialog
        documentId={documentId}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
      />
    </div>
  );
}
