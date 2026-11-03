'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar, User, Play, Folder, Copy, Star, Clock, Trash2,
  FileText, LayoutTemplate, Download, Search, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  MessageSquare, ChevronRight, FoldVertical, UnfoldVertical, LogOut, Type, Scan, Group, Ungroup, Pencil,
} from 'lucide-react';
import { cn } from 'cn';
import { NodeSelection } from '@tiptap/pm/state';
import { actionEnabled } from '@/lib/editor/action-availability';
import { confirmDialog } from '@/lib/dialog/show';
import { leaveDocument } from '@/actions/document/members';
import { LEAVE_CONFIRM, LEAVE_DOCUMENT_SINGULAR, LEAVE_FAILED_DESC, LEAVE_FAILED_TITLE } from '@/lib/share/leave-document';
import type { PageStyle } from '@/components/editor/themes/page-style';
import { getBacklinks } from '@/actions/document/backlinks';
import { saveAsTemplate } from '@/actions/document/template';
import { toggleFavoriteLocal, resolveFavoriteState } from '@/lib/favorite/toggle-local';
import { createDocument } from '@/actions/document/create';
import { getFolders } from '@/actions/folder/get';
import { getDocument, getDocuments, getRecentDocuments, getSubpageStats, type SubpageStats } from '@/actions/document/get';
import { relativeTime } from '@/lib/document/relative-time';
import { pageStats, statsInputFor, statsTitle, STATS_SCOPES, STATS_SCOPE_LABELS, type StatsScope } from '@/lib/document/page-stats';
import { LOCATION_TITLE, locationPathLabel, type PathNode } from '@/lib/document/location-path';
import { FROM_TEMPLATE_LABEL } from '@/lib/document/template-limits';
import { MOVE_TO, UNSORTED_TITLE } from '@/lib/browse/official-copy';
import { pendingLabel } from '@/lib/app/pending-states';
import { toast } from '@/components/ui/toast';
import { getOrCreateShare, setSharePublished } from '@/actions/document/share';
import { exportDocument, type ExportFormat } from '@/actions/document/export';
import {
  DEFAULT_PDF_EXPORT_OPTIONS,
  PDF_PAPER_LABEL,
  PDF_PAPER_OPTIONS,
  PDF_TOGGLE_OPTIONS,
  type PdfExportOptions,
} from '@/lib/export/pdf-options';
import { getSyncManager } from '@/lib/sync-core';
import { KEY_BINDINGS, detectPlatform, displayFor } from '@/lib/editor/keymap';
import { useTitleRequestStore } from '@/lib/store/use-title-request-store';
import { findDocumentShareId } from '@/components/sync/local-records';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { useCommandPaletteStore } from '@/lib/store/use-command-palette-store';
import { buildBlockMove, type MoveTarget } from '@/lib/editor/block-move';
import { applyGroup, applyUngroup, canGroup, canUngroup } from '@/lib/editor/block-group';
import { TOC_EMPTY_COPY, TOC_TITLE, extractToc, type TocEntry } from '@/lib/editor/toc';
import {
  DEFAULT_SHARE_IMAGE_FONT,
  DEFAULT_SHARE_IMAGE_SIZE,
  SHARE_IMAGE_FONT_OPTIONS,
  SHARE_IMAGE_FONT_SCALE,
  SHARE_IMAGE_FONT_SECTION,
  SHARE_IMAGE_SIZE_OPTIONS,
  SHARE_IMAGE_SIZE_SECTION,
  shareImageCanvas,
  type ShareImageFontSize,
  type ShareImagePageSize,
} from '@/lib/editor/share-image-config';
import {
  BACKLINK_SORTS,
  BACKLINK_SORT_LABELS,
  BACKLINKS_LOADING,
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

/** G197：组合与取消组合都走块级事务，卡片是本地唯一的块容器。 */
function groupSelection(editor: Editor | null) {
  if (!editor) return;
  applyGroup(editor.state, editor.view.dispatch);
}

function ungroupSelection(editor: Editor | null) {
  if (!editor) return;
  applyUngroup(editor.state, editor.view.dispatch);
}

interface InfoTabProps {
  documentId: string;
  editor: import('@tiptap/react').Editor | null;
  wordCount: number;
  isOwner: boolean;
  /** G588: whether the actor may comment (a viewer can read threads but not compose). */
  canComment?: boolean;
  /** G1453: 页面信息里的「展示」段读写页面显示设置（与样式页签同一份 pageStyle）。 */
  pageStyle?: PageStyle;
  onPageStylePatch?: (patch: Partial<PageStyle>) => void;
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

export function InfoTab({ documentId, editor, wordCount, isOwner, canComment = true, pageStyle, onPageStylePatch, onClose }: InfoTabProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<'info' | 'actions'>('info');
  // G225：官方动作项里有五项印键位字形；本地绑定表是唯一来源。
  const shortcutGlyph = (id: string) => {
    const binding = KEY_BINDINGS.find((candidate) => candidate.id === id);
    return binding ? displayFor(binding, detectPlatform()) : '';
  };
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [backlinksLoaded, setBacklinksLoaded] = useState(false);
  const [backlinkSort, setBacklinkSort] = useState<BacklinkSort>('alphabetical');
  const [collapsedLinks, setCollapsedLinks] = useState<ReadonlySet<string>>(new Set());
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [recentDocs, setRecentDocs] = useState<{ id: string; title: string }[]>([]);
  // 「位置」段自己取数：移动菜单的 docs 特意过滤掉本文档，而面包屑要看它自己的
  // parentId / folderId；菜单数据也只有点开菜单才加载，位置段却是常驻的。
  const [locDocs, setLocDocs] = useState<PathNode[]>([]);
  // G626: the info panel's top section is a live table of contents; empty docs get the guide copy.
  const [toc, setToc] = useState<TocEntry[]>([]);

  useEffect(() => {
    if (!editor) {
      setToc([]);
      return;
    }
    const refresh = () => setToc(extractToc(editor.state.doc as never));
    refresh();
    editor.on('update', refresh);
    return () => {
      editor.off('update', refresh);
    };
  }, [editor]);
  const [locFolders, setLocFolders] = useState<FolderItem[]>([]);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationTick, setLocationTick] = useState(0);
  const [busy, setBusy] = useState(false);
  // G300: exporting has its own progress sentence even though the action looks quick.
  const [exporting, setExporting] = useState(false);
  // G1455：「动作」页的 12 项按"有没有选中块"分档禁用——无选区时只有「在页面中查找」「快速开启」
  // 两枚可点，其余 10 枚置灰（官方那屏的实测读数）。
  const hasBlockSelection = editor ? editor.state.selection instanceof NodeSelection : false;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // G64: 分享卡片图片的字体与页面尺寸。
  const [imageFont, setImageFont] = useState<ShareImageFontSize>(DEFAULT_SHARE_IMAGE_FONT);
  const [imageSize, setImageSize] = useState<ShareImagePageSize>(DEFAULT_SHARE_IMAGE_SIZE);
  // G149: PDF 导出的纸张 / 深色 / 页码 / 水印。
  const [pdfOptions, setPdfOptions] = useState<PdfExportOptions>(DEFAULT_PDF_EXPORT_OPTIONS);
  // The property rows read the document's own timestamps and author (G202) rather than fixed strings.
  const [meta, setMeta] = useState<{ createdAt: string; updatedAt: string; authorName: string | null } | null>(null);
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
        const row = doc as { createdAt?: string; updatedAt?: string; authorName?: string | null };
        setMeta({
          createdAt: row.createdAt ?? '',
          updatedAt: row.updatedAt ?? '',
          authorName: row.authorName ?? null,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [documentId]);

  useEffect(() => {
    let alive = true;
    getRecentDocuments(6)
      .then((rows) => {
        if (!alive) return;
        setRecentDocs(
          (rows as { id: string; title: string }[])
            .filter((row) => row.id !== documentId)
            .slice(0, 5),
        );
      })
      .catch(() => {});
    Promise.all([getDocuments(), getFolders()])
      .then(([docRows, folderRows]) => {
        if (!alive) return;
        setLocDocs((docRows as PathNode[]) ?? []);
        setLocFolders((folderRows as FolderItem[]) ?? []);
        setLocationLoaded(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [documentId, locationTick]);

  const handleExport = async (format: ExportFormat) => {
    setBusy(true);
    setExporting(true);
    try {
      const file = await exportDocument(documentId, format, format === 'pdf' ? pdfOptions : undefined);
      const payload = file.encoding === 'base64'
        ? Uint8Array.from(atob(file.body), (char) => char.charCodeAt(0))
        : file.body;
      const blob = new Blob([payload], { type: file.mime });
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
      setExporting(false);
    }
  };

  const handleExportImage = async () => {
    setBusy(true);
    const root = window.document.documentElement;
    const previousFontSize = root.style.fontSize;
    try {
      const target = window.document.querySelector('.ProseMirror') as HTMLElement | null;
      if (!target) throw new Error('找不到编辑器');
      const { toPng } = await import('html-to-image');
      // G64: prose sizes are rem-based, so the font preset is applied to `<html>` for the capture
      // and restored immediately after. Page presets only add canvas room; content is never cropped.
      root.style.fontSize = `${Math.round(16 * SHARE_IMAGE_FONT_SCALE[imageFont])}px`;
      const rect = target.getBoundingClientRect();
      const canvas = shareImageCanvas(imageSize, rect.width, Math.max(target.scrollHeight, rect.height));
      // G485: export resolution is the container's CSS size × devicePixelRatio, so a 2× screen
      // gets a 2× image and a 1× screen is not falsely upscaled.
      const pixelRatio = window.devicePixelRatio || 1;
      const dataUrl = await toPng(target, {
        backgroundColor: '#ffffff',
        pixelRatio,
        width: canvas.width,
        height: canvas.height,
      });
      const link = window.document.createElement('a');
      link.href = dataUrl;
      link.download = `${window.document.title || 'document'}.png`;
      link.click();
      setActionError(null);
    } catch {
      setActionError('导出失败');
    } finally {
      root.style.fontSize = previousFontSize;
      setBusy(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      await saveAsTemplate(documentId);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (error) {
      // G236：体积超限时服务端抛的就是官方那句，原样显示；其余仍是本地兜底。
      alert(error instanceof Error ? error.message : '另存为模板失败');
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
      .catch(() => {})
      .finally(() => setBacklinksLoaded(true));
    getSubpageStats(documentId)
      .then((rows) => setSubpages(rows))
      .catch(() => {});
    resolveFavoriteState(documentId)
      .then((favored) => setIsFavorite(favored))
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
      setIsFavorite(await toggleFavoriteLocal({ documentId, favored: isFavorite }));
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
      const manager = getSyncManager();
      // G1514：开库闸门已在内核门面里 ⇒ 不再拿 boot() 当就绪闸门（那会把一趟网络往返
      // 塞进「移动到这里」这一击）。
      const patch = { folderId: target.folderId ?? null, parentId: target.parentId ?? null };
      await manager.applyLocal({ table: 'document', id: documentId, patch });
      // 位置段是本面板的常驻内容，router.refresh 不会重跑它的客户端取数 ⇒ 先就地改写
      setLocDocs((rows) => rows.map((row) => (row.id === documentId ? { ...row, ...patch } : row)));
      await manager.flushNow();
      setLocationTick((tick) => tick + 1);
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
  const locationLabel = locationPathLabel(locDocs, documentId, locFolders);

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
          {/* G626: TOC is a first-class section at the top; an empty doc shows the guide sentence
              instead of hiding the section. */}
          <section data-testid="info-toc">
            <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">
              {TOC_TITLE}
            </h4>
            {toc.length === 0 ? (
              <p className="text-ui text-foreground/50">{TOC_EMPTY_COPY}</p>
            ) : (
              <ul className="space-y-1">
                {toc.map((entry, index) => (
                  <li key={`${entry.pos}-${index}`}>
                    <button
                      type="button"
                      onClick={() => {
                        editor?.chain().focus().setTextSelection(entry.pos + 1).scrollIntoView().run();
                      }}
                      className="w-full truncate rounded px-1 py-0.5 text-left text-ui text-foreground/75 hover:bg-foreground/4 hover:text-foreground"
                      style={{ paddingLeft: `${(Math.max(1, entry.level) - 1) * 12 + 4}px` }}
                    >
                      {entry.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
                <span>{meta?.authorName || '—'}</span>
              </div>
            </div>
          </section>

          {/* G1453：官方「页面信息」的第二段是「展示」——页面自己的显示开关。
              本地这份读写与样式页签同一份 `pageStyle`，所以两边永远一致。 */}
          {pageStyle && onPageStylePatch && (
            <section data-testid="info-present-section">
              <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">展示</h4>
              <div className="space-y-1">
                <label className="flex items-center justify-between rounded-md px-1 py-1 text-ui">
                  <span>显示文档标题</span>
                  <input
                    type="checkbox"
                    data-testid="info-show-title"
                    checked={pageStyle.showTitle !== false}
                    onChange={(event) => onPageStylePatch({ showTitle: event.target.checked })}
                    className="size-4 accent-(--craft-accent)"
                  />
                </label>
                <label className="flex items-center justify-between rounded-md px-1 py-1 text-ui">
                  <span>拼写检查</span>
                  <input
                    type="checkbox"
                    data-testid="info-spelling"
                    checked={pageStyle.spelling === true}
                    onChange={(event) => onPageStylePatch({ spelling: event.target.checked })}
                    className="size-4 accent-(--craft-accent)"
                  />
                </label>
              </div>
            </section>
          )}

          {/* Location — the document's folder or ancestry (G203), 未分类 when it has neither */}
          {locationLoaded && (
            <section>
              <h4 className="mb-2 text-caption font-medium uppercase tracking-wider text-foreground/40">
                {LOCATION_TITLE}
              </h4>
              <div className="flex items-center gap-2.5 text-ui text-muted-foreground">
                <Folder className="size-3.5" />
                <span className="truncate">{locationLabel}</span>
              </div>
              {/* G236：从模板新建的文档带「来自模板」标记。 */}
              {pageStyle?.fromTemplate && (
                <div
                  data-testid="from-template"
                  className="mt-1.5 flex items-center gap-2.5 text-ui text-muted-foreground"
                >
                  <LayoutTemplate className="size-3.5" />
                  <span>{FROM_TEMPLATE_LABEL}</span>
                </div>
              )}
            </section>
          )}

          {/* Tags */}
          <TagsSection documentId={documentId} />

          {/* Collaborators */}
          <MembersSection documentId={documentId} canManage={isOwner} />

          {/* G1437: 「最近使用」— the same group the official info pane carries next to members. */}
          {recentDocs.length > 0 && (
            <section>
              <h3 className="mb-2 text-ui font-medium text-foreground/70">最近使用</h3>
              <div className="space-y-0.5">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-2 rounded px-1 py-1 text-ui text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground"
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{doc.title || untitledFor('list')}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Backlinks — three sorts plus expand/collapse all (G63), with its own loading line. */}
          {!backlinksLoaded ? (
            <p className="text-ui text-foreground/40" role="status" aria-live="polite">
              {BACKLINKS_LOADING}
            </p>
          ) : backlinks.length > 0 && (
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
              <h4 className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-wider text-foreground/40">
                {/* G1454：官方统计段带三枚图标——富文本／纯文本／Viewfinder（圈定范围）。 */}
                <FileText className="size-3" data-testid="stats-icon-rich" />
                <Type className="size-3" data-testid="stats-icon-plain" />
                <Scan className="size-3" data-testid="stats-icon-viewfinder" />
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
              {/* G377：官方「统计」区是五项（字数／字符数／不包括空格／区块／阅读时间）。 */}
              <div>{stats.words.toLocaleString()} 字</div>
              <div>{stats.characters.toLocaleString()} 字符</div>
              <div>{stats.charactersNoSpaces.toLocaleString()} 字符（不包括空格）</div>
              <div>{stats.blocks.toLocaleString()} 区块</div>
              <div>{stats.readingLabel} 阅读</div>
            </div>
          </section>

          <CommentSection documentId={documentId} editor={editor} canComment={canComment} />
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
                <span className="text-meta font-medium">{MOVE_TO}</span>
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
                  <span>📁</span>
                  <span className="truncate">{UNSORTED_TITLE}</span>
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
            <span>{MOVE_TO}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              // G1570: 「在页面中查找」是查找那一档（不带替换框），与 ⌘F 同档。
              useFindReplaceStore.getState().openWith(false);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <Search className="size-3.5 text-muted-foreground" />
            <span>在页面中查找</span>
            <kbd className="ml-auto text-[10px] text-foreground/40">{shortcutGlyph('FIND_IN_PAGE')}</kbd>
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('info');
              useCommentRequestStore.getState().ask();
            }}
            disabled={!actionEnabled('addComment', hasBlockSelection)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
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
          <button
            type="button"
            onClick={() => {
              useTitleRequestStore.getState().ask();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4"
          >
            <Pencil className="size-3.5 text-muted-foreground" />
            <span>重命名</span>
          </button>
          {([
            ['up', '上移', ArrowUp, 'MOVE_BLOCK_UP'],
            ['down', '下移', ArrowDown, 'MOVE_BLOCK_DOWN'],
            ['top', '移至顶部', ChevronsUp, 'MOVE_BLOCK_TOP'],
            ['bottom', '移至底部', ChevronsDown, 'MOVE_BLOCK_BOTTOM'],
          ] as const).map(([target, label, Icon, bindingId]) => (
            <button
              key={target}
              type="button"
              disabled={!actionEnabled('moveUp', hasBlockSelection)}
              onClick={() => moveSelection(editor, target)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              <span>{label}</span>
              <kbd className="ml-auto text-[10px] text-foreground/40">{shortcutGlyph(bindingId)}</kbd>
            </button>
          ))}
          {/* G197：组合＝把选区触及的块包进卡片；取消组合＝把卡片拆回顶层。 */}
          <button
            type="button"
            onClick={() => groupSelection(editor)}
            disabled={!editor || !canGroup(editor.state)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
          >
            <Group className="size-3.5 text-muted-foreground" />
            <span>组合</span>
          </button>
          <button
            type="button"
            onClick={() => ungroupSelection(editor)}
            disabled={!editor || !canUngroup(editor.state)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui transition-colors hover:bg-foreground/4 disabled:opacity-50"
          >
            <Ungroup className="size-3.5 text-muted-foreground" />
            <span>取消组合</span>
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={busy || !actionEnabled('duplicate', hasBlockSelection)}
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
          {/* G298：**非所有者**才有"离开文档"——成员离开的是自己那一行，所有者没有成员行可删。
              官方把它做成带后果句的独立确认（「你可能无法再访问它。」），不是直接执行。 */}
          {!isOwner && (
            <button
              type="button"
              data-testid="leave-document"
              onClick={async () => {
                const confirmed = await confirmDialog({
                  title: LEAVE_DOCUMENT_SINGULAR,
                  confirmLabel: LEAVE_CONFIRM,
                });
                if (!confirmed) return;
                try {
                  await leaveDocument(documentId);
                  onClose();
                  router.push('/documents');
                } catch {
                  // G298 失败态：官方那两句（标题 + 描述）——这里合成一条 toast。
                  toast.add({ id: 'leave-failed', type: 'error', title: LEAVE_FAILED_TITLE, description: LEAVE_FAILED_DESC });
                }
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-ui text-destructive transition-colors hover:bg-foreground/4"
            >
              <LogOut className="size-3.5" />
              <span>离开文档</span>
            </button>
          )}
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
                {(['markdown', 'html', 'text', 'json', 'docx', 'pdf', 'textbundle'] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={busy}
                    onClick={() => handleExport(format)}
                    className="rounded-md border border-foreground/10 px-2 py-1.5 text-meta transition-colors hover:bg-foreground/4 disabled:opacity-50"
                  >
                    {format === 'markdown'
                      ? 'Markdown'
                      : format === 'html'
                        ? 'HTML'
                        : format === 'text'
                          ? '纯文本'
                          : format === 'json'
                            ? 'JSON'
                            : format === 'docx'
                              ? 'Word'
                              : format === 'pdf'
                                ? 'PDF'
                                : 'TextBundle'}
                  </button>
                ))}
              </div>
              {/* G149: PDF 纸张三档 + 深色 / 页码 / 水印。 */}
              <div className="mb-2 space-y-1.5" data-testid="pdf-export-options">
                <p className="text-[11px] text-muted-foreground">{PDF_PAPER_LABEL}</p>
                <div className="grid grid-cols-3 gap-1">
                  {PDF_PAPER_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={pdfOptions.paper === option.id}
                      onClick={() => setPdfOptions((current) => ({ ...current, paper: option.id }))}
                      className={cn(
                        'rounded-md border px-1 py-1 text-meta transition-colors',
                        pdfOptions.paper === option.id
                          ? 'border-craft-accent bg-craft-accent/10 text-foreground'
                          : 'border-foreground/10 text-foreground/55 hover:bg-foreground/4'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {PDF_TOGGLE_OPTIONS.map((option) => {
                    const on = pdfOptions[option.id];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={option.label}
                        onClick={() => setPdfOptions((current) => ({ ...current, [option.id]: !on }))}
                        className={cn(
                          'rounded-md border px-1.5 py-1 text-[11px] transition-colors',
                          on
                            ? 'border-craft-accent bg-craft-accent/10 text-foreground'
                            : 'border-foreground/10 text-foreground/55 hover:bg-foreground/4'
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleExportImage()}
                className="w-full rounded-md border border-foreground/10 px-2 py-1.5 text-meta transition-colors hover:bg-foreground/4 disabled:opacity-50"
              >
                图片
              </button>
              {/* G64: 分享卡片图片的两段配置（字体大小 / 页面大小）。 */}
              <div className="mt-2 space-y-2 border-t border-foreground/10 pt-2">
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">{SHARE_IMAGE_FONT_SECTION.label}</p>
                  <div className="grid grid-cols-3 gap-1">
                    {SHARE_IMAGE_FONT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={imageFont === option.id}
                        onClick={() => setImageFont(option.id)}
                        className={cn(
                          'rounded-md border px-1 py-1 text-meta transition-colors',
                          imageFont === option.id
                            ? 'border-craft-accent bg-craft-accent/10 text-foreground'
                            : 'border-foreground/10 text-foreground/55 hover:bg-foreground/4'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">{SHARE_IMAGE_SIZE_SECTION.label}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {SHARE_IMAGE_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={imageSize === option.id}
                        onClick={() => setImageSize(option.id)}
                        className={cn(
                          'rounded-md border px-1 py-1 text-[11px] transition-colors',
                          imageSize === option.id
                            ? 'border-craft-accent bg-craft-accent/10 text-foreground'
                            : 'border-foreground/10 text-foreground/55 hover:bg-foreground/4'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {exporting && (
                <p role="status" aria-live="polite" className="mt-1.5 text-meta text-muted-foreground">
                  {pendingLabel('exportingDocuments')}
                </p>
              )}
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
