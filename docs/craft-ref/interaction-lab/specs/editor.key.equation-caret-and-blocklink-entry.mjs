/**
 * spec: editor.key.blocklink-and-equation-entry
 *
 * 主交互：补两条一直挂着的边界——
 *  ① **官方「区块链接」在 web 端的入口**（`G1580` 只记了"多块/单词两种选区按 `Ctrl-Shift-K` 零反应"）；
 *  ② **方程在"光标态"（不选中）按 `Ctrl-Shift-E` 是否也开输入框**（`G1581` 只测了"选中后按"）。
 *
 * 做法：一块文本 → 光标态按 `Ctrl-Shift-E`（看焦点是否进 input）→ Escape →
 *       再按 `[[`（Craft 常见的块链接触发符）看有没有候选面板。
 *
 * 判据：`focus.tag`（是否 `input`）＋ 承载面（`dialog`／`popup-backdrop`）＋ 文本名册。
 */
export default {
  id: 'editor.key.equation-caret-and-blocklink-entry',
  wave: 1,
  surface: 'editor.key.equation',
  target: 'both',
  builtFrom: [
    'gap.md G1581（只测"选中后按 Ctrl-Shift-E"；光标态未证）',
    'gap.md G1580（区块链接：两种选区零反应；官方是否有 web 入口未证）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.equation-caret-and-blocklink-entry', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.equation-caret-and-blocklink-entry', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'WORDX', settleMs: 800, label: 'type WORDX (caret at end, nothing selected)' },
    { op: 'key', chord: 'Control+Shift+e', settleMs: 1500, label: 'Ctrl-Shift-E at CARET (equation?)' },
    { op: 'typeKeys', text: '[[', settleMs: 1300, label: 'type [[ (block-link trigger?)' },
    { op: 'key', chord: 'Escape', settleMs: 700, label: 'Escape #2' },
    { op: 'key', chord: 'Escape', settleMs: 700, label: 'Escape #3' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'selection'],
  observeTexts: ['WORDX', '块', '链接'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:WORDX', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载', ref: 'gap.md G1583' },
    { prefix: 'selection:', reason: '选区落点差异已由 select-all 梯子承载', ref: 'specs/editor.selection.ctrl-a-ladder.mjs' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
