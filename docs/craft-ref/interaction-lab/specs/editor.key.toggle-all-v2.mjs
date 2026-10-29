/**
 * spec: editor.key.toggle-all-v2
 *
 * 主交互：**先造"带子项的列表"，再把父项转成折叠块，然后按 `Ctrl-Alt-T`**。
 *
 * 为什么要 v2：`editor.key.toggle-all` 造出的折叠块**没有子项**，折叠/展开本来就看不到任何变化
 * ⇒ 无论 `Ctrl-Alt-T` 有没有绑定，读数都是"没变化"（`G1590`／H 行的困境）。本 spec 换一条路线：
 * 用**列表**先造出"父项 ＋ 缩进子项"，再对父项用 `Ctrl-Shift-7`（`TOGGLE_LIST`）转折叠块
 * ——这样折叠态一收，子项文本就该从名册里消失。
 *
 * 判据：`CHILD1` 的文本计数。
 *  ① 造好父子两项后 `CHILD1` 应为 1；
 *  ② `Ctrl-Alt-T` 第一次 ⇒ 若是"全部折叠"，`CHILD1` 应掉到 0；
 *  ③ 第二次 ⇒ 回到 1。
 */
export default {
  id: 'editor.key.toggle-all-v2',
  wave: 1,
  surface: 'editor.key.toggle',
  target: 'both',
  builtFrom: [
    'keyboard.md:51（TOGGLE_TOGGLES = Ctrl-Alt-T）／:34（TOGGLE_LIST = Ctrl-Shift-7）',
    'gap.md G1590（折叠块能造出但没有子项，折叠态无可观测对象）',
    'specs/editor.key.toggle-all.mjs（v1：无子项的折叠块）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.toggle-all-v2', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.toggle-all-v2', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'HEAD1', settleMs: 700, label: 'type HEAD1' },
    { op: 'key', chord: 'Control+Shift+6', settleMs: 900, label: 'Ctrl-Shift-6 (TODO_LIST)' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter (item 2)' },
    { op: 'key', chord: 'Tab', settleMs: 700, label: 'Tab (indent → child)' },
    { op: 'type', text: 'CHILD1', settleMs: 800, label: 'type CHILD1' },
    { op: 'key', chord: 'ArrowUp', settleMs: 400, label: 'ArrowUp (back to parent)' },
    { op: 'key', chord: 'ArrowUp', settleMs: 400, label: 'ArrowUp again' },
    { op: 'key', chord: 'Control+Shift+7', settleMs: 1000, label: 'Ctrl-Shift-7 (TOGGLE_LIST on parent)' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #1' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1200, label: 'Ctrl-Alt-T #2' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds'],
  observeTexts: ['HEAD1', 'CHILD1'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop', 'toggleish'],

  expect: [
    { facet: 'text:HEAD1', op: 'gt', value: 0, at: 1 },
    { facet: 'text:CHILD1', op: 'gt', value: 0, at: 5 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
