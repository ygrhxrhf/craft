/**
 * spec: editor.md-rules.block-kind
 *
 * 主交互：**Markdown 输入规则（块类型档）** —— 在空正文块里逐字输入 `# ` / `#### ` / `- ` / `[ ] ` / `1. `
 * 这五条"档位串"，看**块类型**是否随之切换。
 *
 * 为什么这一族要采（静态账已有，但从未上屏）：
 *  - `gap.md` **G866**（盘上批）记官方 `uF` 表 18 条、本地 `markdown-shortcuts.ts` 只有 6 条
 *    ⇒ 四条缺失 ＋ **一条语义相反**（官方 `#### ` → `at.Strong` 强调档，本地 `#### ` → h4 四级标题）。
 *  - 静态读的是 bundle；本 spec 是**同一条在屏幕上验一遍**，并把可核判据落成矩阵行。
 *
 * ★ 判据难点（本批为此新增加性档 `kinds`）：
 *   官方块行的 tag **恒为 `span`**（Slate 扁平渲染）⇒ 只看 tag 会把官方**所有** markdown 转换读成"没反应"
 *   （实测 `probe-w1an`：`# ` 之后官方仍 `span`，只有字号从 15px/400 变 23px/700）。
 *   两侧的类型信号位置不同：官方在**后代/计算样式**上，本地在**标签**上
 *   ⇒ `kinds` 档把两者归一到同一枚举（para/title/subtitle/heading/heading4/strong/bullet/numbered/task）。
 *   ☆ 与既有 `indent` 档同一先例（两侧载体不同、先归一再比）。
 *
 * ★ 步骤编排（本批踩坑后的写法）：
 *   列表/任务块会**延续**（Enter 造出的仍是同型块）⇒ 每档之间必须显式复位：
 *   `Enter`（造新块）→ `Ctrl+Shift+Digit5`（BODY 档＝回正文）⇒ 下一档才落在**干净正文块**上。
 *   ☆ 反面记录＝首版用"两下 Ctrl+A + Delete"当复位，实测会把文档清到 **0 块**，
 *   此后打字**一律不触发** markdown 规则（连 `# ` 都不换档）⇒ 该复位法作废（`probe-w1ar`）。
 *
 * ★ 诚实边界：官方**折叠块**（`+ `）在 DOM 上**无独有信号**（实测 `probe-w1aq`：`+ ` 组的
 *   `data-*` 名册与普通段落**逐字相同**，既无 task 锚点也无 `aria-expanded`）⇒ 本档**不采** `+ `，
 *   不把"读不出"写成"两侧一致"。
 */
