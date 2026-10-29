/**
 * spec: editor.block.outdent-in-list
 *
 * 主交互：**列表项的 `Shift-Tab`（减缩进）**。
 *
 * 为什么这一族要采：`WAVE1-REPORT` 里一直挂着"**② 减缩进未采**——本地缩进本身是缺口
 * （`G1545` 普通段落进不去、`G1546` 列表项只能进一级）"。`G1545/1546` 记的是**本地**缺口，
 * 但**官方侧 `Shift-Tab` 能不能把二级项退回一级**从没单独采过。
 *
 * 判据：块名册的**缩进量**（`indent` 档给出的每块缩进），
 *  ① 造 `A` 列表项 → `Enter` → `Tab`（进二级）→ `B`；
 *  ② `Shift-Tab` ⇒ `B` 的缩进应退回 0；官方有效、本地按 `G1546` 预期"只进不退"或部分可用。
 */
export default {
  id: 'editor.block.outdent-in-list',
  wave: 1,
  surface: 'editor.block-indent',
  target: 'both',
  builtFrom: [
    'keyboard.md:表 A（INDENT = Tab／DEINDENT = Shift-Tab）',
    'gap.md G1545／G1546（本地：普通段落进不去、列表项只能进一级）',
    'WAVE1-REPORT「★ 未采的一段：② 减缩进」',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.outdent-in-list', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.outdent-in-list', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'ITEMA', settleMs: 700, label: 'type ITEMA' },
    { op: 'key', chord: 'Control+Shift+8', settleMs: 900, label: 'Ctrl-Shift-8 (BULLET_LIST)' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter (item 2)' },
    { op: 'key', chord: 'Tab', settleMs: 800, label: 'Tab (indent → level 2)' },
    { op: 'type', text: 'ITEMB', settleMs: 800, label: 'type ITEMB' },
    { op: 'key', chord: 'Shift+Tab', settleMs: 900, label: 'Shift-Tab (DEINDENT)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'indent', 'kinds'],
  observeTexts: ['ITEMA', 'ITEMB'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'blocksCount', op: 'count', value: 2, at: 5 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
