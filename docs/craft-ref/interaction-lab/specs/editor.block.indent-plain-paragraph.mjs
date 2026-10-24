/**
 * spec: editor.block.indent-plain-paragraph
 *
 * 主交互：`Tab` / `Shift-Tab` 打在**普通段落**（非列表）上的缩进语义。
 * 官方依据：`keyboard.md` 表 B `INDENT = ⇥` / `DEINDENT = ⇧⇥`；**G218**＝缩进载体是块上的
 * CSS 变量 `--indent-w`、一级 28px、回 0 档时该属性整体不输出。
 *
 * ★ 为什么单开一条（Wave 1 实测推翻了"普通段落上 Tab 无反应"这条旧判）：
 *   `probe-indent` 早先读"普通段落上 Tab 毫无反应"是**探针缺陷**（那时缩进探针沿祖先链
 *   找 `--indent-w`，而官方载体与块行**同层并列** ⇒ 恒读 0）。修好探针后实测：
 *   **官方在普通段落上照样缩进**，一级 28px、可连续到 3 级（`probe-plain-tab2`：
 *   BBB 的 level 0 → 1 → 2 → 3，`--indent-w` 28/56/84px，光标全程留在编辑器内），
 *   而**本地 Tab 直接把焦点带出编辑器**（`probe-plain-tab`：activeElement 从
 *   `.ProseMirror` → `nextjs-portal` → `body` → 一枚按钮，正文一字不动）。
 *
 * 判据（两侧共同行为）：
 *  - `Tab` ⇒ 该块缩进 +1 级；`Tab`×2 ⇒ +2 级；`Shift-Tab` ⇒ 回 -1 级；
 *  - 缩进过程中**光标留在编辑器内**（`focusInEditor`）。
 *  这两条在官方都成立；本地两条都不成立 ⇒ 本 spec 应判 `differ`。
 *
 * 与 `editor.block.indent-in-list` 的分工：那条走**列表**通路（本地至少一级能生效），
 * 这条走**普通段落**通路（本地一级都不生效、且丢焦点）—— 两条合起来才把缩进面钉全。
 */
export default {
  id: 'editor.block.indent-plain-paragraph',
  wave: 1,
  surface: 'editor.block-indent',
  target: 'both',
  builtFrom: ['keyboard.md 表 B INDENT/DEINDENT', 'gap.md G218', 'probe-plain-tab / probe-plain-tab2（本轮实测）'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.indent-plain-paragraph', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.indent-plain-paragraph', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    // 两段普通段落：AAA / BBB。**不用 markdown 标记**（`- ` 会成列表，那是另一条 spec 的通路）。
    // `type`（insertText）与真按键在普通文本上等价；这里用 `typeKeys` 与同族 spec 保持一致。
    { op: 'typeKeys', text: 'AAA', settleMs: 600, label: 'typeKeys AAA' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter (second paragraph)' },
    { op: 'typeKeys', text: 'BBB', settleMs: 700, label: 'typeKeys BBB' },
    { op: 'key', chord: 'Tab', settleMs: 900, label: 'Tab on plain paragraph (indent +1)' },
    { op: 'key', chord: 'Tab', settleMs: 900, label: 'Tab (indent +2)' },
    { op: 'key', chord: 'Shift+Tab', settleMs: 900, label: 'Shift-Tab (indent -1)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'indent'],
  observeTexts: ['AAA', 'BBB'],
  stateSelectors: ['editorBody'],
  computedProbes: [{ key: 'editorBody', selector: 'editorBody' }],

  // ★ `at` 是 record 里的 step 下标，baseline 占 0。steps 有 6 条：
  //   1=AAA 2=Enter 3=BBB 4=Tab 5=Tab 6=Shift-Tab
  expect: [
    { facet: 'blocksCount', op: 'count', at: 3, value: 2 },
    { facet: 'indentLevel', op: 'count', at: 3, value: 0 },
    // 官方：普通段落上 Tab 一样缩进（实测 0→1→2→1）
    { facet: 'indentLevel', op: 'count', at: 4, value: 1 },
    { facet: 'indentLevel', op: 'count', at: 5, value: 2 },
    { facet: 'indentLevel', op: 'count', at: 6, value: 1 },
    // 焦点：缩进全程光标必须留在编辑器内
    { facet: 'focusInEditor', op: 'equals', at: 4, value: true },
    { facet: 'focusInEditor', op: 'equals', at: 5, value: true },
    { facet: 'focusInEditor', op: 'equals', at: 6, value: true },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};