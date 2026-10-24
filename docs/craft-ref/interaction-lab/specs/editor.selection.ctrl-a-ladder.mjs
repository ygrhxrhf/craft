/**
 * spec: editor.selection.ctrl-a-ladder
 *
 * 主交互：`⌘A`／`Ctrl-A`（`SELECT_ALL`，`keyboard.md` 表 B）连按的**阶梯**语义 ——
 * 第一次选什么、第二次选什么、有没有第三档。
 * 官方依据：`keyboard.md` 表 B `SELECT_ALL = ⌘ A`；官方面板「文档」段逐字 `全选 CtrlA`（§十一）。
 *
 * ★ 为什么这是 Wave 1 该采的：`interactions.md` 开篇自陈
 *   「**动态行为面（触发→效果→反馈→可逆性）尚未验证**」；
 *   `ui-affordances.md` 又记着官方有 `data-selection-box`（块选区框）这一档 DOM 锚点
 *   ⇒ "全选"在官方到底是"选文本"还是"选块"、是不是**两档阶梯**，只能实测。
 *
 * 本轮实测（`probe-w1j`，两侧同一序列：文档 AAA / BBB / CCC，光标在末块 CCC 内）：
 *
 *   | 动作 | 官方 | 本地 |
 *   | --- | --- | --- |
 *   | `Ctrl-A` #1 | 选中**当前块文本**（`selText="CCC"`，`collapsed=false`，光标仍在编辑器内） | 选中**整篇文本**（`selText="AAA\\n\\nBBB\\n\\nCCC"`，`collapsed=false`，光标仍在编辑器内） |
 *   | `Ctrl-A` #2 | 进入**块选区**态（`activeElement=body`、`class` 含 `block-select`、`collapsed=true`、`focusInEditor=false`） | **原地不动**（仍是整篇文本选区，`focusInEditor=true`） |
 *   | `Ctrl-A` #3 | 停在块选区态 | 停在整篇文本选区 |
 *
 * ⇒ 官方是**两档阶梯**（文本 → 块选区），本地是**一档**（只有整篇文本选区）。
 *
 * 判据（两侧共同应有）：`Ctrl-A` 必须**留在编辑器内**、且**至少选中了东西**。
 * 官方第二档的"块选区"本地没有 ⇒ 本 spec 应判 `differ`（`selection:*` 与 `focusInEditor` 两处）。
 *
 * ★ 与 `Ctrl-Shift-↑/↓`（选至顶部/底部）的分工：那条另有 spec；本 spec 只测 `Ctrl-A` 自己的阶梯。
 */
export default {
  id: 'editor.selection.ctrl-a-ladder',
  wave: 1,
  surface: 'editor.selection',
  target: 'both',
  builtFrom: ['keyboard.md 表 B SELECT_ALL', 'keyboard.md §十一 面板「文档」段 全选 CtrlA', 'ui-affordances.md data-selection-box', 'probe-w1j（本轮实测）'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.selection.ctrl-a-ladder', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.selection.ctrl-a-ladder', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'AAA', settleMs: 400, label: 'typeKeys AAA' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (second block)' },
    { op: 'typeKeys', text: 'BBB', settleMs: 400, label: 'typeKeys BBB' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (third block)' },
    { op: 'typeKeys', text: 'CCC', settleMs: 500, label: 'typeKeys CCC (caret in last block)' },
    { op: 'key', chord: 'Control+a', settleMs: 950, label: 'Ctrl-A #1' },
    { op: 'key', chord: 'Control+a', settleMs: 950, label: 'Ctrl-A #2' },
    { op: 'key', chord: 'Control+a', settleMs: 950, label: 'Ctrl-A #3' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['AAA', 'BBB', 'CCC'],
  stateSelectors: ['editorBody'],

  // ★ `at` 是 record 里的 step 下标，baseline 占 0。steps 有 8 条：
  //   1=AAA 2=Enter 3=BBB 4=Enter 5=CCC 6=Ctrl-A#1 7=Ctrl-A#2 8=Ctrl-A#3
  //
  // ★★ selfCheck 的边界（本批自我更正）：selfCheck 是**每侧对"自己的观测"**求值，
  //    所以这里**只放两侧共同应有**的量。阶梯差异（官方第二档进块选区 / 本地只有一档）
  //    是**产品级差异**，由 differ 的 `focusInEditor` 与 `selection:*` 行报出、并登记 G 行
  //    —— 写进 selfCheck 只会让另一侧假红，把"两侧共有行为"和"差异"两件事混在一起。
  expect: [
    // 起手：三块都在
    { facet: 'blocks', op: 'equals', at: 5, value: ['AAA', 'BBB', 'CCC'] },
    // 第一档（两侧一致）：选中当前块文本、不是折叠态
    { facet: 'selection:collapsed', op: 'equals', at: 6, value: false },
    // 第一档（两侧一致）：全选不许把光标带出编辑器
    { facet: 'focusInEditor', op: 'equals', at: 6, value: true },
    // 全选全程不动块序
    { facet: 'blocks', op: 'equals', at: 8, value: ['AAA', 'BBB', 'CCC'] },
  ],

  /**
   * ★ 为什么这里**没有** `deviations`（本批自我更正）：
   *   阶梯差异是"官方有块选区态、本地没有"——两侧落到**两个不同状态**，它会改变**下一个键**的语义
   *   （官方块选区上 `⌥↑` 才是"移动所选区块"；本地没有这个态）⇒ 产品级差异，不是画法差异。
   *   按 Wave 1 先例（G1545/G1546/G1547）如实判 `differ` 并登记 G 行，**不**抹成 severity 0。
   *   `deviations` 只留给"同一件事的两种画法"（例：项目符号 官方文本节点 `•` / 本地 CSS list-style）。
   */

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};