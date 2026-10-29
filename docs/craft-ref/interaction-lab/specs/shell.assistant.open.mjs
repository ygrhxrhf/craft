/**
 * spec: shell.assistant.open
 *
 * 主交互：**`Ctrl-Enter`（表 C `TOGGLE_ASSISTANT` = ⌘⏎「AI 助手」）**。
 *
 * 为什么这一族要采：`keyboard.md:101` 只记了绑定，从未在屏幕上按过；本地 `keymap.ts` 有这条 id，
 * 但 `shell-shortcuts.tsx` 的 `HANDLED` 集合里**没有** `TOGGLE_ASSISTANT`
 * （注释写明"只列本地有落点的弦"）⇒ 预测本地零反应，官方的承载面形状**完全未知**。
 *
 * 判据：
 *  ① 两侧正文都在（`HELLO` 在场，进 selfCheck）；
 *  ② 按键后**承载面**：官方若开助手面板，文本名册／弹层计数会露馅；本地按代码应零反应。
 * ⇒ 差异由 differ 判；本 spec 也是**发现型**（先用名册定位面板，再把选择器补进 stateSelectors）。
 */
export default {
  id: 'shell.assistant.open',
  wave: 1,
  surface: 'shell.assistant',
  target: 'both',
  builtFrom: [
    'keyboard.md:101（TOGGLE_ASSISTANT = ⌘⏎ / Ctrl-⏎）',
    'src/lib/editor/keymap.ts（TOGGLE_ASSISTANT 在键位表里）',
    'src/components/editor/shell-shortcuts.tsx:20-25（HANDLED 集合不含 TOGGLE_ASSISTANT）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.assistant.open', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-shell.assistant.open', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'HELLO', settleMs: 800, label: 'type HELLO' },
    { op: 'key', chord: 'Control+Enter', settleMs: 1600, label: 'Ctrl-Enter (TOGGLE_ASSISTANT)' },
    { op: 'key', chord: 'Escape', settleMs: 900, label: 'Escape (close)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['HELLO', '助手', 'AI', '询问'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:HELLO', op: 'gt', value: 0, at: 1 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
    { facet: 'focusInEditor', reason: '第 3 步的焦点差异来自 Escape 的「退一层」（官方把焦点送到 body），已由 G1583 单独承载；本 spec 只判 Ctrl-Enter 有没有承载面', ref: 'gap.md G1583' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
