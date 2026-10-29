/**
 * spec: editor.key.url-link
 *
 * 主交互：**`Ctrl-K`（表 A `URL` 链接）** —— 干净的临时文档、只按这一条键。
 *
 * 为什么单独起一条：第 324 批的行内七键里，`Ctrl-K` 官方读数是 `highlight`（**存疑**，
 * 疑似捕获到了上一块的渲染）⇒ 那条读数被写进 `G1582` 的注里、**没有当结论**。本 spec 用
 * 「一个新文档 → 打一个词 → 选中它 → 只按 `Ctrl-K`」把这条补干净。
 *
 * 判据：
 *  ① 两侧正文都在（`ANCHOR` 在场，进 selfCheck）；
 *  ② 按键后的**承载面**：官方若开链接输入层，`popup-backdrop`／对话框／名册会露馅；
 *     本地按 `CommandPalette.tsx:37` 应弹**命令面板**（`G1580` 同根因）。
 */
export default {
  id: 'editor.key.url-link',
  wave: 1,
  surface: 'editor.key.url',
  target: 'both',
  builtFrom: [
    'keyboard.md:45（URL = ⌘K / Ctrl-K）',
    'gap.md G1582 的注：Ctrl-K 官方读数 highlight 存疑',
    'src/components/search/CommandPalette.tsx:37（本地 window 级 Ctrl-K 门控）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    blockLeaf: { official: '[id^="blockrowwrap-"]:not([data-testid]) [data-slate-node="text"]', local: '.ProseMirror > p' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.url-link', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.url-link', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ANCHOR', settleMs: 800, label: 'type ANCHOR' },
    { op: 'key', chord: 'Control+Shift+ArrowLeft', settleMs: 600, label: 'select word ANCHOR' },
    { op: 'key', chord: 'Control+k', settleMs: 1600, label: 'Ctrl-K (URL)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'inline'],
  observeTexts: ['ANCHOR', '链接', 'URL', '粘贴'],
  computedProbes: [{ key: 'block', selector: 'blockLeaf' }],
  computedProps: ['fontSize', 'fontWeight', 'backgroundColor', 'textDecorationLine'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:ANCHOR', op: 'gt', value: 0, at: 1 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 3 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { facet: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 单独承载；本 spec 只判 Ctrl-K 有没有承载面', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
