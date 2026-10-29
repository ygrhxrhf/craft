/**
 * spec: editor.block.selection-mode
 *
 * 主交互：**先按 `Escape` 退出文本编辑态（官方会把焦点送到 `body`，且 `body` 的 class 里出现
 * `block-select`），再在"块选择态"里按 `Shift-↑` 扩选、按 `Ctrl-G` 试组合**。
 *
 * 为什么这一族要采：第 323／325 批两次都看到官方 `Escape` 之后 `body` 带 **`block-select`** 类，
 * 而 `G1579`（`Ctrl-G` 走查找）与表 E 的七条键**都卡在"拿不到块/行选择态"**上。
 * 如果 `Escape` 就是进选择态的那一步，这两处前置就有救 ⇒ 本 spec 先把"进没进选择态"采清楚。
 *
 * 判据（只用两侧共有的量）：
 *  ① 两块文本都在（`ALPHA`／`BETA`）——进 selfCheck；
 *  ② `Escape` 后 `focus.cls` 是否出现 `block-select`（官方已知有、本地未知）；
 *  ③ `Shift-↑` 之后块数/选区形态、`Ctrl-G` 之后块数是否变化（成组会改结构）。
 * ⇒ 差异由 differ 判；本 spec 不预设"应该变成什么样"。
 */
export default {
  id: 'editor.block.selection-mode',
  wave: 1,
  surface: 'editor.block-selection',
  target: 'both',
  builtFrom: [
    '第 323／325 批：官方 `Escape` 后 `document.activeElement` 是 `body.nodrag.noshift.nocmd.block-select`',
    'gap.md G1579（Ctrl-G 在文本选中态走查找，块选择态未建立）',
    'gap.md G1577（表 E 整族：缺"行/列选择态"前置）',
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
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.selection-mode', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.selection-mode', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Escape', settleMs: 1200, label: 'Escape (text → block select?)' },
    { op: 'key', chord: 'Shift+ArrowUp', settleMs: 800, label: 'Shift-↑ (extend block selection)' },
    { op: 'key', chord: 'Control+g', settleMs: 1200, label: 'Ctrl-G in block-select (GROUP?)' },
    { op: 'key', chord: 'Alt+ArrowDown', settleMs: 1000, label: 'Alt-↓ in block-select (move?)' },
    { op: 'key', chord: 'Control+Shift+g', settleMs: 1200, label: 'Ctrl-Shift-G (UNGROUP · restore?)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'selection'],
  observeTexts: ['ALPHA', 'BETA'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'blocks', op: 'equals', value: ['ALPHA', 'BETA'], at: 3 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
