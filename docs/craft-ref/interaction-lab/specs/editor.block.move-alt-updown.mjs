/**
 * spec: editor.block.move-alt-updown
 *
 * 主交互：`⌥↑` / `⌥↓`（Windows `Alt-↑` / `Alt-↓`）打在**折叠光标**上的语义。
 * 官方依据：`keyboard.md` 表 B `MOVE_BLOCK_UP = ⌥ ↑` / `MOVE_BLOCK_DOWN = ⌥ ↓`；
 * 官方面板「整理」段逐字印作 **`移动所选区块：向上 Alt↑`**（`keyboard.md` §十一）。
 * 而 §分派机制 又记着 `⌥↑`（`y2(Ts)`）带选项 `{skipDirection:"prev", shouldSkipFromEdgeOfBlock:!0}`
 * ⇒ **块首按上会跳到上一块末尾、块尾按下会跳到下一块开头**。
 *
 * ★ 这两条官方记录说的是**两件不同的事**（"移动所选区块" vs "跨块移光标"），
 *   而同一个物理键只能落到一个 handler ⇒ 本 spec 就是去测**真实分派落到了哪一件**。
 *
 * 本轮实测（`probe-w1i`，官方 · 光标在中间块 BBB 的块首，三块 AAA/BBB/CCC）：
 *
 *   | 动作 | 块序 | 光标所在块 |
 *   | --- | --- | --- |
 *   | 起点 | AAA / BBB / CCC | 1（BBB） |
 *   | `Alt+↑` | **AAA / BBB / CCC（一字未动）** | **0（跳到上一块）** |
 *
 * ⇒ **官方 `⌥↑` 不动块序，动的是光标**（"跨块移光标"那一条才是真分派；
 *   "移动所选区块"要**先有块选区**才生效，折叠光标上不是它）。
 *
 * 本地实测（`probe-w1b-4` · 同一序列）：`Alt+↑` ⇒ 块序变成 `A / C / B`，
 * 即 `src/lib/editor/block-move.ts` 的 `buildBlockMove` 直接**换了块顺序**
 * （`src/components/editor/extensions/craft-keymap.ts` 的 `MOVE_TARGETS` 分派）。
 *
 * 判据（官方行为）：**折叠光标上按 `⌥↑`/`⌥↓`，块序不变**。
 * 本地会换块序 ⇒ 本 spec 应判 `differ`。
 *
 * 与 G279 的分工：G279 说的是"**移动单位**是含缩进子块的整块"（有选区时移动谁）；
 * 本 spec 说的是"**折叠光标上这个键到底移不移块**"—— 两件事，不重复。
 */
export default {
  id: 'editor.block.move-alt-updown',
  wave: 1,
  surface: 'editor.block-move',
  target: 'both',
  builtFrom: ['keyboard.md 表 B MOVE_BLOCK_UP/DOWN', 'keyboard.md §分派机制 y2(Ts) skipFromEdgeOfBlock', 'keyboard.md §十一 面板「整理」段', 'probe-w1i / probe-w1b-4（本轮实测）'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.move-alt-updown', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.move-alt-updown', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: 'AAA', settleMs: 500, label: 'typeKeys AAA' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'Enter (second block)' },
    { op: 'typeKeys', text: 'BBB', settleMs: 500, label: 'typeKeys BBB' },
    { op: 'key', chord: 'Enter', settleMs: 500, label: 'Enter (third block)' },
    { op: 'typeKeys', text: 'CCC', settleMs: 500, label: 'typeKeys CCC' },
    // 把光标放到**中间块 BBB 的块首**：Up 到 BBB 那一行，Home 到行首。
    // 起手条件必须两侧一致，否则"块首/块中"会让 skipFromEdgeOfBlock 走不同分支。
    { op: 'key', chord: 'ArrowUp', settleMs: 400, label: 'ArrowUp (to BBB line)' },
    { op: 'key', chord: 'Home', settleMs: 500, label: 'Home (BBB block start)' },
    { op: 'key', chord: 'Alt+ArrowUp', settleMs: 950, label: 'Alt-Up on collapsed caret' },
    { op: 'key', chord: 'Alt+ArrowDown', settleMs: 950, label: 'Alt-Down on collapsed caret' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['AAA', 'BBB', 'CCC'],
  stateSelectors: ['editorBody'],

  // ★ `at` 是 record 里的 step 下标，baseline 占 0。steps 有 9 条：
  //   1=AAA 2=Enter 3=BBB 4=Enter 5=CCC 6=Up 7=Home 8=Alt-Up 9=Alt-Down
  expect: [
    // 起手：三块都在、光标在块首（两侧同条件）
    { facet: 'blocksCount', op: 'count', at: 7, value: 3 },
    { facet: 'blocks', op: 'equals', at: 7, value: ['AAA', 'BBB', 'CCC'] },
    // ★ 官方行为：折叠光标上 Alt-Up **不动块序**（它把光标移到上一块）
    { facet: 'blocks', op: 'equals', at: 8, value: ['AAA', 'BBB', 'CCC'] },
    // Alt-Down 同理：不动块序
    { facet: 'blocks', op: 'equals', at: 9, value: ['AAA', 'BBB', 'CCC'] },
    // 键必须被编辑器吃掉，光标不许被带出编辑器
    { facet: 'focusInEditor', op: 'equals', at: 8, value: true },
    { facet: 'focusInEditor', op: 'equals', at: 9, value: true },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};