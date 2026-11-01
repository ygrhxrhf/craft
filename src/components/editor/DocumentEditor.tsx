'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSyncManager } from '@/lib/sync-core';
import { Editor, type SaveState } from './Editor';
import { EditorHeader } from './EditorHeader';
import { DailyNoteNav } from './DailyNoteNav';
import { RightPanel, type RightTabId } from './tabs/RightPanel';
import { Breadcrumb } from './Breadcrumb';
import { FindReplacePanel } from './find-replace-panel';
import { TemplatePicker } from './template-picker';
import { Share2, LayoutGrid, Type, Palette, Info, Menu, MoreHorizontal, Focus } from 'lucide-react';
import { cn } from 'cn';
import { useIsCompact, useIsMobile } from '@/lib/use-is-mobile';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';
import { useActiveEditorStore } from '@/lib/store/use-active-editor-store';
import { useFocusStore } from '@/lib/store/use-focus-store';
import { EXIT_FOCUS_MODE_PREFIX, FOCUS_MODE } from '@/lib/editor/focus-mode-copy';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { KEY_BINDINGS, displayFor } from '@/lib/editor/keymap';
import { usePlatform } from '@/lib/editor/use-platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareDialog } from '@/components/share/ShareDialog';
import { normalizePageStyle, getFontStack, getThemeColor, getWashiGradient, showsDocumentTitle } from './themes/page-style';
import type { PageStyle } from './themes/page-style';
import { getDraft } from '@/lib/offline/draft-store';
import { ALL_CHANGES_SAVED, offlineSaveLabel } from '@/lib/offline/save-status';
import { planTrailingClick } from '@/lib/editor/trailing-click';

const TAB_ORDER = ['insert', 'format', 'style', 'info'] as const;
const TAB_ICONS = { insert: LayoutGrid, format: Type, style: Palette, info: Info };
const TAB_LABELS: Record<RightTabId, string> = {
  insert: '插入',
  format: '格式',
  style: '样式',
  info: '信息',
};

interface DocumentEditorProps {
  document: {
    id: string;
    title: string;
    icon: string | null;
    coverImage: string | null;
    coverType: string | null;
    width: string | null;
    pageStyle: unknown;
    content: any;
    isDailyNote?: boolean;
  };
  role?: 'owner' | 'editor' | 'commenter' | 'viewer';
}

