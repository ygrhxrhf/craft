/**
 * spec: editor.reminder.popover-options
 *
 * 主交互：**任务块的「提醒我…」弹层里到底有哪些选项**（`interactions.md` V38 一族一直挂着
 * "提醒我… 点开后的偏移量选项集"、"`重复…` 进入下一级后的实际排布"两条未采）。
 *
 * 做法：造任务块 → 用块三点菜单（`⋯`）打开 → 点「提醒我…」→ 读弹层内所有可选项文本。
 *  ★ 若三步菜单打不开，退化为"键盘 `Ctrl-Shift-M` 同族"不适用，本 spec 记为**前置未建立**。
 *
 * 判据：弹层内**选项文本集合**（两侧各自的文案），差异交给 differ。
 */
export default {
  id: 'editor.reminder.popover-options',
  wave: 1,
  surface: 'editor.task-reminder',
  target: 'both',
  builtFrom: [
    'interactions.md V38（提醒弹层的偏移量选项集未采）',
    'keyboard.md:127（REMIND_IN_ONE_HOUR）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.reminder.popover-options', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.reminder.popover-options', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'REMTASK', settleMs: 700, label: 'type REMTASK' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 1000, label: 'Ctrl-Shift-6 (task block)' },
    { op: 'typeKeys', text: '/', settleMs: 900, label: 'slash menu' },
    { op: 'clickText', text: '提醒我…', settleMs: 1400, label: 'pick 提醒我…', targets: ['official'] },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['REMTASK', '提醒我…', '计划任务', '设定截止日期', '日期和时间'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:REMTASK', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
