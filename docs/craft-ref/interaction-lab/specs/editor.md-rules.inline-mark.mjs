/**
 * spec: editor.md-rules.inline-mark
 *
 * 主交互：**Markdown 行内标记规则** —— 在块内逐字输入六条行内“记号串”，看**行内标记**是否随之生成：
 * `**X**`（粗体）／`*X*`（斜体）／`~~X~~`（删除线）／`` `X` ``（行内代码）／`==X==`（高亮）／`[T](url)`（链接）。
 *
 * 为什么这一族要采（静态账里**根本没有**这一面）：
 *  - `gap.md` **G866**／**G963** 只盘点了**块级**档位（`# `／`- `／`[ ] ` 那一族）；
 *    行内标记（粗体/斜体/删除线/代码/链接）**从未上屏验过**，静态账里既没记官方有、也没记没有。
 *  - 本地侧**明确有**：`src/components/editor/extensions/markdown-shortcuts.ts:13/34/55` 三条 `InputRule`
 *    （`~~`→删除线、`==`→高亮、`[]()`→链接），另加 StarterKit 自带的 `**`／`*`／`` ` `` 三条。
 *
 * ★ 判据难点（本批为此新增加性档 `inline`，并在同批修了一次仪器缺陷）：
 *   行内标记**不改块名册、不改具名文本计数**（`**X**` 与 `X` 在块名册里都只是“有文字”）
 *   ⇒ 现有 `blocks`／`text`／`kinds` 各档**都读不出**“到底转换了没有”。
 *   ☆ 仪器缺陷（已修，如实登记）：`inline` 档**第一版**只数 `strong/em/del/mark/code/a` 标签，
 *     而官方是 Slate 扁平渲染、**没有这些标签** ⇒ 把官方**全部**读成“没反应”。
 *     实测官方载体（probe-w1be／w1bf／w1bg）：粗体 leaf `fw=700`｜斜体 `font-style:italic`｜
 *     删除线 `text-decoration:line-through`｜高亮 leaf 背景非透明｜行内代码 leaf `spellcheck="false"`｜
 *     链接 leaf `text-decoration="underline"`。修法：两侧各按自己的载体读，**归一到同一枚举 `marks`** 再比。
 *
 * ★★ 关键事实（probe-w1bc，本批新探）：官方**行内记号必须后跟一个空格才转换**。
 *   `**X**` 原样不转（leaf 全部 fw=400），`**X** ` 才转（fw=700）。
 *   ⇒ 本 spec 每一条记号后都显式补一个 `Space`。
 *     （第一版没补 ⇒ 官方全读成“没反应”、本地全读成“转了”，差异被仪器缺陷**夸大**了）。
 *
 * ★ 步骤编排：每条之间 `Enter` → `Ctrl+Shift+Backquote`（NO_LIST 复位），与 `editor.md-rules.block-kind` 同一写法。
 */
export default {
  id: 'editor.md-rules.inline-mark',
  wave: 1,
  surface: 'editor.md-rules',
  target: 'both',
  builtFrom: [
    'gap.md G866（块级档位表；行内面当时未采）',
    'gap.md G963（uF 表 trigger 只有 4 个：空格 12／- 4／= 1／反引号 1）',
    'src/components/editor/extensions/markdown-shortcuts.ts:13/34/55（本地 ~~／==／[]() 三条 InputRule）',
    'node_modules/@tiptap/starter-kit（本地另带 **／*／反引号 三条默认规则）',
    'probe-w1bc（官方：记号后跟空格才转换）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-md-inline-mark', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-md-inline-mark', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: "**X**", settleMs: 600, label: 'md "**X**" (bold)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (trigger) - bold' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: "*Y*", settleMs: 600, label: 'md "*Y*" (italic)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (trigger) - italic' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: "~~Z~~", settleMs: 600, label: 'md "~~Z~~" (strike)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (trigger) - strike' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: "==W==", settleMs: 600, label: 'md "==W==" (highlight)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (trigger) - highlight' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: "`C`", settleMs: 600, label: 'md "`C`" (code)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (trigger) - code' },
    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: "[T](https://a.com)", settleMs: 600, label: 'md "[T](https://a.com)" (link)' },
    { op: 'key', chord: 'Space', settleMs: 900, label: 'Space (trigger) - link' },
  ],

  observe: ['dom', 'text', 'blocks', 'inline'],
  observeTexts: ['**X**', '*Y*', '~~Z~~', '==W=='],
  stateSelectors: ['editorBody'],

  expect: [
    // 两侧共有的**共同**事实：记号本身被消费掉（不再原样在正文里）。
    //   ★ 这一条与上一版相反（上一版断“原样在”），因为上一版**没补空格**、根本没触发规则。
    { facet: 'text:**X**', op: 'count', at: 2, value: 0 },
    { facet: 'text:*Y*', op: 'count', at: 6, value: 0 },
    { facet: 'text:~~Z~~', op: 'count', at: 10, value: 0 },
    { facet: 'text:==W==', op: 'count', at: 14, value: 0 },
  ],

  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};