export function DocumentEditor({ document: doc, role = 'owner' }: DocumentEditorProps) {
  const canEdit = role === 'owner' || role === 'editor';
  const isOwner = role === 'owner';
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const toggleMobileNav = useSidebarStore((store) => store.toggleMobileNav);
  const bumpTree = useSidebarStore((store) => store.bumpTree);
  const [title, setTitle] = useState(doc.title);
  const [icon, setIcon] = useState(doc.icon);
  const [coverImage, setCoverImage] = useState(doc.coverImage);
  const [coverType, setCoverType] = useState(doc.coverType);
  const [width, setWidth] = useState(doc.width ?? 'default');
  const [pageStyle, setPageStyle] = useState<PageStyle>(() => normalizePageStyle(doc.pageStyle));
  const pageStyleRef = useRef(pageStyle);
  const [activeTab, setActiveTab] = useState<RightTabId | null>(null);
  // 添加评论 from the block menu opens the info panel, which holds the composer.
  const commentRequest = useCommentRequestStore((state) => state.request);
  // 请求号变了就打开信息面板。放渲染期按上一值调整（React 规定的「props 变化时调整 state」写法），
  // 而不是 effect 里同步 setState —— 后者会被 react-hooks/set-state-in-effect 拦下。
  const [syncedCommentRequest, setSyncedCommentRequest] = useState(commentRequest);
  if (syncedCommentRequest !== commentRequest) {
    setSyncedCommentRequest(commentRequest);
    if (commentRequest > 0) setActiveTab('info');
  }
  const focusActive = useFocusStore((state) => state.active);
  const focusBinding = KEY_BINDINGS.find((binding) => binding.id === 'TOGGLE_FOCUS_MODE');
  // 键位提示是渲染期读出来的文案，所以平台只能挂载后再猜（G1486）。
  const platform = usePlatform();
  const [shareOpen, setShareOpen] = useState(false);
  const [editor, setEditor] = useState<import('@tiptap/react').Editor | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  // The editor hands us its save function on mount. A ref, not state: the editor
  // recreates that function on every render, so storing it in state feeds a
  // setState back into the render that produced it — an update loop.
  const saveNowRef = useRef<(() => void) | null>(null);
  const handleSaveNowReady = useCallback((fn: (() => void) | null) => {
    saveNowRef.current = fn;
  }, []);
  const [wordCount, setWordCount] = useState(0);

  /**
   * G36：保存徽标的离线语义（官方 `interactions.md:71`）。在线时徽标一字不动（返回 null）；
   * 离线时改说「未连接到网络」，每日笔记若已把草稿落进本机库则说「离线更新于 HH:MM」。
   */
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  // 离线时读一眼本机草稿的落盘时刻（每日笔记那句要它）；失败/没有就退到「未连接到网络」。
  // 用「带着 key 的结果」而不是每次同步清空 state：在线时 key 不匹配即视为 null，
  // 因此 effect 里不再有同步 setState（react-hooks/set-state-in-effect）。
  const draftKey = `${offline}|${doc.id}|${saveState}`;
  const [draft, setDraft] = useState<{ key: string; at: number | null } | null>(null);
  useEffect(() => {
    if (!offline) return;
    let alive = true;
    getDraft(doc.id)
      .then((next) => {
        if (alive) setDraft({ key: draftKey, at: next?.savedAt ?? null });
      })
      .catch(() => {
        if (alive) setDraft({ key: draftKey, at: null });
      });
    return () => {
      alive = false;
    };
  }, [offline, doc.id, saveState, draftKey]);
  const draftSavedAt = draft?.key === draftKey ? draft.at : null;
  // G610：打开一篇文档即记一次「上次浏览」（官方 `document_view` 的等价物）——列表档那一列读它。
  //   走内核 applyLocal（元数据列），与页面信息的写入同一条通路。
  useEffect(() => {
    getSyncManager()
      .applyLocal({
        table: 'document',
        id: doc.id,
        patch: { lastViewedAt: new Date().toISOString() },
      })
      .catch(() => {
        // 记浏览时间是便利项，写失败不该打断阅读。
      });
  }, [doc.id]);

  const offlineLabel = offlineSaveLabel({
    offline,
    isDailyNote: Boolean(doc.isDailyNote),
    draftSavedAt,
  });

  const handleEditorReady = useCallback((next: import('@tiptap/react').Editor | null) => {
    setEditor(next);
    useActiveEditorStore.getState().setEditor(next);
  }, []);

  const handleTabClick = (tab: RightTabId) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const availableTabs = TAB_ORDER.filter((tab) => canEdit || tab === 'info');
  const primaryTabs = isMobile ? availableTabs.filter((tab) => tab === 'insert' || tab === 'format') : availableTabs;
  const overflowTabs = isMobile ? availableTabs.filter((tab) => tab !== 'insert' && tab !== 'format') : [];

  const handleUpdate = async (data: {
    title?: string;
    icon?: string | null;
    coverImage?: string | null;
    coverType?: string | null;
    width?: string | null;
    pageStylePatch?: Partial<PageStyle>;
  }) => {
    if (!canEdit) return;
    if (data.title !== undefined) setTitle(data.title);
    if (data.icon !== undefined) setIcon(data.icon);
    if (data.coverImage !== undefined) setCoverImage(data.coverImage);
    if (data.coverType !== undefined) setCoverType(data.coverType);
    if (data.width !== undefined) setWidth(data.width ?? 'default');
    const { pageStylePatch, ...rest } = data;
    let pageStyleToSave: PageStyle | undefined;
    if (pageStylePatch !== undefined) {
      pageStyleToSave = { ...pageStyleRef.current, ...pageStylePatch };
      pageStyleRef.current = pageStyleToSave;
      setPageStyle(pageStyleToSave);
    }
    setSaveState('saving');
    try {
      // 页面信息（title/icon/cover/width/pageStyle 均为元数据列）→ applyLocal；
      // patch 只带实际变更字段（undefined 不能入 payload）
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) patch[key] = value;
      }
      if (pageStyleToSave !== undefined) patch.pageStyle = pageStyleToSave;
      await getSyncManager().applyLocal({ table: 'document', id: doc.id, patch });
      setSaveState('saved');
      // The sidebar row shows the same title, so keep it in step with the editor.
      if (data.title !== undefined) bumpTree();
    } catch {
      setSaveState('error');
    }
  };

  const measure = width === 'narrow' ? '580px' : width === 'wide' ? '900px' : '720px';
  const themeColor = getThemeColor(pageStyle.theme);
  const washiGradient = getWashiGradient(pageStyle.washi);

  const isColorCover = coverType === 'color' && coverImage;
  const isImageCover = coverType === 'image' && coverImage;

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏：面包屑 + 右侧 tab 按钮 */}
        <div
          data-testid="document-topbar"
          className={cn(
            'flex h-12 shrink-0 items-center justify-between px-4',
            focusActive && 'hidden',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {isMobile && (
              <button
                type="button"
                onClick={toggleMobileNav}
                aria-label="打开导航"
                className="-ml-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Menu className="size-4" />
              </button>
            )}
            <Breadcrumb title={title} />
            <span
              role="status"
              aria-live="polite"
              className={cn(
                'shrink-0 text-[11px] transition-colors',
                saveState === 'error' ? 'text-destructive' : 'text-muted-foreground/60'
              )}
            >
              {offlineLabel ? (
                offlineLabel
              ) : (
                <>
                  {saveState === 'dirty' && '未保存'}
                  {saveState === 'saving' && '保存中...'}
                  {saveState === 'saved' && ALL_CHANGES_SAVED}
                  {saveState === 'error' && (
                    <>
                      保存失败
                      <button type="button" onClick={() => saveNowRef.current?.()} className="ml-1 underline underline-offset-2">
                        重试
                      </button>
                    </>
                  )}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {/* 专注模式开关：快捷键（⌘/Ctrl+.）已经在 shell-shortcuts 里，但一条键位不是入口——
                用户不知道键位就没有办法进来。顶栏自身在专注态隐藏，所以退出走下面那条
                `focus-exit` 横条，不依赖这个按钮。 */}
            <button
              onClick={() => useFocusStore.getState().toggle()}
              type="button"
              aria-label={FOCUS_MODE}
              title={focusBinding ? `${FOCUS_MODE} • ${displayFor(focusBinding, platform)}` : FOCUS_MODE}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Focus className="size-4" />
            </button>
            {/* Tab toggle buttons; phones keep two in the bar and fold the rest away */}
            {primaryTabs.map((tab) => {
              const Icon = TAB_ICONS[tab];
              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  type="button"
                  aria-label={TAB_LABELS[tab]}
                  aria-pressed={activeTab === tab}
                  title={TAB_LABELS[tab]}
                  className={cn(
                    'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    activeTab === tab && 'bg-muted text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
            {overflowTabs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  aria-label="更多面板"
                  title="更多面板"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {overflowTabs.map((tab) => (
                    <DropdownMenuItem key={tab} onClick={() => setActiveTab(tab)}>
                      {TAB_LABELS[tab]}
                    </DropdownMenuItem>
                  ))}
                  {isOwner && (
                    <DropdownMenuItem onClick={() => setShareOpen(true)}>分享</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="mx-0.5 h-4 w-px bg-border" />
            {isOwner && !isMobile && (
              <button
                onClick={() => setShareOpen(true)}
                type="button"
                aria-label="分享"
                title="分享"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Share2 className="size-4" />
              </button>
            )}
          </div>
        </div>

        <FindReplacePanel editor={editor} />
        <TemplatePicker />
        {focusActive && focusBinding && (
          <button
            type="button"
            onClick={() => useFocusStore.getState().toggle()}
            className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs text-foreground/70 hover:text-foreground"
            data-testid="focus-exit"
          >
            {`${EXIT_FOCUS_MODE_PREFIX}${displayFor(focusBinding, platform)}`}
          </button>
        )}
        <div className="flex-1 overflow-y-auto">
        <div className="relative min-h-full bg-background px-3 py-5 sm:px-8">
          <div
            className="relative mx-auto rounded-2xl px-[var(--editor-pad-x)] pb-32 shadow-doc"
            style={{
              ['--editor-measure' as string]: measure,
              maxWidth: 'var(--editor-max-w, var(--editor-measure))',
              backgroundColor: themeColor,
              color: pageStyle.textColor,
              fontFamily: getFontStack(pageStyle.fontPack),
            }}
            /**
             * G220：点击正文下方那片空白（页面列自己的 `pb-32` 留白）⇒ 落点落到末尾空块，
             * 末尾不是空块就当场补一个。判据走纯函数 `planTrailingClick`。
             * ☆ 只在可编辑时接：只读视图不该因为点空白就改文档。
             */
            onMouseDown={(event) => {
              if (!canEdit || !editor) return;
              const target = event.target as HTMLElement;
              // 点在已有块/控件上时不插手——交给 ProseMirror 自己的落点规则。
              if (target.closest('.ProseMirror, button, input, a, [role="button"]')) return;
              const lastDom = editor.view.nodeDOM(editor.state.doc.childCount - 1) as HTMLElement | null;
              if (!lastDom) return;
              const last = editor.state.doc.lastChild;
              const plan = planTrailingClick({
                clickY: event.clientY,
                contentBottom: lastDom.getBoundingClientRect().bottom,
                lastBlockIsEmpty: Boolean(last && last.type.name === 'paragraph' && last.textContent.length === 0),
              });
              if (!plan.trailing) return;
              event.preventDefault();
              // ☆ 一条 chain 只能 `run()` 一次：插入与落光标要各起一条，否则第二次带的是
              //   插入前的位置 ⇒ "Applying a mismatched transaction"。
              if (plan.appendEmptyBlock) {
                editor.chain().focus().insertContentAt(editor.state.doc.content.size, { type: 'paragraph' }).run();
              }
              editor.chain().focus('end').run();
            }}
          >
            {washiGradient && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm opacity-80 shadow-sm"
                style={{ background: washiGradient }}
              />
            )}
            {/* 封面 */}
            {isColorCover && (
              <div
                className="mb-6 h-48 w-full rounded-lg"
                style={{ backgroundColor: coverImage! }}
              />
            )}
            {isImageCover && (
              <div className="mb-6 h-48 w-full overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage!} alt="Cover" className="h-full w-full object-cover" />
              </div>
            )}

            {doc.isDailyNote && <DailyNoteNav />}
            {showsDocumentTitle(pageStyle) && (
              <EditorHeader
                documentId={doc.id}
                title={title}
                icon={icon}
                readOnly={!canEdit}
                onTitleChange={(t) => handleUpdate({ title: t })}
                onIconChange={(i) => handleUpdate({ icon: i })}
              />
            )}
            <Editor
              documentId={doc.id}
              initialContent={doc.content}
              collaborative
              readOnly={!canEdit}
              spelling={pageStyle.spelling === true}
              spellingLang={pageStyle.spellingLang}
              onEditorReady={handleEditorReady}
              onSaveStateChange={setSaveState}
              onSaveNowReady={handleSaveNowReady}
              onUpdate={(_, __, count) => setWordCount(count)}
            />
            </div>
          </div>
        </div>
      </div>

      {/* 右侧栏：统一 4-tab 面板。紧凑布局下面板常驻挂载，只翻转 open，
          这样从 ⋯ 菜单打开时不会和菜单自身的关闭打架。 */}
      {!focusActive && (isCompact || activeTab) && (
        <RightPanel
          open={!!activeTab}
          activeTab={activeTab ?? 'insert'}
          onTabChange={(tab) => setActiveTab((prev) => (prev === tab ? null : tab))}
          onClose={() => setActiveTab(null)}
          editor={editor}
          documentId={doc.id}
          title={title}
          icon={icon}
          coverImage={coverImage}
          coverType={coverType}
          width={width}
          pageStyle={pageStyle}
          wordCount={wordCount}
          isOwner={isOwner}
          canEdit={canEdit}
          onUpdate={handleUpdate}
        />
      )}

      <ShareDialog documentId={doc.id} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
