/**
 * spec: shell.quick-open.ctrl-o
 *
 * 主交互：**`Ctrl-O`（`TOGGLE_QUICK_OPEN`）**——表 C 里唯一还没上屏的 id。
 *
 * 为什么这一族要采：`shell.quick-open.alt` 只覆盖 `Ctrl-P`／`Ctrl-Shift-O`，注释里写明
 * `Ctrl-K` 由别的 spec 管；**`Ctrl-O` 全 spec 目录 grep 零命中**（第 379 批审计确认为
 * 表 C 唯一真空）。官方面板自印 `快速开启 CtrlO 或者 CtrlP` ⇒ 预期两条等价。
 *
 * 判据：按键后是否弹出快速开启面板（`popup-backdrop`／`role=dialog`）＋文本名册。
 */
export default {
  id: 'shell.quick-open.ctrl-o',
  wave: 1,
  surface: 'shell.command-palette',
  target: 'both',
  builtFrom: [
    'keyboard.md:97（TOGGLE_QUICK_OPEN = ⌘O / Ctrl-O）',
    'keyboard.md §十一 面板：快速开启 CtrlO 或者 CtrlP',
    '第 379 批审计：Ctrl-O 零命中，表 C 唯一未上屏 id',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.quick-open.ctrl-o', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-shell.quick-open.ctrl-o', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: 'QO', settleMs: 700, label: 'type QO' },
    { op: 'key', chord: 'Control+o', settleMs: 1600, label: 'Ctrl-O (TOGGLE_QUICK_OPEN)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['QO', '文档', '在', '搜索文档与块', '操作'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:QO', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
