/**
 * spec: editor.schedule.picker-shape
 *
 * 主交互：**任务块的「计划任务」面板形状**（第三条任务时间动作；前两条是提醒 `G1596`、截止 `G1597`）。
 *
 * 为什么这一族要采：`keyboard.md` 表 D 有 `SCHEDULE_FOR_TODAY`（安排到今天）与
 * `OPEN_SCHEDULE_DATEPICKER`（计划任务）；官方斜线菜单里也有「计划任务」项。
 * 本地三处（斜线／块菜单／keymap）**grep 都零命中** ⇒ 预测本地无入口，官方面板形状未知。
 *
 * 判据：面板内的**文本名册**（档位文案 + 按钮），与提醒/截止两面板逐项对照。
 */
export default {
  id: 'editor.schedule.picker-shape',
  wave: 1,
  surface: 'editor.task-reminder',
  target: 'both',
  builtFrom: [
    'keyboard.md 表 D（SCHEDULE_FOR_TODAY / OPEN_SCHEDULE_DATEPICKER）',
    'gap.md G1596／G1597（另两条时间动作的入口与面板）',
    '本地 grep：slash-commands／block-actions／keymap 均无 schedule',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.schedule.picker-shape', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.schedule.picker-shape', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500 },
  ],

  steps: [
    { op: 'type', text: 'SCHTASK', settleMs: 700, label: 'type SCHTASK' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 1000, label: 'Ctrl-Shift-6 (task block)' },
    { op: 'typeKeys', text: '/', settleMs: 1000, label: 'slash menu' },
    { op: 'clickText', text: '计划任务', settleMs: 1600, label: 'pick 计划任务 (schedule)', targets: ['official'] },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: [
    'SCHTASK', '十月', '时间', '取消', '应用', '确定', '安排', '今天', '明天', '下周',
    '将任务计划', '计划任务', '排期',
  ],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:SCHTASK', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
