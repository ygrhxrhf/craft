/**
 * spec: editor.key.insert-block-space-selected
 *
 * 主交互：**在"块选择态"里按 `Space`／`Shift-Space`**（表 B 的 `INSERT_AFTER`／`INSERT_BEFORE`）。
 *
 * 为什么这一族要采：第 325 批（`editor.key.insert-block-space`）在**文本编辑态**测过这两键，
 * 两侧都只是"打出一个空格"，当时写下的边界是「**可能要先有块选择**，本批没建立」。
 * 第 331 批（`G1588`）已经证明官方 `Escape` 能进块选择态（`body.block-select`）⇒ 这个前置现在有了，
 * 本 spec 就是**回去补那一句**（`interactions.md` V195 里唯一的"仍真且未入台账"项）。
 *
 * 判据：块名册／块数
 *  ① 文本编辑态两块 `ALPHA`／`BETA`（进 selfCheck）；
 *  ② `Escape` 后（官方＝块选择态、本地＝不动）再按 `Space`：名册是否多出空块；
 *  ③ 再按 `Shift-Space`：同理。
 * ⇒ 差异由 differ 判；本 spec 不预设"应该插块"。
 */
export default {
  id: 'editor.key.insert-block-space-selected',
  wave: 1,
  surface: 'editor.block-insert',
  target: 'both',
  builtFrom: [
    'keyboard.md:60-61（INSERT_AFTER = space／INSERT_BEFORE = Shift space）',
    'interactions.md V195（文本编辑态两侧都只是打空格；边界写"可能要先有块选择"）',
    'gap.md G1588（官方 Escape 进 block-select）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.insert-block-space-selected', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.insert-block-space-selected', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Escape', settleMs: 1200, label: 'Escape (→ block-select on official)' },
    { op: 'key', chord: 'Space', settleMs: 1000, label: 'Space in block-select (INSERT_AFTER?)' },
    { op: 'key', chord: 'Shift+Space', settleMs: 1000, label: 'Shift-Space in block-select (INSERT_BEFORE?)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['ALPHA', 'BETA'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'blocks', op: 'equals', value: ['ALPHA', 'BETA'], at: 3 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载；本 spec 只判两键是否插块', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
