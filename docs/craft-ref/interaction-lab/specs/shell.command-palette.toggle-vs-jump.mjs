/**
 * spec: shell.command-palette.toggle-vs-jump
 *
 * 主交互：⌘K / Ctrl-K 在外壳唤出的面板**是什么**。
 * 官方依据：`interactions.md` V1（面板标题「跳转到」）、V6（输入无匹配 ⇒ 面板不列命令行）、
 * V2（网页版 ⌘K 只做页面跳转）与 `ui-affordances.md` §四 的两条修正
 * （`command-palette-button` + `command-menu` 是**另一个**入口，⌘K 只绑「跳转到」）。
 *
 * 判据（**属性面**，不是文案）：
 *  - 面板的输入框 placeholder：官方「打开」，本地「搜索文档、内容…」；
 *  - 无匹配时是否出现「未找到结果」。
 *
 * ★ 已声明偏差（产品级，见 gap.md）：**本地 Ctrl-K 是真命令面板、官方 ⌘K 是"跳转到"**。
 *   官方 ⌘K 只跳转页面（placeholder「打开」，条目形如「在 zhang's Space 中 …」），
 *   另有 `command-palette-button` 入口；本地把两者合并成一个命令面板
 *   （`搜索文档与块` / `操作` / `新建文档` / `查看所有快捷键`）。
 *
 * 采到的逐字证据（2026-10-23，smoke-01 + probe-verbatim）：
 *  官方：active = `input[placeholder="打开"]`，无 `role=dialog`；输入无匹配 ⇒ 「未找到结果」计数 1。
 *  本地：active = `input[placeholder="搜索文档、内容…"] role=combobox`，
 *        `role=dialog` + `role=listbox`，条目「新建文档」「查看所有快捷键」，
 *        面板尾部「搜索文档与块」「Esc」「关闭」。
 *  官方条目文案「在zhang's Space中」（含空间名 ⇒ 走噪声清单）。
 *
 * 注意 V3/V7b/V29 的结论：Escape 关不关得掉**按弹层×屏而异**，所以本 spec 不把 Escape 当判据。
 */
export default {
  id: 'shell.command-palette.toggle-vs-jump',
  wave: 0,
  surface: 'shell.command-palette',
  target: 'both',
  builtFrom: ['interactions.md V1', 'interactions.md V6', 'interactions.md V2', 'ui-affordances.md §四'],

  selectors: {
    paletteInput: { official: 'input[placeholder="打开"]', local: 'input[placeholder="搜索文档、内容…"]' },
    searchButton: { official: '[data-testid="header-root"] button, [data-testid="sidebar-profile"]', local: 'button[aria-label="搜索"]' },
    editorBody: { official: '[data-testid="editor-body"]', local: '.ProseMirror' },
    titleBlock: { official: '[data-testid="editor-title"]', local: 'input[placeholder="页面标题"]' },
    blockRoot: { official: '[id^="blockrowwrap-"]', local: '.ProseMirror > *' },
  },

  setup: [
    { op: 'navigate', url: '/documents', settleMs: 2200 },
  ],

  steps: [
    { op: 'chord', chord: 'Control+k', settleMs: 1400, label: 'Ctrl-K (quick open)' },
    { op: 'type', text: '快捷键', settleMs: 1200, label: 'type 快捷键 (no match expected)' },
  ],

  observe: ['dom', 'text', 'state', 'selection', 'attrs'],
  observeTexts: ['未找到结果', '搜索文档与块', '操作'],
  stateSelectors: ['editorBody'],
  attrProbes: [{ key: 'paletteInput', selector: 'paletteInput', attrs: ['placeholder', 'role'] }],
  computedProbes: [{ key: 'editorBody', selector: 'editorBody' }],

  expect: [
    // 两侧**共同行为**：⌘K 后面板确实开了 —— 第 1 步起各自面板的输入框在场（属性面）。
    // placeholder 的**取值**不同（官方「打开」vs 本地「搜索文档、内容…」）⇒ 那是已声明偏差，另列。
    { facet: 'attr:paletteInput', op: 'exists', at: 1 },
    // 面板打开后**又输入了无匹配词** ⇒ 面板仍在（第 2 步输入框仍在场）
    { facet: 'attr:paletteInput', op: 'exists', at: 2 },
  ],

  /** 面板**是什么**是产品级差异，声明掉、不参与判定；两侧共同行为（面板开合）仍参与。 */
  deviations: [
    {
      facet: 'added-only-local',
      reason: '本地 Ctrl-K 是真命令面板（搜索文档与块/操作/新建文档/查看所有快捷键）；官方 ⌘K 是"跳转到"（条目形如「在<空间>中 …」），命令面板另有入口',
      ref: 'gap.md（本轮新登记）· ui-affordances.md §四',
    },
    {
      facet: 'added-only-official',
      reason: '官方 ⌘K 面板条目是「在<空间>中 <文档名>」形态；本地无此形态（本地条目是命令）',
      ref: 'gap.md（本轮新登记）· interactions.md V1',
    },
    {
      facet: 'attr:paletteInput',
      reason: 'placeholder 不同：官方「打开」（跳转语义）vs 本地「搜索文档、内容…」（搜索语义）',
      ref: 'probe-verbatim.json',
    },
    {
      facet: 'removed-only-official',
      reason: '官方 header 的「打开」标签在 ⌘K 后由 span 变成 input[placeholder="打开"]（同一件事换形态）⇒ 文本名册记为移除；本地无此 header 入口',
      ref: 'probe-takeover.json（官方 ⌘K 后 itemIds=13 仍在 ⇒ 不是整屏接管，是 header 浮层）',
    },
    {
      facet: 'countΔ:搜索文档与块',
      reason: '两侧面板条目集合不同 ⇒ 该具名文案只在本地有',
      ref: 'probe-verbatim.json',
    },
    {
      facet: 'countΔ:操作',
      reason: '本地面板有「操作」分组标题，官方跳转面板没有分组标题',
      ref: 'probe-verbatim.json',
    },
    {
      facet: 'countΔ:未找到结果',
      reason: '两侧**都**给无匹配提示，但文案不同：官方「未找到结果」vs 本地「未找到 <词> 的结果」',
      ref: 'probe-verbatim.json（官方计数 1 / 本地 0）· gap.md（本轮新登记）',
    },
  ],

  teardown: [{ op: 'key', chord: 'Escape', settleMs: 800 }],
};