export default {
  id: 'editor.md-rules.block-kind',
  wave: 1,
  surface: 'editor.md-rules',
  target: 'both',
  builtFrom: [
    'gap.md G866（uF 表 18 条 vs 本地 6 条；#### 官方 Strong／本地 h4）',
    'gap.md G963（trigger 只有 4 个：空格 12／- 4／= 1／反引号 1）',
    'gap.md G961（官方标题块 allowBlockStyling=!1 ⇒ 标题块永不做 markdown 快捷输入）',
    'src/components/editor/extensions/markdown-shortcuts.ts:7 起（本地 6 条 InputRule）',
  ],

  selectors: {
    newButton: { official: '[data-testid="new-document-button"]', local: 'button[aria-label="新建文档"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 1500 },
    { op: 'seedTempDoc', name: 'QODER-ILAB-md-block-kind', listPath: '/documents', selectorKey: 'newButton', afterCreateMs: 3500, title: 'QODER-ILAB-md-block-kind', titleKey: 'titleBlock' },
    { op: 'placeCaretTrailing', host: 'editorBody', title: 'titleBlock', settleMs: 800 },
  ],

  steps: [
    { op: 'typeKeys', text: '# ', settleMs: 700, label: 'md "# " (title)' },
    { op: 'typeKeys', text: 'AAA', settleMs: 700, label: 'text AAA' },

    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: '#### ', settleMs: 700, label: 'md "#### " (official Strong / local h4)' },
    { op: 'typeKeys', text: 'BBB', settleMs: 700, label: 'text BBB' },

    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: '- ', settleMs: 700, label: 'md "- " (bullet)' },
    { op: 'typeKeys', text: 'CCC', settleMs: 700, label: 'text CCC' },

    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: '1. ', settleMs: 700, label: 'md "1. " (numbered)' },
    { op: 'typeKeys', text: 'EEE', settleMs: 700, label: 'text EEE' },

    { op: 'key', chord: 'Enter', settleMs: 400, label: 'Enter (new block)' },
    { op: 'key', chord: 'Control+Shift+Backquote', settleMs: 500, label: 'NO_LIST (reset)' },
    { op: 'typeKeys', text: '[ ] ', settleMs: 700, label: 'md "[ ] " (task)' },
    { op: 'typeKeys', text: 'DDD', settleMs: 700, label: 'text DDD' },

  ],

  observe: ['dom', 'text', 'blocks', 'kinds'],
  observeTexts: ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'],
  stateSelectors: ['editorBody'],

  expect: [
    // 两侧共有：五段文本都进了正文（"是否换档"交给 differ，见 spec 头注释）
    { facet: 'text:AAA', op: 'count', at: 2, value: 1 },
    { facet: 'text:BBB', op: 'count', at: 6, value: 1 },
    { facet: 'text:CCC', op: 'count', at: 10, value: 1 },
    { facet: 'text:EEE', op: 'count', at: 14, value: 1 },
    { facet: 'text:DDD', op: 'count', at: 18, value: 1 },
  ],

  // ★ 已声明偏差（severity 0）：这几类是**两侧实现的系统性画法差异**，不是本 spec 要问的"规则是否换档"。
  //   每条都给了出处，可回查；`blocks`／`kinds` **不在此列**（那两档里含真差异，照实报）。
  deviations: [
    {
      prefix: 'countΔ:',
      reason: '官方把块换成标题/列表档后，**侧栏大纲**里出现该块 ⇒ 具名文本计数多 1；本地侧栏无该行。已在 G1556 内用 probe-w1aj／w1ak 定位（x=16 y=216、A._row_v0ra3_1 > SPAN._label_v0ra3_131）⇒ 不是"多建块"'
      ,ref: 'gap.md G1556（侧栏大纲行定位）'
    },
    {
      facet: 'added-only-local',
      reason: '本地 TipTap 任务块的 checkbox 可及名（`Task item checkbox for <text>／empty task item`）用 visuallyHiddenStyle 画，文本**仍进 innerText**；官方任务块无此串。★ 第 304 批已把 a11y 面单独采成账（`gap.md` **G1563**：官方任务项在 AX 树里**没有 checkbox**，本地有且用合成英文串）⇒ 本行仍只降为 severity 0（它不是本 spec 的主判据），但**差异本身已有独立 G 承载**'
      ,ref: 'node_modules/@tiptap/extension-list/src/task-item/task-item.ts:83-85（getCheckboxLabel 默认串）；gap.md G1563'
    },
    {
      facet: 'added-only-official',
      reason: '官方列表序号（`1.`／`2.`）会出现在正文文本流之外，本地列表序号由 CSS counter 画、不进 innerText。☆ 侧栏大纲行原本也在这里表现为 `AAA#1`／`…#3` 这样的**重复文本**条目，第 303 批把名册的重复计数后缀去掉后（重复与否另有 `countΔ:` 精算），该类条目不再单列 —— 大纲行的证据改由上面的 `countΔ:AAA` 一族承载'
      ,ref: 'gap.md G1556 · G866（官方序号画进文本节点）'
    },
    {
      facet: 'removed-only-official',
      reason: '官方基线里带一枚目录空态提示「使用标题、页面或卡片创建目录。」，本批临时文档本地侧未渲染该提示（本地该串是纯核常量 TOC_PLACEHOLDER）⇒ 与本 spec 主判据无关'
      ,ref: 'src/lib/editor/official-copy.ts:8（TOC_PLACEHOLDER 逐字）'
    },
  ],
  teardown: [{ op: 'softDeleteTempDoc' }, { op: 'restoreCaret' }],
};