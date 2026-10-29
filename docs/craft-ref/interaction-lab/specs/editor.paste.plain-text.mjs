/**
 * spec: editor.paste.plain-text
 *
 * 主交互：**粘贴纯文本**——多行文本会不会拆成多块、裸 URL 会不会被转成卡片。
 *
 * 为什么这一族要采：粘贴从没做过两侧对照。静态账里只有两条：
 *  - `keyboard.md:139` 的键位映射（⌘V = Ctrl-V）；
 *  - `gap.md` **G458** 记的官方 `ClipboardBoundary`（`onCut`/`onCopy`/`onPaste` 接到同一个 handler、
 *    容器带 `data-paste-boundary`），并注明本地 `data-paste-boundary` **零命中**。
 *
 * 本地已读到的实现（`src/components/editor/Editor.tsx:522` 的 `handlePaste`）：
 * 只在两种情形**接管**——① 剪贴板里有图片文件；② 选中区为空且文本是**裸 URL**（`^https?:\/\/\S+$`）
 * ⇒ 转成 `linkPreview` 节点。其余一律 `return false` 交回 ProseMirror 默认（默认按换行拆块）。
 *
 * 判据：
 *  ① 多行文本 `AAA\nBBB` ⇒ 块名册（**拆成两块还是留在同一块的软换行**）；
 *  ② 裸 URL ⇒ 是否变成一个卡片节点（本地会；官方未知，本批量）。
 *
 * ★ 两段之间用 `Ctrl+A` → `Delete` 复位（两侧都支持，见 `editor.selection.ctrl-a-ladder`）。
 */
export default {
  id: 'editor.paste.plain-text',
  wave: 1,
  surface: 'editor.paste',
  target: 'both',
  builtFrom: [
    'keyboard.md:139（⌘V = Ctrl-V 键位映射）',
    'gap.md G458（官方 ClipboardBoundary：onCut/onCopy/onPaste 同一 handler，容器带 data-paste-boundary；本地零命中）',
    'src/components/editor/Editor.tsx:522（本地 handlePaste：图片 / 裸 URL 两种接管，其余回落 ProseMirror 默认）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.paste.plain-text', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.paste.plain-text', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    // ① 多行纯文本
    { op: 'paste', text: 'AAA\nBBB', settleMs: 1500, label: 'paste "AAA\\nBBB"' },

    // 复位
    { op: 'key', chord: 'Control+a', settleMs: 400, label: 'Ctrl+A (reset)' },
    { op: 'key', chord: 'Delete', settleMs: 600, label: 'Delete (reset)' },

    // ② 裸 URL
    { op: 'paste', text: 'https://example.com', settleMs: 2000, label: 'paste bare URL' },

    // 本地的链接卡要等 /api/link-preview 回来（实测 2 秒内落定）⇒ 多等一步再观测，
    // 否则会把'还在加载'的占位串当成卡片内容（首跑就踩到）。
    { op: 'wait', ms: 3000, label: 'wait for link preview' },
  ],

  observe: ['dom', 'text', 'blocks', 'kinds'],
  observeTexts: ['AAA', 'BBB', 'https://example.com'],
  stateSelectors: ['editorBody'],

  expect: [
    // selfCheck 只放两侧共有的量：两段文本都得进正文
    { facet: 'text:AAA', op: 'count', value: 1, at: 1 },
    { facet: 'text:BBB', op: 'count', value: 1, at: 1 },
    // 两侧都不保留原始 URL 文本（官方显示抓回来的标题、本地显示站点名＋标题）
    // ⇒ 不能断言 URL 文本在场（首跑两侧都 FAIL，那是断言写错不是行为差异）。
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
