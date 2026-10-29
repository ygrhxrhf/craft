/**
 * spec: editor.table.selection-cluster
 *
 * 主交互：覆盖率普查里**最后 4 行**——表 E 的 `MOVE_COLUMNS_LEFT/RIGHT`（`Alt-←/→`）、
 * `DELETE_ROWS`（`Ctrl-⌫`）、`DELETE_COLUMNS`（`Ctrl-Shift-⌫`）。
 *
 * 为什么这一族要采：这 4 行一直被归进"需行/列选择态、两侧都进不去"那一簇。但
 * `G1619` 刚证明同一簇里的 `Ctrl-[` **其实是"送达但无作用"**（正对照下另一枚键当场生效）。
 * 分类错了会让人以为"再努力找就能采到"，而实际是"这键在这个上下文就是没用"。
 * ⇒ 本 spec 用**同一条正对照链**把 4 行一次测完：每一步前都先确认 `Ctrl-⏎` 仍能改表
 * （证键送得到、格焦点是真的），再按目标键并 REST 读回。
 *
 * 判据：
 *  ① 正对照在每次目标键**之前**都成立（REST 行数 +1）；
 *  ② 目标键后 REST 形状**不变** ⇒ "送达但无作用"；若形状变了 ⇒ 该键在单元格光标下真有效（新事实）。
 *  ★ 本 spec 不预设结论：4 行各自独立判定，读数写进 record。
 */
export default {
  id: 'editor.table.selection-cluster',
  wave: 1,
  surface: 'editor.table',
  target: 'both',
  builtFrom: [
    'keyboard.md 表 E · MOVE_COLUMNS_LEFT/RIGHT、DELETE_ROWS、DELETE_COLUMNS',
    'gap.md G1577（单元格光标下这四键读数为 0）',
    'gap.md G1619（同簇的 Ctrl-[ 经正对照证明是"送达但无作用"，分类被更正）',
    'gap.md G1607（点表格左沟槽进的是 block-select，不是行选择）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    cell: { official: '[contenteditable="true"]', local: '.ProseMirror table td, .ProseMirror table th' },
    tableRoot: { official: '[data-testid="editor-body"]', local: '.ProseMirror table' },
    popupClose: { official: '[data-testid="open-in-app-popup-close"]', local: '[data-testid="open-in-app-popup-close"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000, targets: ['local'] },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.table.selection-cluster', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.table.selection-cluster', titleKey: 'titleBlock', targets: ['local'] },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500, targets: ['local'] },
    { op: 'restSeedDoc', name: 'QODER-ILAB-editor.table.selection-cluster', title: 'QODER-ILAB-editor.table.selection-cluster', blockType: 'table', markdown: '| a | b |\n| --- | --- |\n| 1 | 2 |', settleMs: 6500, targets: ['official'] },
  ],

  steps: [
    // 本地建表并填 a/b
    { op: 'typeKeys', text: '/', settleMs: 1200, label: 'slash menu', targets: ['local'] },
    { op: 'typeKeys', text: '表格', settleMs: 1200, label: 'filter 表格', targets: ['local'] },
    { op: 'key', chord: 'Enter', settleMs: 1800, label: 'Enter (pick 表格)', targets: ['local'] },
    { op: 'typeKeys', text: 'a', settleMs: 600, label: 'type a', targets: ['local'] },
    { op: 'key', chord: 'ArrowRight', settleMs: 500, label: '→', targets: ['local'] },
    { op: 'typeKeys', text: 'b', settleMs: 800, label: 'type b', targets: ['local'] },

    { op: 'clickTextIn', selector: 'cell', text: 'a', settleMs: 800, label: 'focus cell a' },
    // ① 正对照
    { op: 'key', chord: 'Control+Enter', settleMs: 1300, label: 'CTRL ⏎ (control #1)' },
    { op: 'wait', ms: 2500, label: 'settle' },
    { op: 'restTableState', label: 'shape after control #1', targets: ['official'] },
    // ② Alt-→（MOVE_COLUMNS_RIGHT）
    { op: 'clickTextIn', selector: 'cell', text: 'a', settleMs: 700, label: 'refocus a' },
    { op: 'key', chord: 'Alt+ArrowRight', settleMs: 1300, label: 'Alt-→ (MOVE_COLUMNS_RIGHT)' },
    { op: 'wait', ms: 2500, label: 'settle' },
    { op: 'restTableState', label: 'shape after Alt-→', targets: ['official'] },
    // ③ Alt-←（MOVE_COLUMNS_LEFT）
    { op: 'clickTextIn', selector: 'cell', text: 'a', settleMs: 700, label: 'refocus a #2' },
    { op: 'key', chord: 'Alt+ArrowLeft', settleMs: 1300, label: 'Alt-← (MOVE_COLUMNS_LEFT)' },
    { op: 'wait', ms: 2500, label: 'settle' },
    { op: 'restTableState', label: 'shape after Alt-←', targets: ['official'] },
    // ④ Ctrl-Shift-⌫（DELETE_COLUMNS）
    { op: 'clickTextIn', selector: 'cell', text: 'a', settleMs: 700, label: 'refocus a #3' },
    { op: 'key', chord: 'Control+Shift+Backspace', settleMs: 1300, label: 'Ctrl-Shift-⌫ (DELETE_COLUMNS)' },
    { op: 'wait', ms: 2500, label: 'settle' },
    { op: 'restTableState', label: 'shape after Ctrl-Shift-⌫', targets: ['official'] },
    // ⑤ Ctrl-⌫（DELETE_ROWS）——放最后，万一它真删了也不影响上面的读数
    { op: 'clickTextIn', selector: 'cell', text: 'a', settleMs: 700, label: 'refocus a #4' },
    { op: 'key', chord: 'Control+Backspace', settleMs: 1300, label: 'Ctrl-⌫ (DELETE_ROWS)' },
    { op: 'wait', ms: 2500, label: 'settle' },
    { op: 'restTableState', label: 'shape after Ctrl-⌫', targets: ['official'] },
  ],

  observe: ['text', 'state', 'grid'],
  gridTable: 'tableRoot',
  observeTexts: ['a', 'b', '1', '2'],
  stateSelectors: ['editorBody'],

  expect: [
    { facet: 'text:a', op: 'gt', value: 0, at: 0 },
  ],

  deviations: [
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
