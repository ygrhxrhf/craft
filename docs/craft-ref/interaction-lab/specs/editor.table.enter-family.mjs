/**
 * spec: editor.table.enter-family
 *
 * 主交互：**表格单元格里的三个 `Enter` 变体**（表 E 的 `ADD_ROWS_*` / `ADD_COLUMNS_*` 四行塌成三键）：
 * `Ctrl-⏎`、`Ctrl-Shift-⏎`、`Ctrl-Alt-⏎`。
 *
 * 为什么这一族要采：`G1577`（第 316 批）记的是"三键都**加**行列"，只读了行列**数**、没读**位置**；
 * 而静态表 `G733` 明确说 `Ctrl-Shift-⏎` 在 Windows 上是**塌键**（`ADD_ROWS_BEFORE` 与
 * `ADD_COLUMNS_AFTER` 同串）。**位置**正好能把"到底派发到哪一条"钉死 ⇒ 本 spec 用 REST
 * 逐格读回，看新行/新列插在**哪里**。
 *
 * 判据：
 *  ① 起点 2×2 `[[a,b],[1,2]]`（REST 建，官方侧逐格 contenteditable）；
 *  ② 光标放在 `a` 列，逐个按键，每次读回**整张表**（不只是行列数）；
 *  ③ 官方：`Ctrl-Shift-⏎` 插入的新空列落在 `a` 与 `b` **之间**、`Ctrl-Alt-⏎` 落在 `a` **之前**、
 *     `Ctrl-⏎` 新行落在 `1` 行**之上**；
 *  ④ 本地：三键在单元格光标下**一格不变**（`G1577` 的同批复核）。
 */
export default {
  id: 'editor.table.enter-family',
  wave: 1,
  surface: 'editor.table',
  target: 'both',
  builtFrom: [
    'keyboard.md:170-180（表 E · ADD_ROWS_BEFORE/AFTER、ADD_COLUMNS_BEFORE/AFTER）',
    'gap.md G733（Windows 塌键：ADD_ROWS_BEFORE 与 ADD_COLUMNS_AFTER 同串）',
    'gap.md G1577（三键"加行列"的行列数读数，位置未读）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    // 表格容器：官方没有 <table>，取「含 contenteditable 的块」；本地就是 table
    tableRoot: { official: '[data-testid="editor-body"]', local: '.ProseMirror table' },
    cell: { official: '[contenteditable="true"]', local: '.ProseMirror table td, .ProseMirror table th' },
    popupClose: { official: '[data-testid="open-in-app-popup-close"]', local: '[data-testid="open-in-app-popup-close"]' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000, targets: ['local'] },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.table.enter-family', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.table.enter-family', titleKey: 'titleBlock', targets: ['local'] },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500, targets: ['local'] },
    // 官方：REST 建文档＋2×2 表（斜线菜单建的表在官方侧是"整表单块"，没有逐格对象）
    { op: 'restSeedDoc', name: 'QODER-ILAB-editor.table.enter-family', title: 'QODER-ILAB-editor.table.enter-family', blockType: 'table', markdown: '| a | b |\n| --- | --- |\n| 1 | 2 |', settleMs: 6500, targets: ['official'] },
  ],

  steps: [
    // 本地：斜线菜单建表并填 a/b（官方已由 REST 就位）
    { op: 'typeKeys', text: '/', settleMs: 1200, label: 'slash menu', targets: ['local'] },
    { op: 'typeKeys', text: '表格', settleMs: 1200, label: 'filter 表格', targets: ['local'] },
    { op: 'key', chord: 'Enter', settleMs: 1800, label: 'Enter (pick 表格)', targets: ['local'] },
    { op: 'typeKeys', text: 'a', settleMs: 600, label: 'type a', targets: ['local'] },
    { op: 'key', chord: 'ArrowRight', settleMs: 500, label: '→ (next cell)', targets: ['local'] },
    { op: 'typeKeys', text: 'b', settleMs: 800, label: 'type b', targets: ['local'] },
    // 三个变体：每次先回到 a 列
    { op: 'clickTextIn', selector: 'cell', text: 'a',  settleMs: 700, label: 'focus cell a' },
    { op: 'key', chord: 'Control+Shift+Enter', settleMs: 1300, label: 'Ctrl-Shift-⏎ (塌键)' },
    { op: 'wait', ms: 2500, label: 'wait for REST settle' },
    { op: 'restTableState', label: 'shape after Ctrl-Shift-⏎' },
    { op: 'clickTextIn', selector: 'cell', text: 'b',  settleMs: 700, label: 'focus cell b' },
    { op: 'key', chord: 'Control+Alt+Enter', settleMs: 1300, label: 'Ctrl-Alt-⏎' },
    { op: 'wait', ms: 2500, label: 'wait #2' },
    { op: 'restTableState', label: 'shape after Ctrl-Alt-⏎' },
    { op: 'clickTextIn', selector: 'cell', text: 'a',  settleMs: 700, label: 'focus cell a again' },
    { op: 'key', chord: 'Control+Enter', settleMs: 1300, label: 'Ctrl-⏎ (对照)' },
    { op: 'wait', ms: 2500, label: 'wait #3' },
    { op: 'restTableState', label: 'shape after Ctrl-⏎' },
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
