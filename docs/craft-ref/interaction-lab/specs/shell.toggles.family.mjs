/**
 * spec: shell.toggles.family
 *
 * 主交互：**表 C 的三条外壳弦** —— `Ctrl-\`（`TOGGLE_LEFT_SIDEBAR` 收/展侧边栏）／
 * `Ctrl-.`（`TOGGLE_FOCUS_MODE` 专注模式）／`Ctrl-Alt-N`（`OPEN_DAILY_NOTE` 每日笔记）。
 *
 * 为什么这一族要采：`keyboard.md:94-102` 这三条从没上屏对拍过；本地 `shell-shortcuts.tsx`
 * 的 `HANDLED` 里三条**都在**（`TOGGLE_LEFT_SIDEBAR`／`TOGGLE_FOCUS_MODE`／`OPEN_DAILY_NOTE`）
 * ⇒ 这是少数"两侧都声称有"的外壳面，值得看**动作后的形状**是否一致。
 *
 * 判据：
 *  ① `Ctrl-\`：侧栏收起/展开 —— 用**文本名册**（侧栏里的固定词）与 `dom` 规模变化看；
 *  ② `Ctrl-.`：专注模式 —— 同样是名册/规模变化；
 *  ③ `Ctrl-Alt-N`：每日笔记 —— 大概率会**换页**（`location.href` 变化），放在最后一步。
 * ⇒ 差异由 differ 判；本 spec 不预置"应该变成什么样"。
 */
export default {
  id: 'shell.toggles.family',
  wave: 1,
  surface: 'shell.toggles',
  target: 'both',
  builtFrom: [
    'keyboard.md:94-96（TOGGLE_LEFT_SIDEBAR=Ctrl-\\／TOGGLE_FOCUS_MODE=Ctrl-.／TOGGLE_KEY_SHORTCUTS）',
    'keyboard.md:102（OPEN_DAILY_NOTE=Ctrl-Alt-N）',
    'src/components/editor/shell-shortcuts.tsx:20-25（本地 HANDLED 含侧边栏/专注/每日笔记）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.toggles.family', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-shell.toggles.family', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'SHELL', settleMs: 700, label: 'type SHELL' },
    { op: 'key', chord: 'Control+Backslash', settleMs: 1200, label: 'Ctrl-\\ (TOGGLE_LEFT_SIDEBAR)' },
    { op: 'key', chord: 'Control+Backslash', settleMs: 1200, label: 'Ctrl-\\ again (restore)' },
    { op: 'key', chord: 'Control+Period', settleMs: 1200, label: 'Ctrl-. (TOGGLE_FOCUS_MODE)' },
    { op: 'key', chord: 'Control+Period', settleMs: 1200, label: 'Ctrl-. again (restore)' },
    { op: 'key', chord: 'Control+Alt+n', settleMs: 2000, label: 'Ctrl-Alt-N (OPEN_DAILY_NOTE)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['SHELL', '每日笔记', '任务', '新建文档'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:SHELL', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
