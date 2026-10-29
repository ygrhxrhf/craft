/**
 * spec: shell.quick-open.alt
 *
 * 主交互：**表 C 的另外两条快速开启弦** —— `Ctrl-P`（`TOGGLE_QUICK_OPEN_ALT`）与
 * `Ctrl-Shift-O`（`TOGGLE_QUICK_OPEN_SAFARI`，官方只在 Safari 分支里印）。
 *
 * 为什么这一族要采：`shell.command-palette.toggle-vs-jump` 只按过 `Ctrl-K`；
 * `Ctrl-P`／`Ctrl-Shift-O` 从没上屏（`keyboard.md:98-100`）。本地 `HANDLED` 里也只有
 * `TOGGLE_QUICK_OPEN`（`Ctrl-K`）——另两条按代码应无动作，但"应按代码"不是证据。
 *
 * 判据：按键后**承载面**（`role="dialog"`／`popup-backdrop`）与文本名册。
 * 官方若同样开快速开启面板，两侧差异会落在"承载面文案"上；本地按代码应零反应。
 */
export default {
  id: 'shell.quick-open.alt',
  wave: 1,
  surface: 'shell.command-palette',
  target: 'both',
  builtFrom: [
    'keyboard.md:97-100（TOGGLE_QUICK_OPEN=⌘K／_ALT=⌘P／_SAFARI=⌘⇧O）',
    'src/components/editor/shell-shortcuts.tsx:20-25（本地 HANDLED 只含 TOGGLE_QUICK_OPEN）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.quick-open.alt', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-shell.quick-open.alt', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'QK', settleMs: 700, label: 'type QK' },
    { op: 'key', chord: 'Control+p', settleMs: 1500, label: 'Ctrl-P (QUICK_OPEN_ALT)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape 1' },
    { op: 'key', chord: 'Control+Shift+o', settleMs: 1500, label: 'Ctrl-Shift-O (QUICK_OPEN_SAFARI)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape 2' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['QK', '搜索文档与块', '操作', '快速'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:QK', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { facet: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 单独承载；本 spec 只判两条快速开启弦有没有承载面', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
