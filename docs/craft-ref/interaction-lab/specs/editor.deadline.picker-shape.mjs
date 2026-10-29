/**
 * spec: editor.deadline.picker-shape
 *
 * 主交互：**任务块块菜单里的「设定截止日期」弹层，是否与提醒的「自定义…」日历同构**。
 *
 * 为什么这一族要采：`interactions.md` V38 一直挂着并列的一条——"旗子图标（deadline）弹层
 * 是否与日历弹层同构"。第 376 批已把「自定义…」的日历逐项采清楚（`十月`/周一开头表头/
 * 跨月补齐/`时间 18:00`/`取消`+`应用`），本 spec 就按**同一套观测**去看 deadline 那条。
 *
 * 判据：弹层内的**文本名册**（月份标题、星期表头、`时间`、按钮）——与提醒日历逐项对照。
 */
export default {
  id: 'editor.deadline.picker-shape',
  wave: 1,
  surface: 'editor.task-reminder',
  target: 'both',
  builtFrom: [
    'interactions.md V38（边界：deadline 弹层是否与日历弹层同构）',
    '第 376 批：提醒「自定义…」日历的逐项读数',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.deadline.picker-shape', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.deadline.picker-shape', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: 'DLTASK', settleMs: 700, label: 'type DLTASK' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 1000, label: 'Ctrl-Shift-6 (task block)' },
    { op: 'typeKeys', text: '/', settleMs: 1000, label: 'slash menu' },
    { op: 'clickText', text: '设定截止日期', settleMs: 1600, label: 'pick 设定截止日期 (deadline)', targets: ['official'] },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: [
    'DLTASK', '十月', '时间', '取消', '应用', '确定', '截止',
    '一', '二', '三', '四', '五', '六', '日',
  ],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:DLTASK', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
