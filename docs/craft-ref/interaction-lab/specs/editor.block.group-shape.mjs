/**
 * spec: editor.block.group-shape
 *
 * 主交互：**块选择态下按 `Ctrl-G` 之后，块到底变成了什么形状**（组容器 vs 并成一块）。
 *
 * 为什么这一族要采：`G1588` 记了"Ctrl-G 让块名册从 `["ALPHA","BETA"]` 变成 `["ALPHA BETA"]`"，
 * 但当时写明边界：**块名册只证"结构变了"，不证是组容器还是并块**。本批用第 348 批新增的
 * `html` 档（`outerHTML` ＋ 子元素标签清单）直接看结构。
 *
 * 判据：
 *  ① 两块文本在场（进 selfCheck）；
 *  ② `Ctrl-G` 前后，**块 HTML 的子元素标签清单**与长度变化 —— 并块会把两个 `span` 合成一个，
 *     组容器则会在外面套一层新 `div`（子元素从 1 个变 2 个、或多出带 data 属性的包裹）。
 *  ★ 本 spec **不判"应该哪种"**，只把结构差异记下来由 differ 判。
 */
export default {
  id: 'editor.block.group-shape',
  wave: 1,
  surface: 'editor.block-selection',
  target: 'both',
  builtFrom: [
    'gap.md G1588（边界：块名册不证"组容器 vs 并块"）',
    'observe.mjs 的 captureHtml（第 348 批新增：outerHTML ＋ 子元素标签清单）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.group-shape', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.group-shape', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Escape', settleMs: 1200, label: 'Escape #1 (block-select on official)' },
    { op: 'key', chord: 'Shift+ArrowUp', settleMs: 800, label: 'Shift-↑ (extend block selection)' },
    { op: 'key', chord: 'Control+g', settleMs: 1400, label: 'Ctrl-G (GROUP)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'html'],
  observeTexts: ['ALPHA', 'BETA'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],
  htmlProbes: [{ key: 'block', selector: 'blockRoot' }],
  htmlLimit: 900,

  expect: [
    { facet: 'blocks', op: 'equals', value: ['ALPHA', 'BETA'], at: 3 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
