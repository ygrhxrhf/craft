'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSyncManager } from '@/lib/sync-core';
import { Editor, type SaveState } from './Editor';
import { EditorHeader } from './EditorHeader';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
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
import { normalizeCoverImages, pickCoverImage } from '@/lib/document/cover-rotation';
import { DEFAULT_FRAME, frameStyle, moveFrame, readImageFrame, zoomFrame, type ImageFrame } from '@/lib/editor/image-frame';
import { cropMaskForFrame } from '@/lib/editor/image-crop';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { useRightPanelStore } from '@/lib/store/use-right-panel-store';
import { capabilitiesFor } from '@/lib/authz/permission-axes';
import { KEY_BINDINGS, displayFor } from '@/lib/editor/keymap';
import { usePlatform } from '@/lib/editor/use-platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareDialog } from '@/components/share/ShareDialog';
import { OpenInAppNotice } from '@/components/app/OpenInAppNotice';
import { SHARE_TRIGGER_LABEL } from '@/lib/share/invite-copy';
import { normalizePageStyle, getFontStack, getThemeColor, getWashiGradient, separatorStyleOf, showsDocumentTitle, colorChannelCss, colorPairCss } from './themes/page-style';
import { backdropBackground, parseBackdrop } from '@/lib/editor/themes/backdrop';
import { parseSeparatorExpression } from '@/lib/editor/separator-expression';
import { DOODLE_SEPARATOR_CSS, washiTapeSrc } from '@/lib/editor/themes/washi-catalog';
import { washiPatternBackground } from '@/lib/editor/washi-patterns';
import type { PageStyle } from './themes/page-style';
import { getDraft } from '@/lib/offline/draft-store';
import { ALL_CHANGES_SAVED, offlineSaveLabel } from '@/lib/offline/save-status';
import { planTrailingClick } from '@/lib/editor/trailing-click';
import { TaskDateQuickMenu } from '@/components/editor/TaskDateQuickMenu';
import { FloatingThreadWindow } from '@/components/editor/comments/FloatingThreadWindow';
import { LeftToolRail } from '@/components/editor/LeftToolRail';

const TAB_ORDER = ['insert', 'format', 'style', 'info'] as const;
const TAB_ICONS = { insert: LayoutGrid, format: Type, style: Palette, info: Info };
const TAB_LABELS: Record<RightTabId, string> = {
  insert: '插入',
  format: '格式',
  style: '样式',
  info: '信息',
};
// G956: whether the right rail is open and which tab it sits on is a persistent
// state that survives document switches — carry it in localStorage like G756.
const RIGHT_TAB_STORAGE_KEY = 'craft.editor.right-tab';
const RIGHT_TAB_CLOSED = 'closed';

interface DocumentEditorProps {
  document: {
    id: string;
    title: string;
    icon: string | null;
    coverImage: string | null;
    coverType: string | null;
    coverImages?: unknown;
    coverShuffle?: boolean;
    coverFrame?: unknown;
    coverCropMask?: string | null;
    coverWidth?: number | null;
    coverAspect?: number | null;
    coverRawWidth?: number | null;
    coverRawAspect?: number | null;
    width: string | null;
    pageStyle: unknown;
    content: any;
    isDailyNote?: boolean;
  };
  role?: 'owner' | 'editor' | 'commenter' | 'viewer';
}

