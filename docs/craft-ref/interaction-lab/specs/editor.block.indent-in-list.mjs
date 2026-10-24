/**
 * spec: editor.block.indent-in-list
 *
 * 主交互：`Tab` / `Shift-Tab` 的缩进语义。
 * 官方依据：`keyboard.md` 表 B `INDENT = ⇥` / `DEINDENT = ⇧⇥`；**G218**＝缩进载体是块上的
 * CSS 变量 `--indent-w`、一级 28px、回 0 档时该属性整体不输出。
 *
 * ★ 触发面（2026-10-23，probe-indent / probe-tabfocus 实测）：
 *   `Tab` 在**普通段落**上**毫无反应**（块 id 不变、无 `--indent-w`、无 DOM 变化）；
 *   在**列表项**上才生效，官方载体是 `<div class="_indent_1oz2o_33" style="--indent-w: 28px">`
 *   —— 一个与块行**同层并列**的包裹/标记元素（不在 `blockrowwrap-*` 的祖先链上）。
 *   本 spec 走**列表**这条真生效的通路。
 *
 * 判据（两侧共同行为）：
 *  - `Tab` ⇒ 该块缩进 +1 级；`Tab`×2 ⇒ +2 级；`Shift-Tab` ⇒ 回 -1 级；
 *  - 缩进过程中**光标留在编辑器内**（`focusInEditor`）。
 *
 * ★ 为什么把焦点单列一条判据（Wave 1 仪器补强）：
 *   键"没反应"与"键被浏览器接管"在块名册上**长得一样**（DOM 不变）。
 *   实测（probe-tabfocus · 本地）：`Tab`#2 后 `activeElement` 从 `.ProseMirror` 变成
 *   `nextjs-portal`、再变 `body`、再变一枚按钮 —— 光标被 Tab 带出了编辑器；
 *   而官方 `Tab`#2 仍在编辑器内、缩进继续涨到 56px。
 *   ⇒ 只比块名册会漏掉这一类差异，故加焦点面。
 *
 * 级数由各自的载体表达：官方读 `--indent-w`（28/56px），本地读**列表嵌套档**
 * （`ul`/`ol` 层数，最外层不计）。`indentLevel` 探针把两者归一到"级"，再两侧比级数。
 */
export default {
  id: 'editor.block.indent-in-list',
  wave: 1,
  surface: 'editor.block-indent',
  target: 'both',
  builtFrom: ['keyboard.md 表 B INDENT/DEINDENT', 'gap.md G218', 'probe-indent / probe-tabfocus（本轮实测）'],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.block.indent-in-list', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.block.indent-in-list', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    // `- ` + 文本 ⇒ 项目符号列表项（官方 markdown 输入规则；本地 markdown-shortcuts 同规则）
    // ★ 必须用**真按键**（`typeKeys`）：`insertText` 不触发 markdown 输入规则，
    //   官方侧实测会留下裸 `-` 而不成列表（probe-type 定案）。
    { op: 'typeKeys', text: '- ', settleMs: 900, label: 'typeKeys "- " (bullet)' },
    { op: 'typeKeys', text: 'L1', settleMs: 600, label: 'typeKeys L1' },
    { op: 'key', chord: 'Enter', settleMs: 700, label: 'Enter (second item)' },
    { op: 'typeKeys', text: 'L2', settleMs: 700, label: 'typeKeys L2' },
    { op: 'key', chord: 'Tab', settleMs: 900, label: 'Tab (indent +1)' },
    { op: 'key', chord: 'Tab', settleMs: 900, label: 'Tab (indent +2)' },
    { op: 'key', chord: 'Shift+Tab', settleMs: 900, label: 'Shift-Tab (indent -1)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'indent'],
  observeTexts: ['L1', 'L2'],
  stateSelectors: ['editorBody'],
  computedProbes: [{ key: 'editorBody', selector: 'editorBody' }],

  // ★ `at` 是 record 里的 step 下标，baseline 占 0。steps 有 7 条：
  //   1="- " 2=L1 3=Enter 4=L2 5=Tab 6=Tab 7=Shift-Tab
  expect: [
    { facet: 'blocksCount', op: 'count', at: 4, value: 2 },
    { facet: 'indentLevel', op: 'count', at: 4, value: 0 },
    { facet: 'indentLevel', op: 'count', at: 5, value: 1 },
    { facet: 'indentLevel', op: 'count', at: 6, value: 2 },
    { facet: 'indentLevel', op: 'count', at: 7, value: 1 },
    // 焦点：缩进全程光标必须留在编辑器内（见文件头"为什么把焦点单列一条判据"）
    { facet: 'focusInEditor', op: 'equals', at: 5, value: true },
    { facet: 'focusInEditor', op: 'equals', at: 6, value: true },
    { facet: 'focusInEditor', op: 'equals', at: 7, value: true },
  ],

  /**
   * 已声明偏差（**呈现机制**，不是行为）：项目符号的画法两侧不同。
   *   官方：`•` 是一个**文本节点**（实测 `childTexts: ["•","L1"]`）⇒ 它进 `innerText`、
   *         也进文本名册、还占块内字符偏移（空列表项里光标 offset=1 而不是 0）。
   *   本地：`<li>` 用 CSS `list-style: disc`（实测 `listStyleType: "disc"` / `listPosition: outside`）
   *         ⇒ 不进 `innerText`、不占偏移。
   *   **两侧屏上都有圆点**（probe-bullet 逐项取证），所以这是 chrome 不是内容。
   *   探针侧已在两处抹平（`captureBlocks` 剥行首圆点；`NOISE_RULES` 丢掉纯圆点条目），
   *   只剩"空列表项里的光标偏移"这一处会漏出来，在此声明。
   */
  deviations: [
    {
      facet: 'selection:anchorOffset',
      reason: '项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 空列表项里光标 offset 天然差 1',
      ref: 'probe-bullet（本轮实测：官方 childTexts ["•","L1"]；本地 listStyleType:disc）',
    },
    {
      facet: 'selection:focusOffset',
      reason: '同上（focusOffset 与 anchorOffset 同源）',
      ref: 'probe-bullet',
    },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};