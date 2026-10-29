/**
 * spec: editor.key.toggle-all-repeat
 *
 * 主交互：**造"折叠块＋子块"后连按四次 `Ctrl-Alt-T`**，只看子块计数与 `data-open` 的序列。
 *
 * 为什么这一族要采：`G1593` 两轮读数分叉——`wave1-77` 是 `1→0→1→0→1`（交替），
 * `wave1-84` 是 `1→0→1→1→1`（只变一次）。但两轮里第 10 步都**点了块左▶三角**，
 * 所以"分叉"可能来自"点三角之后焦点变了"，而不是键本身不稳定。本 spec **不点三角**，
 * 只连按四次键，把变量收干净。
 *
 * 判据：`CHILD1` 的文本计数序列（子块在不在屏上）。
 */
export default {
  id: 'editor.key.toggle-all-repeat',
  wave: 1,
  surface: 'editor.key.toggle',
  target: 'both',
  builtFrom: [
    'keyboard.md:51（TOGGLE_TOGGLES = Ctrl-Alt-T）',
    'gap.md G1593（两轮分叉：交替 vs 只变一次；两轮都点了▶三角）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    toggleish: { official: '[data-testid="editor-body"] [aria-expanded], [data-testid="editor-body"] [class*="toggle"]', local: '.ProseMirror [data-open], .ProseMirror .toggle-summary' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.toggle-all-repeat', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.toggle-all-repeat', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'HEAD1', settleMs: 700, label: 'type HEAD1' },
    { op: 'typeKeys', text: '/', settleMs: 900, label: 'slash menu' },
    { op: 'clickText', text: '列表', settleMs: 1000, label: 'open 列表 submenu', targets: ['official'] },
    { op: 'typeKeys', text: 'toggle', settleMs: 900, label: 'filter toggle', targets: ['local'] },
    { op: 'clickText', text: '折叠列表', settleMs: 1300, label: 'pick 折叠列表' },
    { op: 'key', chord: 'Enter', settleMs: 800, label: 'Enter (sibling)' },
    { op: 'type', text: 'CHILD1', settleMs: 800, label: 'type CHILD1' },
    { op: 'key', chord: 'Tab', settleMs: 900, label: 'Tab (indent → child)' },
    { op: 'clickXY', x: 481, y: 185, settleMs: 1000, label: 'click fold block body (select it)', targets: ['official'] },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1300, label: 'Ctrl-Alt-T #1' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1300, label: 'Ctrl-Alt-T #2' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1300, label: 'Ctrl-Alt-T #3' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1300, label: 'Ctrl-Alt-T #4' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['HEAD1', 'CHILD1'],
  attrProbes: [{ key: 'toggle', selector: 'toggleish', attrs: ['data-open', 'aria-expanded'] }],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop', 'toggleish'],

  expect: [
    { facet: 'text:HEAD1', op: 'gt', value: 0, at: 1 },
    { facet: 'text:CHILD1', op: 'gt', value: 0, at: 7 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
