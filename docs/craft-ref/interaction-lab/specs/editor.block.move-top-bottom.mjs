/**
 * spec: editor.block.move-top-bottom
 *
 * 主交互：`⌥↖` / `⌥↘`（Windows `Alt-Home` / `Alt-End`）打在**折叠光标**上的语义。
 * 官方依据：`keyboard.md` 表 B `MOVE_BLOCK_TOP = ⌥ ↖` / `MOVE_BLOCK_BOTTOM = ⌥ ↘`；
 * 官方面板「整理」段逐字印作 **`移动所选区块：… 移动到顶部 Alt⤒、移动到底部 Alt⤓`**（§十一）
 * —— 注意 `⤒`/`⤓` 是**到顶/到底**的箭头字形，§十二 把 `Alt-⤒` 对到 `Alt-↖` 是同一映射。
 * ★ 同一段还印着 `组合 CtrlG`／`取消组合 CtrlShiftG`，与表 B 的 `FIND_NEXT`/`FIND_PREVIOUS`
 *   **同键不同上下文** ⇒ 官方"一张扁平表"不成立，这一档尤其要按上下文实测。
 *
 * 本轮实测（`probe-w1b-4`，两侧同一序列：文档 A / B / C，光标在末块 C）：
 *
 *   | 动作 | 官方块序 | 本地块序 |
 *   | --- | --- | --- |
 *   | 起点 | A / B / C | A / B / C |
 *   | `Alt-Home` | **A / B / C（未动）** | **C / A / B**（C 被搬到顶部） |
 *   | `Alt-End` | **A / B / C（未动）** | **A / B / C**（C 被搬回底部） |
 *
 * ⇒ 官方在**折叠光标**上这两个键**不改块序**；本地直接改块序
 *   （`src/components/editor/extensions/craft-keymap.ts` 的 `MOVE_TARGETS`
 *   把 `MOVE_BLOCK_TOP/BOTTOM` 派到 `src/lib/editor/block-move.ts` 的 `buildBlockMove`）。
 *
 * 判据（官方行为）：**折叠光标上按 `⌥↖`/`⌥↘`，块序不变**；且键必须被编辑器吃掉
 * （`focusInEditor` 保持 true）。
 *
 * ★ 诚实边界：官方"不改块序"有两种可能——① 它真把光标移到文首/文末（面板写的"移动**所选**区块"
 *   在折叠光标上不成立）；② 该组合在 Windows 侧压根没派发。本轮**只证了"块序不变"**这一条
 *   （可复现、可核），"光标去哪了"未采 ⇒ 不在本 spec 的 expect 里下断言，只如实登记。
 */
export default {
  id: 'editor.block.move-top-bottom',
  wave: 1,
  surface: 'editor.block-move',
  target: 'both',
  builtFrom: ['keyboard.md 表 B MOVE_BLOCK_TOP/BOTTOM', 'keyboard.md §十一 面板「整理」段', 'keyboard.md §十二 同键不同上下文', 'probe-w1b-4（本轮实测）'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.move-top-bottom', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.move-top-bottom', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'AAA', settleMs: 400, label: 'typeKeys AAA' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (second block)' },
    { op: 'typeKeys', text: 'BBB', settleMs: 400, label: 'typeKeys BBB' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (third block)' },
    { op: 'typeKeys', text: 'CCC', settleMs: 500, label: 'typeKeys CCC (caret in last block)' },
    { op: 'key', chord: 'Alt+Home', settleMs: 950, label: 'Alt-Home (move to top)' },
    { op: 'key', chord: 'Alt+End', settleMs: 950, label: 'Alt-End (move to bottom)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['AAA', 'BBB', 'CCC'],
  stateSelectors: ['editorBody'],

  // ★ `at` 是 record 里的 step 下标，baseline 占 0。steps 有 7 条：
  //   1=AAA 2=Enter 3=BBB 4=Enter 5=CCC 6=Alt-Home 7=Alt-End
  expect: [
    { facet: 'blocks', op: 'equals', at: 5, value: ['AAA', 'BBB', 'CCC'] },
    // ★ 官方行为：折叠光标上 Alt-Home / Alt-End **不动块序**
    { facet: 'blocks', op: 'equals', at: 6, value: ['AAA', 'BBB', 'CCC'] },
    { facet: 'blocks', op: 'equals', at: 7, value: ['AAA', 'BBB', 'CCC'] },
    // 键必须被编辑器吃掉，光标不许被带出编辑器
    { facet: 'focusInEditor', op: 'equals', at: 6, value: true },
    { facet: 'focusInEditor', op: 'equals', at: 7, value: true },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};