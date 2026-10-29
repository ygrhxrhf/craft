/**
 * spec: editor.table.add-content-key
 *
 * 主交互：表 E 的最后一枚 `ADD_CONTENT`（Windows `Ctrl-[`）。
 *
 * 为什么还要单独采：覆盖率普查把它归进"需行/列选择态"那一簇，但 `G1577` 当时是在**单元格光标**
 * 下按的、读数 `dRows=0 dCols=0`——两者给的"为什么没采到"并不一致。本 spec 用**一个已知会改变
 * 表格的起点**（先 `Ctrl-⏎` 加一行、REST 读回行数确实 +1）来证明"光标确实在格子里、键确实送得到"，
 * 然后再按 `Ctrl-[`。★ 这是阴性对照思路：没有正对照，"没反应"可能只是"键没送到"。
 *
 * 判据：
 *  ① 正对照：`Ctrl-⏎` 让 REST 行数 +1（证键送得到）；
 *  ② 目标键：`Ctrl-[` 后 REST 形状**不变**——若如此，结论是"键有效但在此光标下无作用"，
 *     而不是"需选择态"（因为同一光标的另一枚键刚刚生效过）。
 */
export default {
  id: 'editor.table.add-content-key',
  wave: 1,
  surface: 'editor.table',
  target: 'both',
  builtFrom: [
    'keyboard.md 表 E · ADD_CONTENT（Ctrl-[）',
    'gap.md G1577（单元格光标下十键里七键 0 反应，含 Ctrl-[）',
    'gap.md G1611（表格上限 15×50，超限给内联提示）',
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
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.table.add-content-key', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.table.add-content-key', titleKey: 'titleBlock', targets: ['local'] },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500, targets: ['local'] },
    // 官方：REST 建文档＋2×2 表（逐格 contenteditable 只有这条路能拿到）
    { op: 'restSeedDoc', name: 'QODER-ILAB-editor.table.add-content-key', title: 'QODER-ILAB-editor.table.add-content-key', blockType: 'table', markdown: '| a | b |\n| --- | --- |\n| 1 | 2 |', settleMs: 6500, targets: ['official'] },
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
    { op: 'restTableState', label: 'shape before', targets: ['official'] },
    // 正对照：Ctrl-⏎ 应让行数 +1（证键送得到）
    { op: 'key', chord: 'Control+Enter', settleMs: 1400, label: 'Ctrl-⏎ (positive control)' },
    { op: 'wait', ms: 2500, label: 'wait for REST settle' },
    { op: 'restTableState', label: 'shape after Ctrl-⏎', targets: ['official'] },
    // 目标键：Ctrl-[
    { op: 'clickTextIn', selector: 'cell', text: 'a', settleMs: 800, label: 'refocus cell a' },
    { op: 'key', chord: 'Control+BracketLeft', settleMs: 1400, label: 'Ctrl-[ (ADD_CONTENT)' },
    { op: 'wait', ms: 2500, label: 'wait #2' },
    { op: 'restTableState', label: 'shape after Ctrl-[', targets: ['official'] },
  ],

  observe: ['dom', 'text', 'state', 'grid'],
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