export function DocumentEditor({ document: doc, role = 'owner' }: DocumentEditorProps) {
  // G588: the three capability keys come from the role, each independent — `commenter` can comment
  // without editing, which a single `canEdit` boolean could not express.
  const { canEdit, canComment } = capabilitiesFor(role);
  const isOwner = role === 'owner';
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const toggleMobileNav = useSidebarStore((store) => store.toggleMobileNav);
  const bumpTree = useSidebarStore((store) => store.bumpTree);
  const [title, setTitle] = useState(doc.title);
  const [icon, setIcon] = useState(doc.icon);
  const [coverImage, setCoverImage] = useState(doc.coverImage);
  const [coverImages, setCoverImages] = useState<string[]>(() => normalizeCoverImages(doc.coverImages));
  const [coverShuffle, setCoverShuffle] = useState(doc.coverShuffle === true);
  // G503：封面裁剪帧与处理后/原始两套尺寸。
  const [coverFrame, setCoverFrame] = useState<ImageFrame>(() => readImageFrame((doc.coverFrame ?? DEFAULT_FRAME) as any));
  const coverFrameRef = useRef(coverFrame);
  coverFrameRef.current = coverFrame;
  const coverDragRef = useRef<{ x: number; y: number; frame: ImageFrame } | null>(null);
  const [coverType, setCoverType] = useState(doc.coverType);
  const [width, setWidth] = useState(doc.width ?? 'default');
  const [pageStyle, setPageStyle] = useState<PageStyle>(() => normalizePageStyle(doc.pageStyle));
  const pageStyleRef = useRef(pageStyle);
  const [activeTab, setActiveTab] = useState<RightTabId | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem(RIGHT_TAB_STORAGE_KEY);
    return (TAB_ORDER as readonly string[]).includes(saved ?? '') ? (saved as RightTabId) : null;
  });
  // G956: the initializer above already read the stored tab, so this only records changes.
  // 「关着」也要记：官方那对状态是「开没开 ＋ 在哪个标签」，只记标签会让关掉的面板在下一篇文档里
  // 又自己打开。
  useEffect(() => {
    try {
      window.localStorage.setItem(RIGHT_TAB_STORAGE_KEY, activeTab ?? RIGHT_TAB_CLOSED);
    } catch {
      // Private mode can refuse storage; the rail still holds state within the session.
    }
  }, [activeTab]);
  // 添加评论 from the block menu opens the info panel, which holds the composer.
  const commentRequest = useCommentRequestStore((state) => state.request);
  // 请求号变了就打开信息面板。放渲染期按上一值调整（React 规定的「props 变化时调整 state」写法），
  // 而不是 effect 里同步 setState —— 后者会被 react-hooks/set-state-in-effect 拦下。
  const [syncedCommentRequest, setSyncedCommentRequest] = useState(commentRequest);
  if (syncedCommentRequest !== commentRequest) {
    setSyncedCommentRequest(commentRequest);
    if (commentRequest > 0) setActiveTab('info');
  }
  // G1578：Ctrl-Shift-M 走同一条渲染期请求通道打开评论所在的信息面板。
  const panelRequest = useRightPanelStore((state) => state.request);
  const [syncedPanelRequest, setSyncedPanelRequest] = useState(panelRequest);
  if (syncedPanelRequest !== panelRequest) {
    setSyncedPanelRequest(panelRequest);
    if (panelRequest > 0) setActiveTab(useRightPanelStore.getState().tab);
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
    coverImages?: string[];
    coverShuffle?: boolean;
    coverFrame?: ImageFrame;
    coverCropMask?: string | null;
    coverWidth?: number | null;
    coverAspect?: number | null;
    coverRawWidth?: number | null;
    coverRawAspect?: number | null;
    width?: string | null;
    pageStylePatch?: Partial<PageStyle>;
  }) => {
    if (!canEdit) return;
    if (data.title !== undefined) setTitle(data.title);
    if (data.icon !== undefined) setIcon(data.icon);
    if (data.coverImage !== undefined) setCoverImage(data.coverImage);
    if (data.coverImages !== undefined) setCoverImages(data.coverImages);
    if (data.coverShuffle !== undefined) setCoverShuffle(data.coverShuffle);
    if (data.coverFrame !== undefined) setCoverFrame(data.coverFrame);
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
  // G708：主题补丁写的 backgroundColor 是明暗对，交给 `light-dark()` 按 `color-scheme` 取半；
  // 单值与老文档走原路。不用 JS 判断明暗——服务端与首个客户端渲染的字符串必须一致（注水）。
  const backgroundChannel =
    colorChannelCss(pageStyle.backgroundColor) ?? getThemeColor(pageStyle.theme, pageStyle.themeColor);
  const textColorChannel = colorChannelCss(pageStyle.textColor) ?? pageStyle.textColor;
  // G706：backdrop 画在页面列外层（官方是整页铺满），页面卡的底色仍是主题背景。
  const backdrop = parseBackdrop(pageStyle.backdrop);
  const backdropCss = backdropBackground(backdrop);
  const washiGradient = getWashiGradient(pageStyle.washi);
  // G210：页面分隔符三档——和纸胶带优先用官方图库的胶带图，老文档沿用内置渐变；涂鸦用手绘线近似。
  const separatorStyle = separatorStyleOf(pageStyle);
  // G708/G707：主题写下的原始分隔线表达式（image/pattern 两形态）优先于三档开关的回推。
  const separatorExpr = parseSeparatorExpression(pageStyle.separatorStyleRaw);
  const washiTapeImg = washiTapeSrc(pageStyle.washi);

  // G156：随机封面每次加载在 coverImages 里挑一张；关掉时用 coverImage。
  const displayCover = useMemo(
    () => pickCoverImage(coverImage, coverImages, coverShuffle),
    [coverImage, coverImages, coverShuffle],
  );
  const isColorCover = coverType === 'color' && displayCover;
  const isImageCover = coverType === 'image' && displayCover;

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
            {/* G1451：文档级 `⋯` —— 官方那五分组弹层（页面样式／查找·目录／视图／移至／撤销重做）。
                「视图」是全屏资料的一栏切换，本仓落到右侧面板的对应页签。 */}
            <DocumentActionsMenu
              onPageStyle={() => setActiveTab('style')}
              onFindInPage={() => useFindReplaceStore.getState().openWith(false)}
              // G288/G1451：官方这枚「目录」是**在正文里插一张目录块**（`table.of.contents` 的宿主
              // 就是文档级 `⋯` 的 navigationSection），不是切面板。此前接到右侧信息页是接错了。
              onTableOfContents={() => editor?.chain().focus().insertTableOfContents().run()}
              onMoveTo={() => setActiveTab('info')}
              onUndo={() => editor?.chain().focus().undo().run()}
              onViewTab={(tab) =>
                // 视图那四枚在本仓都落到右侧面板：页面信息/任务/附件/评论都住在「信息」页签里
                // （评论区就在该面板内），所以一次切换即可。
                setActiveTab(tab === 'tasks' || tab === 'attachments' ? 'info' : 'info')
              }
            />
            {isOwner && !isMobile && (
              // G931：官方分享入口是**文案为「共享」的按钮**（可见文本、没有 `aria-label`）。
              <button
                onClick={() => setShareOpen(true)}
                type="button"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Share2 className="size-4" />
                {SHARE_TRIGGER_LABEL}
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
          {backdropCss && (
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: backdropCss }} />
          )}
          <div
            className="relative mx-auto rounded-2xl px-[var(--editor-pad-x)] pb-32 shadow-doc"
            style={{
              ['--editor-measure' as string]: measure,
              maxWidth: 'var(--editor-max-w, var(--editor-measure))',
              backgroundColor: backgroundChannel,
              color: textColorChannel,
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
              // 菜单等 portal 里的按下沿 React 树冒泡到这里，DOM 上却不在本列——
              // 它们不是「点了页面空白」，放进来就会凭空补一个末尾空块。
              if (!event.currentTarget.contains(target)) return;
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
            {/* G100：左侧常驻工具（附件 / 查找和替换 / 目录 / 任务）。 */}
            <LeftToolRail editor={editor} />
            {separatorStyle === 'washi' &&
              separatorExpr?.kind === 'washi-image' && (
                <img
                  aria-hidden
                  src={separatorExpr.url}
                  alt=""
                  className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm object-cover opacity-80 shadow-sm"
                />
              )}
            {separatorStyle === 'washi' &&
              separatorExpr?.kind === 'washi-pattern' && (
                <div
                  aria-hidden
                  data-testid="page-washi-pattern"
                  data-washi-pattern={separatorExpr.pattern}
                  className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm opacity-80 shadow-sm"
                  style={washiPatternBackground(
                    separatorExpr.pattern,
                    colorPairCss(separatorExpr.light, separatorExpr.dark),
                  )}
                />
              )}
            {separatorStyle === 'washi' &&
              !separatorExpr?.kind.startsWith('washi') &&
              (washiTapeImg ? (
                <img
                  aria-hidden
                  src={washiTapeImg}
                  alt=""
                  className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm object-cover opacity-80 shadow-sm"
                />
              ) : washiGradient ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 -rotate-2 rounded-b-sm opacity-80 shadow-sm"
                  style={{ background: washiGradient }}
                />
              ) : null)}
            {separatorStyle === 'doodle' && (
              <div
                aria-hidden
                data-testid="page-doodle-separator"
                className="pointer-events-none absolute left-1/2 top-0 z-10 h-3.5 w-32 -translate-x-1/2 opacity-70"
                style={{ background: DOODLE_SEPARATOR_CSS }}
              />
            )}
            {/* 封面 */}
            {isColorCover && (
              <div
                className="mb-6 h-48 w-full rounded-lg"
                style={{ backgroundColor: displayCover! }}
              />
            )}
            {isImageCover && (
              <div
                className="mb-6 h-48 w-full touch-none overflow-hidden rounded-lg"
                onPointerDown={(event) => {
                  if (!canEdit) return;
                  coverDragRef.current = { x: event.clientX, y: event.clientY, frame: coverFrameRef.current };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const start = coverDragRef.current;
                  if (!start) return;
                  const box = event.currentTarget.getBoundingClientRect();
                  setCoverFrame(
                    moveFrame(start.frame, event.clientX - start.x, event.clientY - start.y, box.width, box.height),
                  );
                }}
                onPointerUp={() => {
                  if (!coverDragRef.current) return;
                  coverDragRef.current = null;
                  const next = coverFrameRef.current;
                  void handleUpdate({ coverFrame: next, coverCropMask: cropMaskForFrame(next) });
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayCover!}
                  alt="Cover"
                  draggable={false}
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    if (doc.coverRawWidth == null && img.naturalWidth > 0) {
                      const rawAspect = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null;
                      void handleUpdate({
                        coverRawWidth: img.naturalWidth,
                        coverRawAspect: rawAspect,
                        coverWidth: doc.coverWidth ?? img.naturalWidth,
                        coverAspect: doc.coverAspect ?? rawAspect,
                      });
                    }
                  }}
                  className="h-full w-full object-cover"
                  style={frameStyle(coverFrame)}
                />
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
          coverImages={coverImages}
          coverShuffle={coverShuffle}
          coverFrame={coverFrame}
          width={width}
          pageStyle={pageStyle}
          wordCount={wordCount}
          isOwner={isOwner}
          canEdit={canEdit}
          canComment={canComment}
          onUpdate={handleUpdate}
        />
      )}

      <ShareDialog documentId={doc.id} open={shareOpen} onClose={() => setShareOpen(false)} />
      {/* G58：点正文评论高亮弹出的浮动线程窗口。 */}
      <FloatingThreadWindow documentId={doc.id} />
      <TaskDateQuickMenu />
      {/* G717：web 端进文档的非模态「在桌面应用中打开？」提示。 */}
      {!focusActive && <OpenInAppNotice documentId={doc.id} />}
    </div>
  );
}
