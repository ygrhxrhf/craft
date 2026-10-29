/**
 * spec: shell.sidebar-toggle.repro
 *
 * 主交互：**`Ctrl-\`（表 C `TOGGLE_LEFT_SIDEBAR`）连按四次**，每步留 3s 给动画。
 *
 * 为什么要复测：第 328 批（`shell.toggles.family`）里官方第一次按 `domLength` −506，
 * **第二次按没有回到基线**（122530 → 122530），而本地是来回切换。当时 settle 只有 1.2s，
 * 不足以排除"动画还没走完"⇒ 本 spec 把 settle 加到 3s、连按四次，看**奇偶步**是否交替。
 *
 * 判据（只用两侧共有的量）：
 *  ① 侧栏里的固定词（`任务`）在每步都在场 —— 进 selfCheck；
 *  ② 奇偶步的 `domLength`／正文长度形态由 differ 比（绝对量只记录，不比大小）。
 */
export default {
  id: 'shell.sidebar-toggle.repro',
  wave: 1,
  surface: 'shell.toggles',
  target: 'both',
  builtFrom: [
    'keyboard.md:94（TOGGLE_LEFT_SIDEBAR = Ctrl-\\）',
    '第 328 批读数：官方第二次按 domLength 没回基线（settle 仅 1.2s，存疑）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-shell.sidebar-toggle.repro', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-shell.sidebar-toggle.repro', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'key', chord: 'Control+Backslash', settleMs: 3000, label: 'Ctrl-\\ #1' },
    { op: 'key', chord: 'Control+Backslash', settleMs: 3000, label: 'Ctrl-\\ #2' },
    { op: 'key', chord: 'Control+Backslash', settleMs: 3000, label: 'Ctrl-\\ #3' },
    { op: 'key', chord: 'Control+Backslash', settleMs: 3000, label: 'Ctrl-\\ #4' },
  ],

  observe: ['dom', 'text', 'state'],
  observeTexts: ['任务', '新建文档'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:任务', op: 'gt', value: 0, at: 1 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
