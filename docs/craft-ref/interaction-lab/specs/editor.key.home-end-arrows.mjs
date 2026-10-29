/**
 * spec: editor.key.home-end-arrows
 *
 * 主交互：**行内光标键的四条** —— `Home`／`End`／`ArrowLeft`／`ArrowRight`。
 *
 * 为什么这一族要采：`keyboard.md:830` 明写「`ArrowRight`／`Home`／`End` 屏上仍未测」，
 * 之后没有结论（第 345 批审计把它列为**仍真**的两条之一）。它们不是官方快捷键表里的"命令"，
 * 而是编辑器**默认文本导航**——正因如此更该对一次：官方是 Slate、本地是 ProseMirror，
 * 四个键的落点（尤其 `Home` 是"行首"还是"块首"）很容易分叉。
 *
 * 判据：`selection` 档的 `focusOffset`（两侧同口径）
 *  ① 打完 `ABCDEF` 后光标在 6；
 *  ② `Home` ⇒ 0；`End` ⇒ 6；
 *  ③ `Home` 后 `ArrowRight` ⇒ 1；`ArrowLeft` ⇒ 0。
 * ⇒ 逐帧读数，差异交给 differ。
 */
export default {
  id: 'editor.key.home-end-arrows',
  wave: 1,
  surface: 'editor.key.navigate',
  target: 'both',
  builtFrom: [
    'keyboard.md:830（ArrowRight／Home／End 屏上仍未测，第 345 批审计复核为仍真）',
    '本地 ProseMirror 默认 bindings；官方 Slate 默认 keydown 处理',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.home-end-arrows', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.home-end-arrows', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ABCDEF', settleMs: 700, label: 'type ABCDEF' },
    { op: 'key', chord: 'Home', settleMs: 500, label: 'Home' },
    { op: 'key', chord: 'End', settleMs: 500, label: 'End' },
    { op: 'key', chord: 'Home', settleMs: 500, label: 'Home again' },
    { op: 'key', chord: 'ArrowRight', settleMs: 500, label: 'ArrowRight' },
    { op: 'key', chord: 'ArrowLeft', settleMs: 500, label: 'ArrowLeft' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'selection'],
  observeTexts: ['ABCDEF'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'selection:focusOffset', op: 'equals', value: 6, at: 1 },
    { facet: 'selection:focusOffset', op: 'equals', value: 0, at: 2 },
    { facet: 'selection:focusOffset', op: 'equals', value: 6, at: 3 },
    { facet: 'selection:focusOffset', op: 'equals', value: 1, at: 5 },
    { facet: 'selection:focusOffset', op: 'equals', value: 0, at: 6 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
