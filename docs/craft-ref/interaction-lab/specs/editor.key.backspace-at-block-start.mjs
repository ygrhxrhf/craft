/**
 * spec: editor.key.backspace-at-block-start
 *
 * 主交互：**光标在块首按 Backspace 的四档分派**。
 *
 * 为什么这一族要采（Wave 1 最后一个未采的块级核心面）：
 *  - `keyboard.md:285` 静态记着官方是**四档**：合并 −386 / 退缩进 −62 / 删空前块 −1,989 / 首块 0；
 *  - 本地 `src/lib/editor/keymap.ts:93` 只是把 `Backspace: '⌫'` 放进快捷键**标签表**，
 *    编辑器里**没有任何显式处理** ⇒ 全靠 ProseMirror 默认 `joinBackward`/`liftListItem`。
 *    ⇒ 两侧分派是不是同一套，此前从未上屏对过。
 *
 * 判据（分四段，每段用自己的 `at` 钉住）：
 *  ① 合并：`AAA` / `BBB` 两块、光标在 BBB 块首按 Backspace ⇒ 并成一块 `AAABBB`；
 *  ② 首块无前块：单块、光标在块首按 Backspace ⇒ 块名册**一字不变**（不是"合并到上一块"）；
 *  ③ 删空前块：空块 + `AAABBB`、光标在后者块首按 Backspace ⇒ 空块被删、剩一块。
 *  ★ 第四档「退缩进」**本 spec 不采**：本地缩进本身就是缺口（G1545／G1546，普通段落进不去、
 *    列表项只能进一级），把退档混进来会把两个已登记的原因搅在一起 ⇒ 只采前三档，退档另起。
 *
 * 步骤编排：每段之间用 `Home` 把光标送回块首（两侧同为 Slate/TipTap 标准键）。
 * 空块的构造用「块首 Enter」——两侧都应在光标前插一枚空块。
 */
export default {
  id: 'editor.key.backspace-at-block-start',
  wave: 1,
  surface: 'editor.block-backspace',
  target: 'both',
  builtFrom: [
    'keyboard.md:285（官方四档分派：合并 −386 / 退缩进 −62 / 删空前块 −1,989 / 首块 0）',
    'src/lib/editor/keymap.ts:93（本地只有标签，无显式处理 ⇒ 走 ProseMirror 默认）',
    'interactions.md §一 R1（Enter 的块级语义：块首 Enter 前插空块）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.backspace-at-block-start', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.backspace-at-block-start', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'type', text: 'AAA', settleMs: 700, label: 'type AAA' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter (new block BBB)' },
    { op: 'type', text: 'BBB', settleMs: 800, label: 'type BBB' },

    { op: 'key', chord: 'Home', settleMs: 400, label: 'Home (block start of BBB)' },
    { op: 'key', chord: 'Backspace', settleMs: 1000, label: '① Backspace at BBB start (merge)' },

    { op: 'key', chord: 'Home', settleMs: 400, label: 'Home (block start)' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter at block start (empty block above)' },
    { op: 'key', chord: 'Backspace', settleMs: 1000, label: '③ Backspace with empty block before' },

    { op: 'key', chord: 'Backspace', settleMs: 800, label: '② Backspace on the only (first) block' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks'],
  observeTexts: ['AAA', 'BBB', 'AAABBB'],
  stateSelectors: ['editorBody'],

  expect: [
    // 基线：光标在空块
    { facet: 'blocksCount', op: 'count', value: 1, at: 0 },
    // 造好两块
    { facet: 'blocks', op: 'equals', value: ['AAA', 'BBB'], at: 3 },
    // ① 合并成一块
    { facet: 'blocks', op: 'equals', value: ['AAABBB'], at: 5 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 5 },
    // ③ 空块 + AAABBB ⇒ 空块被删
    { facet: 'blocks', op: 'equals', value: ['AAABBB'], at: 8 },
    // ② 首块再按一次：名册一字不变
    { facet: 'blocks', op: 'equals', value: ['AAABBB'], at: 9 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 9 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
