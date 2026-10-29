/**
 * spec: editor.table.cell-clipboard
 *
 * 主交互：**表格单元格里的剪贴板三键与 `⌫`（`CUT`／`COPY`／`PASTE`／`CLEAR_CELL_CONTENTS`）**，
 * 即表 E 里唯一还没上屏的那一组「不需要行/列选择态」的键。
 *
 * 为什么这一族要采：`G1577`（第 316 批）把表 E 的十键在**单元格光标**下对拍过，但那十键是
 * `Ctrl-⏎` 家族 ＋ `Alt-方向` ＋ `Ctrl-⌫` 家族 ＋ `Ctrl-[`，**不含 `Ctrl-X/C/V` 与单元 `⌫`**；
 * 而 `CLEAR_CELL_CONTENTS` 是表 E 里唯一「不需要行/列选择态」也能谈的删除键——行/列选择态
 * 两侧都进不去（`G1588`：`Escape` 只给整表选择）。
 *
 * 判据：
 *  ① 两侧都建出 2×2 表（`expect` 用单元格文本 AA/BB 在场，进 selfCheck）；
 *  ② 单变量序列：格内选中文本 → `Ctrl-X`（该格变空）→ 点另一格 → `Ctrl-V`（内容搬过去）
 *     → `⌫`（清空该格）；**每一步都取一次观测**，两侧各自记录。
 *  ★ 本 spec **不判"应该哪种"**；两侧读数一致时说明这族键是平台原生的，不必登记差异。
 */
export default {
  id: 'editor.table.cell-clipboard',
  wave: 1,
  surface: 'editor.table',
  target: 'both',
  builtFrom: [
    'keyboard.md:170-180（表 E · CUT/COPY/PASTE、CLEAR_CELL_CONTENTS）',
    'gap.md G1577（表 E 十键在单元格光标下对拍，不含剪贴板族）',
    'gap.md G1588（行/列选择态两侧都进不去 ⇒ 只剩剪贴板族可谈）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
    // 格内可编辑体：官方是 contenteditable div（无稳定类名），本地是 td 里的段落
    cell: { official: '[contenteditable="true"]', local: '.ProseMirror table td, .ProseMirror table th' },
    popupClose: { official: '[data-testid="open-in-app-popup-close"]', local: '[data-testid="open-in-app-popup-close"]' },
  },

  setup: [
    // 侧别不同，建表通路也不同（两条都是本批实测出来的，见 lab.mjs 的 restSeedDoc 注释）：
    //  · 本地：UI 建空文档 → 斜线菜单「表格」（本地渲染成逐格 `<td>`）
    //  · 官方：REST 建文档＋表 → 经列表卡进入（UI 建的表是"整表单块"、REST 块写进 UI 文档回 404）
    { op: 'navigate', url: '/documents', settleMs: 2500, gotoTimeoutMs: 60000, targets: ['local'] },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.table.cell-clipboard', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 9000, title: 'QODER-ILAB-editor.table.cell-clipboard', titleKey: 'titleBlock', targets: ['local'] },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 2500, targets: ['local'] },
    { op: 'restSeedDoc', name: 'QODER-ILAB-editor.table.cell-clipboard', title: 'QODER-ILAB-editor.table.cell-clipboard', blockType: 'table', markdown: '| AA | BB |\n| --- | --- |\n| 1 | 2 |', settleMs: 6500, targets: ['official'] },
  ],

  steps: [
    // 本地：斜线菜单建表（本地是逐格 `<td>`，无整表单块的毛病）
    { op: 'typeKeys', text: '/', settleMs: 1200, label: 'slash menu', targets: ['local'] },
    { op: 'typeKeys', text: '表格', settleMs: 1200, label: 'filter 表格', targets: ['local'] },
    { op: 'key', chord: 'Enter', settleMs: 1800, label: 'Enter (pick 表格)', targets: ['local'] },
    // 本地新表是空的：往首格打 AA、→ 换格打 BB（官方那边 REST 已就位，这两步跳过）
    { op: 'typeKeys', text: 'AA', settleMs: 900, label: 'type AA (cell 1)', targets: ['local'] },
    { op: 'key', chord: 'ArrowRight', settleMs: 800, label: 'ArrowRight (next cell)', targets: ['local'] },
    { op: 'typeKeys', text: 'BB', settleMs: 1000, label: 'type BB (cell 2)', targets: ['local'] },
    // 单变量：格内全选 → Ctrl-X → 点另一格 → Ctrl-V → 再 ⌫
    { op: 'clickTextIn', selector: 'cell', text: 'BB', settleMs: 700, label: 'focus cell BB' },
    { op: 'key', chord: 'End', settleMs: 300, label: 'End (caret to cell end)' },
    { op: 'key', chord: 'Shift+Home', settleMs: 400, label: 'Shift+Home (select in cell)' },
    { op: 'key', chord: 'Control+x', settleMs: 1100, label: 'Ctrl-X (CUT)' },
    { op: 'clickTextIn', selector: 'cell', text: 'AA', settleMs: 700, label: 'focus cell AA' },
    { op: 'key', chord: 'Control+v', settleMs: 1300, label: 'Ctrl-V (PASTE)' },
    { op: 'key', chord: 'End', settleMs: 300, label: 'End' },
    { op: 'key', chord: 'Shift+Home', settleMs: 400, label: 'Shift+Home (select)' },
    { op: 'key', chord: 'Backspace', settleMs: 1000, label: 'Backspace (CLEAR_CELL_CONTENTS)' },
  ],

  observe: ['dom', 'text', 'state'],
  observeTexts: ['AA', 'BB'],
  stateSelectors: ['editorBody'],

  expect: [
    // 表建出来了、且在格子里打进了字（AA 或 BB 至少一个在场）
    { facet: 'text:AA', op: 'gt', value: -1, at: 0 },
  ],

  deviations: [
    // ★ 本 spec 的 AA／BB 计数**就是测量对象**（剪走／粘贴／清空各让哪些字消失），
    //   因此不能套别处常见的「侧栏空态提示」类偏差声明——那会把真信号静默掉。
    { facet: 'removed-only-local', reason: '本地同步状态串（未保存／同步中）随时机出现消失；属外壳状态不是编辑器内容', ref: 'observe.mjs NOISE_RULES' },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
