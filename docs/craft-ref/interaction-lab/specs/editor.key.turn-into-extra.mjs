/**
 * spec: editor.key.turn-into-extra
 *
 * 主交互：**表 A 里剩下没上过屏的六条样式键** —— `Ctrl-Shift-4`（`STRONG` 强调）／
 * `Ctrl-Shift-P`（`PAGE` 页面）／`Ctrl-Shift-L`（`CARD` 卡片）／`Ctrl-Alt-T`（`TOGGLE_TOGGLES`）／
 * `Ctrl-Shift-\`（`FOCUS_DECOR` 聚焦装饰）／`Ctrl-Shift-'`（`BLOCK_DECOR` 区块装饰）。
 *
 * 为什么这一族要采：`editor.key.turn-into-style` 只按了 `1/2/3/5` 四档；剩下六条从没上屏。
 * 其中 **`PAGE`／`CARD` 两条最值得采**：`gap.md G1408` 判过"页中页在本会话不可达"，
 * 而这两条正是**直接的键位通路**——若它们也不生效，G1408 就多一条封死证据；若生效，则 G1408 要改判。
 *
 * 判据：每按一条就回 `Ctrl-Shift-5`（`BODY`）复位，看**同一块**的 `kinds`／`computed`／承载面变化。
 *  ① 复位后的基线必须是 body（否则后一条的读数会被前一条污染）；
 *  ② 六条键各自单独观察，差异交给 differ。
 *
 * ★ 观测面用 `kinds` ＋ `computed`（字号/字重/背景）＋ `state`（PAGE／CARD 若开面板会露馅）。
 */
export default {
  id: 'editor.key.turn-into-extra',
  wave: 1,
  surface: 'editor.key.turn-into',
  target: 'both',
  builtFrom: [
    'keyboard.md:29（STRONG=Ctrl-Shift-4）／:31（PAGE=Ctrl-Shift-P）／:32（CARD=Ctrl-Shift-L）',
    'keyboard.md:47（FOCUS_DECOR=Ctrl-Shift-\\）／:48（BLOCK_DECOR=Ctrl-Shift-\'）／:51（TOGGLE_TOGGLES=Ctrl-Alt-T）',
    'gap.md G1408（页中页判死：三条通路已封，键位通路未测）',
    'specs/editor.key.turn-into-style.mjs（同族已采 1/2/3/5）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    blockLeaf: { official: '[id^="blockrowwrap-"]:not([data-testid]) [data-slate-node="text"]', local: '.ProseMirror > p, .ProseMirror > h1, .ProseMirror > h2, .ProseMirror > h3' },
    dialog: { official: '[role="dialog"]', local: '[role="dialog"]' },
    popupBackdrop: { official: '[data-testid="popup-backdrop"]', local: '[data-testid="popup-backdrop"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.turn-into-extra', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.turn-into-extra', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'ALPHA', settleMs: 700, label: 'type ALPHA' },
    { op: 'key', chord: 'Control+Shift+Digit4', settleMs: 900, label: 'Ctrl-Shift-4 (STRONG)' },
    { op: 'key', chord: 'Control+Shift+Digit5', settleMs: 700, label: 'Ctrl-Shift-5 (BODY reset)' },
    { op: 'key', chord: 'Control+Shift+p', settleMs: 1200, label: 'Ctrl-Shift-P (PAGE)' },
    { op: 'key', chord: 'Control+Shift+Digit5', settleMs: 700, label: 'Ctrl-Shift-5 (BODY reset)' },
    { op: 'key', chord: 'Control+Alt+t', settleMs: 1000, label: 'Ctrl-Alt-T (TOGGLE_TOGGLES)' },
    { op: 'key', chord: 'Control+Shift+Backslash', settleMs: 900, label: 'Ctrl-Shift-\\ (FOCUS_DECOR)' },
    { op: 'key', chord: 'Control+Shift+Quote', settleMs: 900, label: "Ctrl-Shift-' (BLOCK_DECOR)" },
    { op: 'key', chord: 'Control+Shift+l', settleMs: 1400, label: 'Ctrl-Shift-L (CARD · last: opens a surface)' },
  ],

  observe: ['dom', 'text', 'state', 'blocks', 'kinds', 'computed'],
  observeTexts: ['ALPHA', '卡片', '页面', '模板'],
  computedProbes: [{ key: 'block', selector: 'blockLeaf' }],
  computedProps: ['fontSize', 'fontWeight', 'backgroundColor'],
  stateSelectors: ['editorBody', 'dialog', 'popupBackdrop'],

  expect: [
    { facet: 'text:ALPHA', op: 'gt', value: 0, at: 1 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 10 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
    { facet: 'removed-only-official', reason: '官方侧栏目录区的空态提示随面板重绘出现或消失；已由 G1556 一族承载', ref: 'src/lib/editor/official-copy.ts:8' },
    { facet: 'added-only-official', reason: '官方侧栏的文档计数随列表重绘出现；是外壳计数不是编辑器内容', ref: '逐 spec 声明（observe.mjs NOISE_RULES 未覆盖）' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
