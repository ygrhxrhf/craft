/**
 * spec: shell.shortcuts-panel.key
 *
 * 主交互：**`Ctrl-Shift-,`（`TOGGLE_KEY_SHORTCUTS` = 查看所有快捷键）在编辑器里按一次**。
 *
 * 为什么这一族要采：`keyboard.md:316` 明写这条**只在"所有文档"浏览屏试过一次**（零增量），
 * **编辑器语境从未按**（第 345 批审计里"仍真"的一条）。而两侧的已知事实是岔开的：
 *  - 官方：面板**存在**（第 81 批经**帮助菜单点击**把七类逐类采过），但**键盘通路**在浏览屏无效；
 *  - 本地：`shell-shortcuts.tsx` 的 `HANDLED` 里**有** `TOGGLE_KEY_SHORTCUTS`（真接线）。
 * ⇒ 这一按就能判"同键两侧是否同一行为"。
 *
 * 判据：按键后**承载面**（`role="dialog"`／`popup-backdrop`）＋文本名册里有没有「快捷键/搜索快捷键」。
 */
export default {
  id: 'shell.shortcuts-panel.key',
  wave: 1,
  surface: 'shell.shortcuts-panel',
  target: 'both',
  builtFrom: [
    'keyboard.md:96（TOGGLE_KEY_SHORTCUTS = Ctrl-Shift-,）',
    'keyboard.md:316（只在浏览屏试过、编辑器语境未按；第 345 批审计列为仍真）',
    'src/components/editor/shell-shortcuts.tsx:20-25（本地 HANDLED 含 TOGGLE_KEY_SHORTCUTS）',
    'interactions.md §十一（官方面板可经帮助菜单点击通路唤出）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.shortcuts-panel.key', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-shell.shortcuts-panel.key', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'SHORT', settleMs: 700, label: 'type SHORT' },
    { op: 'key', chord: 'Control+Shift+Comma', settleMs: 1600, label: 'Ctrl-Shift-, (TOGGLE_KEY_SHORTCUTS)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks'],
  observeTexts: ['SHORT', '快捷键', '搜索快捷键', '查看所有快捷键'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:SHORT', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { prefix: 'focusInEditor', reason: 'Escape 的焦点差异已由 G1583 承载；本 spec 只判面板有没有开', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
