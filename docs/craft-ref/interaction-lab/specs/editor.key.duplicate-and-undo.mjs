/**
 * spec: editor.key.duplicate-and-undo
 *
 * 主交互：`⌘D`／`Ctrl-D` 创建副本，以及 `⌘Z`／`⌘⇧Z`（Windows `Ctrl-Z`／`Ctrl-Shift-Z`）
 * 对"创建副本"这一步的**撤销粒度**（一步撤回原状？还是只撤回一部分？）。
 * 官方依据：`keyboard.md` 表 B `DUPLICATE = ⌘ D`／`UNDO = ⌘ Z`／`REDO = ⌘ ⇧ Z`；
 * 官方面板「编辑」段逐字：`创建副本 CtrlD`、`撤销 CtrlZ`、`重做 CtrlShiftZ`（`keyboard.md` §十一）。
 *
 * ★ 为什么单开一条：`interactions.md` 开篇自陈「**动态行为面（触发→效果→反馈→可逆性）尚未验证**」
 *   ——"可逆性"正是本条要测的东西。撤销粒度是可观察行为（块序回到哪一档），不是实现细节。
 *
 * 本轮实测（`probe-w1b-4`，两侧同一序列，文档为 A / B / C 三块，光标在 C）：
 *
 *   | 动作 | 官方块序 | 本地块序 |
 *   | --- | --- | --- |
 *   | 起点 | A / B / C | A / B / C |
 *   | `Ctrl-D` | A / B / C / **C**（副本紧跟原块） | A / B / C / **C** |
 *   | `Ctrl-Z` | A / B / C（一步撤回原状） | A / B / C |
 *   | `Ctrl-Shift-Z` | A / B / C / **C** | A / B / C / **C** |
 *
 * ⇒ 创建副本与撤销/重做粒度**两侧一致**。
 *
 * ★ 两侧**不同**的是焦点与选区：官方在 `Ctrl-D` 后把 `activeElement` 变成 `body`
 *   （`class="noshift nodrag block-select nocmd"` ⇒ 进入了**块选区**态，
 *   `selection.present=false` ⇒ collapsed/offset 三个字段都读成 null），
 *   本地留在 `.ProseMirror` 内、仍是折叠文本光标（`inEditor: true`）。
 *
 *   ★ **不声明成 `deviations`**：`deviations` 的用途是"同一件事的两种画法"
 *   （例：项目符号——官方文本节点 `•` / 本地 CSS `list-style: disc`，两侧屏上都有圆点）。
 *   而这里两侧落到的是**两个不同状态**，它直接改变**下一个键**的语义
 *   ⇒ 那是产品级差异，按本仓 Wave 1 先例（G1545/G1546/G1547）如实判 `differ` 并登记 G 行。
 *   差异只落在"落到哪种选区"这一个面上；**主判据（块序与撤销/重做粒度）两侧一致**。
 */
export default {
  id: 'editor.key.duplicate-and-undo',
  wave: 1,
  surface: 'editor.block-duplicate',
  target: 'both',
  builtFrom: ['keyboard.md 表 B DUPLICATE/UNDO/REDO', 'keyboard.md §十一 面板「编辑」段', 'interactions.md 开篇「可逆性尚未验证」', 'probe-w1b-4（本轮实测）'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.duplicate-and-undo', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.duplicate-and-undo', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'A', settleMs: 400, label: 'typeKeys A' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (second block)' },
    { op: 'typeKeys', text: 'B', settleMs: 400, label: 'typeKeys B' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (third block)' },
    { op: 'typeKeys', text: 'C', settleMs: 500, label: 'typeKeys C (caret stays in C)' },
    { op: 'key', chord: 'Control+d', settleMs: 950, label: 'Ctrl-D duplicate' },
    { op: 'key', chord: 'Control+z', settleMs: 950, label: 'Ctrl-Z undo the duplicate' },
    { op: 'key', chord: 'Control+Shift+z', settleMs: 950, label: 'Ctrl-Shift-Z redo' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['A', 'B', 'C'],
  stateSelectors: ['editorBody'],

  // ★ `at` 是 record 里的 step 下标，baseline 占 0。steps 有 8 条：
  //   1=A 2=Enter 3=B 4=Enter 5=C 6=Ctrl-D 7=Ctrl-Z 8=Ctrl-Shift-Z
  expect: [
    { facet: 'blocks', op: 'equals', at: 5, value: ['A', 'B', 'C'] },
    // 创建副本：紧跟原块（官方实测 A/B/C/C）
    { facet: 'blocks', op: 'equals', at: 6, value: ['A', 'B', 'C', 'C'] },
    // 撤销一步回到原状 ⇒ 证明"创建副本"是一步可逆操作
    { facet: 'blocks', op: 'equals', at: 7, value: ['A', 'B', 'C'] },
    // 重做把副本还回来
    { facet: 'blocks', op: 'equals', at: 8, value: ['A', 'B', 'C', 'C'] },
  ],

  /**
   * ★ 为什么不把 Ctrl-D 之后的"选区态差异"声明成 `deviations`（本批自我更正）：
   *   `deviations` 的用途是**同一件事的两种画法**（例：项目符号——官方文本节点 `•` / 本地 CSS
   *   `list-style: disc`，两侧屏上都有圆点）。而这里官方与本地落到的**是两个不同的状态**
   *   （官方=块选区态、本地=文本折叠光标），它会直接改变**下一个键**的语义
   *   ⇒ 那是产品级差异，不是画法差异。按本仓 Wave 1 的先例（G1545/G1546/G1547）
   *   如实判 `differ` 并登记成 G 行，**不**用 deviations 把它抹成 severity 0。
   *
   * 本 spec 的**主判据**（创建副本 / 撤销粒度 / 重做）两侧一致，见上面四条 expect；
   * 差异只落在"落到哪种选区"这一个面上（differ 的 selection:* 与 focusInEditor 行）。
   */

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};