/**
 * spec: editor.key.backspace-in-list
 *
 * 主交互：**光标在列表项块首按 Backspace** —— 官方 `Dsn` 六段链的第 ① 段是「去列表」，
 * 它在「合并」之前触发（`gap.md` G578／G579）。上一 spec 只覆盖了段落之间的三段。
 *
 * 为什么必须单独采：
 *  - 静态账 `G578` 逐字写着 Backspace offset 0 的优先级链是
 *    **守卫 → ① 去列表 `ir` → ② 减缩进 `og(-1)` → ③ 清装饰与颜色 → …**；
 *  - 而 `keyboard.md:285` 屏上只量到「四档」（合并／退档／删空前块／首块）——两者是
 *    **代码面 6 段 vs 屏面 4 档**，本 spec 补的就是屏面上没量到的那一段。
 *
 * 判据：
 *  - `kinds`（两侧归一到同一枚举）在 Backspace 这一步由 `bullet` 变 `para`；
 *  - `blocks` 文本**一字不变**（去列表不是删字）；
 *  - 块数不变（不是合并）。
 *
 * ★ 步骤用 `typeKeys`（真按键）而不是 `type`：`- ` 是 markdown 输入规则，只有真按键的
 *   input 事件才会触发（`editor.md-rules.block-kind` 同一写法）。
 */
export default {
  id: 'editor.key.backspace-in-list',
  wave: 1,
  surface: 'editor.block-backspace',
  target: 'both',
  builtFrom: [
    'gap.md G578（官方 Dsn 六段优先级链：守卫 → 去列表 → 减缩进 → 清装饰…）',
    'gap.md G579（Enter 链与 Backspace 链的先后互相矛盾）',
    'keyboard.md:285（屏上只量到四档，去列表这一段从未上屏）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-editor.key.backspace-in-list', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-editor.key.backspace-in-list', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    // `- ` 触发列表输入规则，再跟正文
    { op: 'typeKeys', text: '- ', settleMs: 900, label: 'md "- " (bullet list)' },
    { op: 'typeKeys', text: 'AAA', settleMs: 800, label: 'type AAA into list item' },
    { op: 'key', chord: 'Home', settleMs: 400, label: 'Home (item start)' },

    { op: 'key', chord: 'Backspace', settleMs: 1000, label: '① Backspace at list item start (de-list)' },

    // 再按一次：此时已不是列表，等价于上一 spec 的「首块」档 ⇒ 应无变化
    { op: 'key', chord: 'Backspace', settleMs: 800, label: '② Backspace again (already a paragraph)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'blocks', 'kinds'],
  observeTexts: ['AAA'],
  stateSelectors: ['editorBody'],

  expect: [
    // 基线：空块，不是列表
    { facet: 'kinds', op: 'equals', value: ['para'], at: 0 },
    // `- ` 之后成为列表项
    { facet: 'kinds', op: 'contains', value: 'bullet', at: 1 },
    // 打完字仍是列表项
    { facet: 'kinds', op: 'contains', value: 'bullet', at: 3 },
    // ① 去列表：类型变了、文本与块数不变
    { facet: 'kinds', op: 'equals', value: ['para'], at: 4 },
    { facet: 'blocks', op: 'equals', value: ['AAA'], at: 4 },
    { facet: 'blocksCount', op: 'count', value: 1, at: 4 },
    // ② 已是段落且在首块 ⇒ 一字不变
    { facet: 'blocks', op: 'equals', value: ['AAA'], at: 5 },
    { facet: 'kinds', op: 'equals', value: ['para'], at: 5 },
  ],

  // 项目符号是**画法差异**不是行为差异：官方把圆点画成文本节点（进名册、占块内偏移 1），
  // 本地用 CSS `list-style: disc`（不进、不占）。两侧屏上都有圆点（probe-bullet 实测），
  // 下一个键的语义也不因此改变 ⇒ 按 README「呈现机制差异 vs 产品级差异」的判据降为 severity 0。
  // 与 `editor.block.indent-in-list` 用同一先例、同一理由。
  deviations: [
    {
      facet: 'selection:anchorOffset',
      reason: '项目符号画法不同（官方文本节点 `•` 占块内偏移 1 / 本地 CSS list-style 不占）⇒ 光标 offset 天然差 1',
      ref: 'probe-bullet；同 editor.block.indent-in-list 的同一声明',
    },
    {
      facet: 'selection:focusOffset',
      reason: '同上（focusOffset 与 anchorOffset 同源）',
      ref: 'probe-bullet',
    },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
