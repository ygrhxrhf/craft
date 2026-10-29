/**
 * spec: editor.key.toggle-all-v3
 *
 * 主交互：**造折叠块 → 加子块 → 缩进 → `Ctrl-Alt-T` → 点三角 → 再 `Ctrl-Alt-T`**，每步**存一张图**。
 *
 * 为什么要有 v3：v1/v2 都"读不出折叠态"——第 351 批终于把官方截图拿到了（`Page.bringToFront` 能解开
 * "窗口最小化不能截图"），图上看到官方折叠块的标志是**块左侧一个 ▶ 三角**（不是 `aria-expanded`、
 * 也不是 `class*=toggle`）。⇒ 本 spec 用 `saveScreenshots` 逐帧落盘，人眼读"子块在不在"。
 *
 * 判据：`CHILD1` 的文本计数 ＋ 截图。本 spec 是**发现型**，不预设折叠成不成功。
 */
export default {
  id: 'editor.key.toggle-all-v3',
  wave: 1,
  surface: 'editor.key.toggle',
  target: 'both',
  saveScreenshots: true,
  builtFrom: [
    'keyboard.md:51（TOGGLE_TOGGLES = Ctrl-Alt-T）',
    '第 351 批截图：官方折叠块＝块左侧 ▶ 三角（无 aria/class 标记）',
    'gap.md G1590（折叠块无子项时折叠态不可观测）',
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
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.toggle-all-v3', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.toggle-all-v3', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'HEAD1', settleMs: 700, label: 'type HEAD1' },
    { op: 'typeKeys', text: '/', settleMs: 900, label: 'slash menu' },
    { op: 'clickText', text: '列表', settleMs: 1000, label: 'open 列表 submenu', targets: ['official'] },
    { op: 'typeKeys', text: 'toggle', settleMs: 900, label: 'filter toggle', targets: ['local'] },
    { op: 'clickText', text: '折叠列表', settleMs: 1300, label: 'pick 折叠列表' },
    { op: 'key', chord: 'Enter', settleMs: 800, label: 'Enter (sibling block)' },
    { op: 'type', text: 'CHILD1', settleMs: 800, label: 'type CHILD1' },
    { op: 'key', chord: 'Tab', settleMs: 900, label: 'Tab (indent → child)' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #1' },
    { op: 'clickXY', x: 481, y: 185, settleMs: 1200, label: 'click chevron (official coords)', targets: ['official'] },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #2' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #3' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #4' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'screenshot'],
  observeTexts: ['HEAD1', 'CHILD1'],
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
