/**
 * spec: editor.key.equation.commit
 *
 * 主交互：**方程输入框里键入内容并提交**（第 323 批 `G1581` 留的边界：只证了"焦点交给 input"，
 * **没读** placeholder／值，也**没验**提交后插入的节点种类）。
 *
 * 做法：官方 `Ctrl-A` 选中文本 → `Ctrl-Shift-E`（焦点进 `input.sc-…`）→ 键入 `x^2` → `Enter`。
 * 本地没有这条键（`G1581`），所以后续步骤只对官方跑（`steps.targets`）。
 *
 * 判据：
 *  ① 输入框有没有值（读 `document.activeElement.value`）；
 *  ② 提交后块里剩下什么（文本名册 + `inline` 的 marks/text）：是"替换成公式节点"还是"原文本还在"。
 */
export default {
  id: 'editor.key.equation.commit',
  wave: 1,
  surface: 'editor.key.equation',
  target: 'both',
  builtFrom: [
    'gap.md G1581（边界：未读 placeholder／值／提交后节点种类）',
    'keyboard.md:44（INLINE_TEX = ⌘⇧E / Ctrl-Shift-E）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.equation.commit', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.equation.commit', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'FORMULA', settleMs: 800, label: 'type FORMULA' },
    { op: 'key', chord: 'Control+a', settleMs: 700, label: 'Ctrl-A (select)' },
    { op: 'key', chord: 'Control+Shift+e', settleMs: 1500, label: 'Ctrl-Shift-E (equation input)' },
    { op: 'typeKeys', text: 'x^2', settleMs: 900, label: 'type x^2 into input', targets: ['official'] },
    { op: 'key', chord: 'Enter', settleMs: 1500, label: 'Enter (commit)', targets: ['official'] },
    { op: 'key', chord: 'Escape', settleMs: 800, label: 'Escape' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'inline'],
  observeTexts: ['FORMULA', 'x^2', 'x'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:FORMULA', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载', ref: 'gap.md G1583' },
    { prefix: 'selection:', reason: 'Ctrl-A 选区落点两侧不同，已由 select-all 梯子承载', ref: 'specs/editor.selection.ctrl-a-ladder.mjs' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
