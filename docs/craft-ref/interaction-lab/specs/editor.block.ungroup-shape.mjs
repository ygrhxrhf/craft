/**
 * spec: editor.block.ungroup-shape
 *
 * 主交互：**`Ctrl-G` 成组之后按 `Ctrl-Shift-G`（取消组合），看它还原成什么**。
 *
 * 为什么这一族要采：`G1588` 里 `Ctrl-Shift-G` 是在**没有扩选**的条件下试的，块名册出现过
 * `["ALPHA BETA","BETA"]` 这种怪形状，当时只能写"再改结构"、不敢断言还原。第 360 批已经证明
 * `Ctrl-G` **必须先 `Shift-↑` 扩选**才生效 ⇒ 本 spec 用**成对**的序列：
 * `Escape` → `Shift-↑` → `Ctrl-G`（成组）→ `Ctrl-Shift-G`（取消组），每步读名册与块 HTML。
 *
 * 判据：
 *  ① 组前 `["ALPHA","BETA"]`；
 *  ② 成组后 `["ALPHA BETA"]`（`G1588`／第 360 批已证）；
 *  ③ **取消组后是否回到两块**（`["ALPHA","BETA"]`）——这才是"组/取消组成对"的正证。
 */
export default {
  id: 'editor.block.ungroup-shape',
  wave: 1,
  surface: 'editor.block-selection',
  target: 'both',
  builtFrom: [
    'gap.md G1588（`Ctrl-Shift-G` 在无扩选下读数怪：`["ALPHA BETA","BETA"]`）',
    'gap.md G1593 批（`Ctrl-G` 需 `Shift-↑` 扩选前置）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.ungroup-shape', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.ungroup-shape', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Enter', settleMs: 600, label: 'Enter (block 2)' },
    { op: 'type', text: 'BETA', settleMs: 800, label: 'type BETA' },
    { op: 'key', chord: 'Escape', settleMs: 1200, label: 'Escape (block-select)' },
    { op: 'key', chord: 'Shift+ArrowUp', settleMs: 800, label: 'Shift-↑ (extend)' },
    { op: 'key', chord: 'Control+g', settleMs: 1400, label: 'Ctrl-G (GROUP)' },
    { op: 'key', chord: 'Control+Shift+g', settleMs: 1400, label: 'Ctrl-Shift-G (UNGROUP)' },
    { op: 'key', chord: 'Shift+ArrowUp', settleMs: 800, label: 'Shift-↑ (select again)' },
    { op: 'key', chord: 'Control+Shift+g', settleMs: 1400, label: 'Ctrl-Shift-G #2 (UNGROUP again)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'html'],
  observeTexts: ['ALPHA', 'BETA'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],
  htmlProbes: [{ key: 'block', selector: 'blockRoot' }],
  htmlLimit: 500,

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
