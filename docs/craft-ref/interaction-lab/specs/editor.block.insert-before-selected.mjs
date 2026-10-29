/**
 * spec: editor.block.insert-before-selected
 *
 * 主交互：**块选择态下按 `Shift-Space`（`INSERT_BEFORE` = 在上方插入新区块）**。
 *
 * 为什么这一族要采：`G1591` 记了"官方在块选择态下 `Space` 把块数 2→3（`INSERT_AFTER` 生效）"，
 * 同时留下边界：**同序列里 `Shift-Space` 没有再插一块**，写着"不写成官方没有 `INSERT_BEFORE`"。
 * 第 360 批又发现"`Ctrl-G` 要 `Shift-↑` 扩选才生效"⇒ 本 spec 用**同样的扩选前置**单独测
 * `Shift-Space`，看它是不是也需要扩选。
 *
 * 判据：块名册（每一步都读）。
 *  ① `ALPHA`／`BETA` 两块；
 *  ② `Escape` 进块选择态；
 *  ③ `Shift-↑` 扩选；
 *  ④ **`Shift-Space`** ⇒ 名册是否多出一个空块、且新块在**上方**（`["", "ALPHA", "BETA"]` 形态）。
 */
export default {
  id: 'editor.block.insert-before-selected',
  wave: 1,
  surface: 'editor.block-insert',
  target: 'both',
  builtFrom: [
    'keyboard.md:61（INSERT_BEFORE = Shift space）',
    'gap.md G1591（块选择态下 Space 插块；Shift-Space 未再插，边界记"不写成官方没有"）',
    'gap.md G1588（块选择态 + `Shift-↑` 扩选是 `Ctrl-G` 的前置，第 360 批）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.insert-before-selected', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.insert-before-selected', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Escape', settleMs: 1200, label: 'Escape (block-select)' },
    { op: 'key', chord: 'Shift+ArrowUp', settleMs: 800, label: 'Shift-↑ (extend selection)' },
    { op: 'key', chord: 'Shift+Space', settleMs: 1200, label: 'Shift-Space (INSERT_BEFORE)' },
    { op: 'key', chord: 'Space', settleMs: 1200, label: 'Space (INSERT_AFTER, control)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'html'],
  observeTexts: ['ALPHA', 'BETA'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],
  htmlProbes: [{ key: 'block', selector: 'blockRoot' }],
  htmlLimit: 600,

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
